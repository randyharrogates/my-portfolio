"""Hub plants — Phase 2.5 Session 14 deliverable.

Imports two PolyHaven CC0 plant GLTFs (pachira aquatica + fern_02), packs
their textures, and re-exports each as a single GLB ready for three.js.

Plants live inside ``hub-planter`` at the hub center. Pachira is the
centerpiece tropical "money tree" providing vertical silhouette; fern
fills the planter floor with low-mid foliage. Both materials use alpha
mask (cutoff 0.5) for leaf cutouts.

Input GLTFs live under ``blender/exports/polyhaven/{pachira,fern}/`` and
have already been patched to use RGBA PNG diffuse maps and ``alphaMode:
MASK`` on the leaf materials (see ``Session 14`` block in
``blender/RENDER-LOG.md``).

Run headless::

    blender -b -P blender/scripts/hub/plants.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import bpy  # type: ignore[import-not-found]

_SCRIPTS_DIR = Path(__file__).resolve().parent.parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from common.export import export_glb, stage_to_public  # noqa: E402

REPO_ROOT = _SCRIPTS_DIR.parent.parent
POLYHAVEN_DIR = REPO_ROOT / "blender" / "exports" / "polyhaven"

PLANTS = [
    {
        "id": "hub-plant-pachira",
        "gltf": POLYHAVEN_DIR / "pachira" / "pachira_aquatica_01_1k.gltf",
    },
    {
        "id": "hub-plant-fern",
        "gltf": POLYHAVEN_DIR / "fern" / "fern_02_1k.gltf",
    },
]


def _reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def _import_gltf(path: Path) -> list[bpy.types.Object]:
    """Import a glTF file and return the freshly-imported root objects."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported = [obj for obj in bpy.data.objects if obj not in before]
    return imported


def _select_only(objs: list[bpy.types.Object]) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objs:
        obj.select_set(True)
    if objs:
        bpy.context.view_layer.objects.active = objs[0]


def main() -> None:
    for spec in PLANTS:
        plant_id = spec["id"]
        src = spec["gltf"]
        if not src.exists():
            raise FileNotFoundError(src)
        print(f"=== {plant_id} ===")
        _reset_scene()
        imported = _import_gltf(src)
        meshes = [o for o in imported if o.type == "MESH"]
        if not meshes:
            raise RuntimeError(f"no mesh objects imported from {src}")
        _select_only(imported)
        out_rel = f"blender/exports/{plant_id}.glb"
        export_path = export_glb(out_rel, selection_only=True)
        staged = stage_to_public(str(export_path))
        verts = sum(len(o.data.vertices) for o in meshes)
        faces = sum(len(o.data.polygons) for o in meshes)
        print(f"  imported {len(imported)} objects ({len(meshes)} meshes)")
        print(f"  verts={verts} faces={faces}")
        print(f"  exported  → {export_path}")
        print(f"  staged at → {staged}")


if __name__ == "__main__":
    main()
