"""Shared utilities for hub Cycles bakes (assets 2.9 + 2.10).

Two-pass pipeline per glb:

1. Build geometry from scratch (calls the corresponding hub script).
2. For each named mesh:
   - Add a second UV layer ``"UVMap_lightmap"`` via Smart UV Project.
   - Attach a fresh image node to a temporary bake material.
   - Bake (AO or Diffuse-Combined) into that image at 512².
   - Save the image as PNG into ``public/textures/hall/baked/<kind>/<mesh>.png``.
3. Re-export the glb with the now-present uv2 attribute via
   ``common.export.export_glb`` — the React side then has a uv channel to
   attach ``aoMap`` / ``lightMap`` to.

Why uv2 separate from uv1: uv1 carries the *tileable* texture coordinates
that the brass / floor PBR maps repeat across (e.g. ``repeat = (4, 4)`` on
the floor slab). Lightmaps must be a *single* contiguous unwrap with no
overlaps and no repeat — they're a per-mesh address book of "this point
got X lux of bounce light". They can't share the tileable channel.

Run any bake script via Blender headless::

    /Applications/Blender.app/Contents/MacOS/Blender -b \\
        -P blender/scripts/bake/hub-ao.py
"""

from __future__ import annotations

import math
import sys
from pathlib import Path
from typing import Callable, Iterable

import bpy  # type: ignore[import-not-found]

_SCRIPTS_DIR = Path(__file__).resolve().parent.parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

# Re-export the project root finder so callers can resolve absolute paths.
from common.export import _repo_root  # type: ignore[attr-defined]  # noqa: E402

LIGHTMAP_UV_NAME = "UVMap_lightmap"


def reset_scene() -> None:
    """Wipe everything to a clean slate. Same convention as build scripts."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def setup_cycles(samples: int = 128, ao_distance: float = 1.5) -> None:
    """Configure Cycles for headless baking.

    CPU device for determinism — Metal compute on macOS sometimes hangs in
    headless Blender. 128 samples is fine for low-frequency AO / diffuse
    irradiance at 512².
    """
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.05
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
    scene.cycles.ao_bounces = 1
    scene.cycles.ao_bounces_render = 1

    # Factory-empty scenes have no World — create one so AO + light setup
    # has somewhere to set strength / colour.
    if scene.world is None:
        scene.world = bpy.data.worlds.new("BakeWorld")
    if hasattr(scene.world, "cycles"):
        scene.world.cycles.sampling_method = "AUTOMATIC"


def unwrap_uv2(obj: bpy.types.Object, angle_limit_deg: float = 66.0) -> None:
    """Add a second UV layer named ``LIGHTMAP_UV_NAME`` via Smart UV Project.

    Idempotent — if the layer already exists, it's removed and re-projected.
    The active UV is set back to the first layer afterwards so material
    texture sampling continues to use the tileable channel.
    """
    mesh = obj.data
    if LIGHTMAP_UV_NAME in mesh.uv_layers:
        mesh.uv_layers.remove(mesh.uv_layers[LIGHTMAP_UV_NAME])

    if not mesh.uv_layers:
        mesh.uv_layers.new(name="UVMap")
    primary_name = mesh.uv_layers[0].name

    lightmap_layer = mesh.uv_layers.new(name=LIGHTMAP_UV_NAME)
    mesh.uv_layers.active = lightmap_layer

    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(
        angle_limit=math.radians(angle_limit_deg),
        island_margin=0.02,
        area_weight=0.0,
        correct_aspect=True,
        scale_to_bounds=True,
    )
    bpy.ops.object.mode_set(mode="OBJECT")
    mesh.uv_layers[primary_name].active_render = True


def make_bake_material(name: str, image: bpy.types.Image) -> bpy.types.Material:
    """A bake-only material with a single Image Texture node selected+active
    so Cycles bakes into the image. The shader output is intentionally just
    Principled BSDF so direct/diffuse bakes have something coherent to write."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)

    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (0, 0)
    bsdf.inputs["Base Color"].default_value = (0.8, 0.8, 0.8, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.6

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (300, 0)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.location = (-400, -200)
    tex.image = image
    tex.select = True
    nt.nodes.active = tex

    uv = nt.nodes.new("ShaderNodeUVMap")
    uv.uv_map = LIGHTMAP_UV_NAME
    uv.location = (-700, -200)
    nt.links.new(uv.outputs["UV"], tex.inputs["Vector"])

    return mat


def assign_material(obj: bpy.types.Object, mat: bpy.types.Material) -> None:
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def make_image(name: str, resolution: int, alpha: bool = False) -> bpy.types.Image:
    """Fresh non-color image for baking. Removed first if already present."""
    if name in bpy.data.images:
        bpy.data.images.remove(bpy.data.images[name])
    img = bpy.data.images.new(
        name=name,
        width=resolution,
        height=resolution,
        alpha=alpha,
        float_buffer=False,
        is_data=True,  # treated as data so no sRGB gamma applied on save
    )
    return img


def bake_object(
    obj: bpy.types.Object,
    bake_type: str,
    *,
    margin: int = 4,
    use_pass_direct: bool = True,
    use_pass_indirect: bool = True,
    use_pass_diffuse: bool = True,
) -> None:
    """Bake the *active object* in the current scene.

    ``bake_type`` is one of {``AO``, ``DIFFUSE``, ``COMBINED``, …}. For
    ``DIFFUSE`` you typically want indirect+direct+colour passes off so the
    bake is *just* the irradiance — but for our use we want the colour mixed
    in so the lightmap reads as a "pre-shaded" image multiplied onto the
    runtime PBR material.
    """
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)

    settings = bpy.context.scene.render.bake
    settings.margin = margin
    settings.use_clear = True

    bake_kwargs: dict = {"type": bake_type, "margin": margin, "use_clear": True}
    if bake_type == "DIFFUSE":
        bake_kwargs.update(
            pass_filter={"DIRECT", "INDIRECT", "COLOR"}
            if use_pass_diffuse
            else {"INDIRECT"}
        )

    bpy.ops.object.bake(**bake_kwargs)


def save_image(image: bpy.types.Image, output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.filepath_raw = str(output_path)
    image.file_format = "PNG"
    image.save()
    return output_path


def baked_texture_dir(kind: str) -> Path:
    """Resolve ``blender/exports/baked/<kind>/`` from any cwd.

    PNGs are intermediate build artefacts, not user-served assets — they
    live under ``blender/exports/`` (gitignored). The compression step
    (``compress-to-ktx2.sh``) writes the final ``.ktx2`` files into
    ``public/textures/hall/baked/<kind>/``.
    """
    out = _repo_root() / "blender" / "exports" / "baked" / kind
    out.mkdir(parents=True, exist_ok=True)
    return out


def export_hub_glb_with_uv2(
    objects: Iterable[bpy.types.Object],
    output_path: str,
    public_name: str | None = None,
) -> tuple[Path, Path]:
    """Export selected objects to glb (uv2 included), then stage to public/.

    Mirrors ``common.export.export_glb`` defaults but ensures all UV layers
    are exported — Blender's glTF exporter writes every UV layer on the
    mesh by default, so as long as the lightmap UV layer is present on the
    mesh, the resulting glb will carry it.
    """
    from common.export import export_glb, stage_to_public  # noqa: E402

    bpy.ops.object.select_all(action="DESELECT")
    objs = list(objects)
    for o in objs:
        o.select_set(True)
    if objs:
        bpy.context.view_layer.objects.active = objs[0]

    export_path = export_glb(output_path, selection_only=True)
    staged = stage_to_public(str(export_path))
    return export_path, staged


def build_scene_via(builder_module: str, builder_fn: str) -> list[bpy.types.Object]:
    """Import ``hub.<module>`` and call ``builder_fn()``. Returns built objs."""
    import importlib

    mod = importlib.import_module(f"hub.{builder_module}")
    result = getattr(mod, builder_fn)()
    if isinstance(result, tuple):
        return list(result)
    return [result]


HUB_PIECES: list[tuple[str, str, str, list[str]]] = [
    # (glb_stem, builder_module, builder_fn, [mesh_names])
    ("hub-floor", "floor", "build_floor", ["hub-floor-slab", "hub-floor-inlay"]),
    (
        "hub-column",
        "columns",
        "build_column",
        ["hub-column-base", "hub-column-shaft", "hub-column-capital"],
    ),
    ("hub-dome", "dome", "build_dome", ["hub-dome-shell", "hub-dome-lattice"]),
    ("hub-wall", "walls", "build_wall", ["hub-wall-slab", "hub-wall-frame"]),
    (
        "hub-skylight",
        "skylight",
        "build_skylight",
        ["hub-skylight-ring", "hub-skylight-disc"],
    ),
    (
        "hub-planter",
        "planter",
        "build_planter",
        ["hub-planter-base", "hub-planter-rim"],
    ),
    (
        "hub-outer-wall",
        "outer_wall",
        "build_outer_wall",
        ["hub-outer-wall-slab", "hub-outer-wall-frame"],
    ),
]


def run_bake_pipeline(
    kind: str,
    bake_type: str,
    *,
    resolution: int = 512,
    samples: int = 128,
    setup_world: Callable[[], None] | None = None,
) -> list[tuple[str, Path, Path]]:
    """Bake every hub mesh into ``public/textures/hall/baked/<kind>/`` and
    re-export the corresponding glb (now with uv2). Returns a list of
    ``(mesh_name, png_path, glb_path)`` tuples.
    """
    out_dir = baked_texture_dir(kind)
    results: list[tuple[str, Path, Path]] = []

    for glb_stem, module, builder, mesh_names in HUB_PIECES:
        reset_scene()
        setup_cycles(samples=samples)
        if setup_world is not None:
            setup_world()

        built = build_scene_via(module, builder)
        named = {o.name: o for o in built if o.name in mesh_names}
        # Some builders return all objs; some return only the named ones.
        # Fall back to a global lookup if any are missing.
        for name in mesh_names:
            if name not in named:
                obj = bpy.data.objects.get(name)
                if obj is not None:
                    named[name] = obj

        # Apply modifiers so bevels / wireframes are real geometry.
        for obj in named.values():
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.select_all(action="DESELECT")
            obj.select_set(True)
            for mod in list(obj.modifiers):
                try:
                    bpy.ops.object.modifier_apply(modifier=mod.name)
                except RuntimeError:
                    pass

        # Per-mesh unwrap + bake.
        for name in mesh_names:
            obj = named.get(name)
            if obj is None:
                print(f"  ⚠ missing mesh '{name}' — skipping")
                continue
            unwrap_uv2(obj)
            img = make_image(f"{name}-{kind}", resolution)
            mat = make_bake_material(f"{name}-bake-mat", img)
            assign_material(obj, mat)
            bake_object(obj, bake_type)
            png_path = save_image(img, out_dir / f"{name}.png")
            print(f"  baked {name} → {png_path.relative_to(_repo_root())}")
            # Free the image data block now that it's on disk.
            results.append((name, png_path, Path("")))

        # Re-export the glb with uv2 attribute baked in.
        glb_path, staged = export_hub_glb_with_uv2(
            list(named.values()),
            f"blender/exports/{glb_stem}.glb",
        )
        print(f"  re-exported {glb_stem}.glb → {staged.relative_to(_repo_root())}")
        # Backfill glb path on each result.
        for i, (n, p, _) in enumerate(results[-len(mesh_names) :]):
            results[-len(mesh_names) + i] = (n, p, staged)

    return results
