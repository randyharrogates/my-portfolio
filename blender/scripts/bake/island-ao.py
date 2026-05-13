"""Island AO bake — archipelago Phase 2 follow-up.

Bakes a 1024² ambient-occlusion map for the hub island and re-exports
``island-hub.glb`` with a second UV layer (``UVMap_lightmap``) so the
React side can mount the AO map via three.js' ``aoMap`` slot.

Pipeline mirrors ``hub-ao.py``:
  1. Build the island (calls ``islands.island_hub.build_island_hub``).
  2. Apply Subsurf/Displace/Decimate so the unwrap sees the real
     post-displace geometry, not the smooth base cone+cylinder.
  3. Smart UV Project a second UV channel.
  4. Cycles AO bake at 1024² (island silhouette is larger than any hub
     piece — 512² makes the crevice shadows read mushy).
  5. Save PNG, re-export glb with uv2 baked in.

Run headless::

    /Applications/Blender.app/Contents/MacOS/Blender -b \\
        -P blender/scripts/bake/island-ao.py

Expect ~60-120 s on Apple Silicon CPU. Follow with::

    blender/scripts/bake/compress-to-ktx2.sh

to produce the ``.ktx2`` shipped to ``public/textures/hall/baked/ao/``.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import bpy  # type: ignore[import-not-found]

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
SAMPLES = 128


def _load_island_builder():
    """Import the dash-named ``island-hub.py`` module via spec_from_file_location."""
    path = _scripts_dir() / "islands" / "island-hub.py"
    spec = importlib.util.spec_from_file_location("islands.island_hub", str(path))
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def _scripts_dir() -> Path:
    return _repo_root() / "blender" / "scripts"


def setup_ao_world() -> None:
    scene = bpy.context.scene
    if hasattr(scene.render.bake, "cage_extrusion"):
        scene.render.bake.cage_extrusion = 0.02


def main() -> None:
    reset_scene()
    setup_cycles(samples=SAMPLES)
    setup_ao_world()

    builder = _load_island_builder()
    island = builder.build_island_hub()

    # Apply all modifiers so the unwrap + bake sees the actual displaced
    # surface, not the smooth cone+cylinder base.
    bpy.context.view_layer.objects.active = island
    bpy.ops.object.select_all(action="DESELECT")
    island.select_set(True)
    for mod in list(island.modifiers):
        try:
            bpy.ops.object.modifier_apply(modifier=mod.name)
        except RuntimeError:
            pass

    unwrap_uv2(island)

    img = make_image(f"{ISLAND_NAME}-ao", RESOLUTION)
    mat = make_bake_material(f"{ISLAND_NAME}-bake-mat", img)
    assign_material(island, mat)
    bake_object(island, "AO")

    out_dir = baked_texture_dir("ao")
    png_path = save_image(img, out_dir / f"{ISLAND_NAME}.png")
    print(f"  baked {ISLAND_NAME} → {png_path.relative_to(_repo_root())}")

    glb_path, staged = export_hub_glb_with_uv2(
        [island],
        f"blender/exports/{ISLAND_NAME}.glb",
    )
    print(f"  re-exported {ISLAND_NAME}.glb → {staged.relative_to(_repo_root())}")
    print(f"  glb size: {staged.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
