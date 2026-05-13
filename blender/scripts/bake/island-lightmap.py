"""Island lightmap bake — archipelago Phase 2 follow-up.

Bakes a 1024² combined diffuse-irradiance map for the hub island. Unlike
the cathedral lightmap (which used a 3-light interior rig), the island
sits in open sky: world is lit by the runtime daylight HDRI plus a warm
sun for crisp top-side shadows. The bake captures both into the lightmap,
giving the runtime ``MeshStandardMaterial`` a pre-shaded base layered on
top of the dark-rock albedo + AO.

Output: ``public/textures/hall/baked/lightmap/island-hub.png``
glb side: re-exported with uv2 (already present from the AO bake; running
the lightmap pipeline does not regress the file).

Run headless::

    /Applications/Blender.app/Contents/MacOS/Blender -b \\
        -P blender/scripts/bake/island-lightmap.py
"""

from __future__ import annotations

import importlib.util
import math
import sys
from pathlib import Path

import bpy  # type: ignore[import-not-found]
import mathutils  # type: ignore[import-not-found]

_SCRIPTS_DIR = Path(__file__).resolve().parent.parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from bake._common import (  # noqa: E402
    assign_material,
    bake_object,
    baked_texture_dir,
    export_hub_glb_with_uv2,
    make_bake_material,
    make_image,
    reset_scene,
    save_image,
    setup_cycles,
    unwrap_uv2,
)
from common.export import _repo_root  # noqa: E402


ISLAND_NAME = "island-hub"
RESOLUTION = 1024
SAMPLES = 256


def _load_island_builder():
    path = _repo_root() / "blender" / "scripts" / "islands" / "island-hub.py"
    spec = importlib.util.spec_from_file_location("islands.island_hub", str(path))
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def setup_island_world() -> None:
    """World = procedural sky tint matching the daylight HDRI used at runtime
    (cool zenith → warmer horizon). Adds one warm sun from above for top-side
    crisp shading. Spire underside gets only sky bounce, which reads as a
    cool fall-off in the bake — the desired "cathedral-on-rock" silhouette
    where the underside is darker than the rim.
    """
    scene = bpy.context.scene

    # Procedural sky world via Sky Texture (matches Drakensberg-daylight HDRI
    # at runtime: cool blue zenith, warm magenta horizon). Cycles' built-in
    # Nishita sky model is the simplest reproducible "daylight" world.
    world = scene.world
    world.use_nodes = True
    nt = world.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    sky = nt.nodes.new("ShaderNodeTexSky")
    sky.sky_type = "HOSEK_WILKIE"
    sky.sun_direction = (0.4, 0.3, 0.85)  # cooler high sun
    sky.turbidity = 4.0
    sky.ground_albedo = 0.18
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = 0.55
    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(sky.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])

    # Warm directional key from above — sharper than the world bounce, gives
    # the platter rim a defined highlight.
    bpy.ops.object.light_add(type="SUN", location=(0, 0, 30))
    sun = bpy.context.object
    sun.name = "island-key"
    sun.data.energy = 2.4
    sun.data.color = (1.0, 0.94, 0.82)  # warm amber
    sun.data.angle = math.radians(2.0)
    # Aim slightly off-vertical so the spire underside reads in fall-off.
    d = mathutils.Vector((0.25, 0.18, -1.0)).normalized()
    default = mathutils.Vector((0, 0, -1))
    sun.rotation_mode = "QUATERNION"
    sun.rotation_quaternion = default.rotation_difference(d)


def main() -> None:
    reset_scene()
    setup_cycles(samples=SAMPLES)
    setup_island_world()

    builder = _load_island_builder()
    island = builder.build_island_hub()

    # Apply all modifiers so the unwrap + bake sees the displaced surface.
    bpy.context.view_layer.objects.active = island
    bpy.ops.object.select_all(action="DESELECT")
    island.select_set(True)
    for mod in list(island.modifiers):
        try:
            bpy.ops.object.modifier_apply(modifier=mod.name)
        except RuntimeError:
            pass

    unwrap_uv2(island)

    img = make_image(f"{ISLAND_NAME}-lightmap", RESOLUTION)
    mat = make_bake_material(f"{ISLAND_NAME}-bake-mat", img)
    assign_material(island, mat)
    bake_object(island, "DIFFUSE")

    out_dir = baked_texture_dir("lightmap")
    png_path = save_image(img, out_dir / f"{ISLAND_NAME}.png")
    print(f"  baked {ISLAND_NAME} lightmap → {png_path.relative_to(_repo_root())}")

    glb_path, staged = export_hub_glb_with_uv2(
        [island],
        f"blender/exports/{ISLAND_NAME}.glb",
    )
    print(f"  re-exported {ISLAND_NAME}.glb → {staged.relative_to(_repo_root())}")
    print(f"  glb size: {staged.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
