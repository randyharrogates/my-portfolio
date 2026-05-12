"""Hub AO bake — Phase 2 asset 2.10.

Bakes one ambient-occlusion map per named mesh in the hub, sized 512² and
written to ``public/textures/hall/baked/ao/<mesh-name>.png``. Also
re-exports each hub glb with the new ``UVMap_lightmap`` second UV layer
included, so the React side can attach the AO map via three.js'
``aoMap`` (which requires the second UV channel on the BufferGeometry).

The bake is *self-occlusion only* — each glb is rendered in isolation,
so the floor doesn't include shadows cast by the columns and vice versa.
This is the right scope for a $0 procedural Phase 2: it captures the
high-value detail (capital underside shadow, dome lattice dappling,
wall-frame shadow on slab) without coupling all five glbs into a single
mega-scene.

Cycles parameters are tuned for low-frequency AO at 512²: 128 samples,
adaptive sampling on, OpenImageDenoise on, AO distance 1.5m. Should run
in ~60-120 seconds total on Apple Silicon CPU.

Run headless::

    /Applications/Blender.app/Contents/MacOS/Blender -b \\
        -P blender/scripts/bake/hub-ao.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import bpy  # type: ignore[import-not-found]

_SCRIPTS_DIR = Path(__file__).resolve().parent.parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from bake._common import run_bake_pipeline  # noqa: E402


def setup_ao_world() -> None:
    """Cycles AO bake driven by ``bake_type="AO"`` reads cycles.ao_bounces
    and the per-scene AO distance directly — no world surface shader or
    light needed. Just nudge bake-side AO distance for sensible falloff.
    """
    scene = bpy.context.scene
    if hasattr(scene.render.bake, "cage_extrusion"):
        scene.render.bake.cage_extrusion = 0.02


def main() -> None:
    results = run_bake_pipeline(
        kind="ao",
        bake_type="AO",
        resolution=512,
        samples=128,
        setup_world=setup_ao_world,
    )
    print()
    print(f"AO bake complete — {len(results)} maps written.")
    for name, png, glb in results:
        print(f"  {name}: {png.name}  ({glb.name})")


if __name__ == "__main__":
    main()
