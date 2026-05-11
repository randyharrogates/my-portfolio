"""Hub dome ceiling — Phase 2 Session 4 deliverable (asset 2.4).

A faceted geodesic half-dome sitting atop the column ring at z = 5.5m.
Two named meshes share the same glb so the React side can material-control
them independently:

- ``hub-dome-shell``   — flat-shaded faceted interior surface,
                         rendered BackSide so the camera sees the inner
                         vault. Dark teal palette with subtle emissive.
- ``hub-dome-lattice`` — wireframe overlay of the same subdivision pattern,
                         a brass-emissive rib network.

Run headless to (re)build geometry + export glb + stage into public/:

    blender -b -P blender/scripts/hub/dome.py
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bmesh  # type: ignore[import-not-found]
import bpy  # type: ignore[import-not-found]

_SCRIPTS_DIR = Path(__file__).resolve().parent.parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from common.export import export_glb, stage_to_public  # noqa: E402

HUB_COLLECTION = "Hub"
SHELL_NAME = "hub-dome-shell"
LATTICE_NAME = "hub-dome-lattice"

HALL_HUB_RADIUS = 3.0
HALL_CEILING_HEIGHT = 5.5
DOME_RADIUS = HALL_HUB_RADIUS * 1.5  # 4.5m — spans wider than the column ring
DOME_SCALE_Z = 0.65                  # flattens to a shallow architectural dome
DOME_SUBDIVISIONS = 2                # 42 verts → faceted, not smooth
LATTICE_THICKNESS = 0.04


def _get_or_create_collection(name: str) -> bpy.types.Collection:
    coll = bpy.data.collections.get(name)
    if coll is None:
        coll = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(coll)
    return coll


def _move_to_collection(obj: bpy.types.Object, coll: bpy.types.Collection) -> None:
    for existing in list(obj.users_collection):
        existing.objects.unlink(obj)
    coll.objects.link(obj)


def _remove_if_exists(*names: str) -> None:
    for name in names:
        obj = bpy.data.objects.get(name)
        if obj is not None:
            bpy.data.objects.remove(obj, do_unlink=True)


def build_dome(
    radius: float = DOME_RADIUS,
    base_z: float = HALL_CEILING_HEIGHT,
    subdivisions: int = DOME_SUBDIVISIONS,
    scale_z: float = DOME_SCALE_Z,
    lattice_thickness: float = LATTICE_THICKNESS,
) -> tuple[bpy.types.Object, bpy.types.Object]:
    """Build the dome shell + lattice. Idempotent — tears down prior pieces.

    Returns (shell, lattice).
    """
    _remove_if_exists(SHELL_NAME, LATTICE_NAME)
    hub = _get_or_create_collection(HUB_COLLECTION)

    # --- Shell: icosphere top half, flat shaded, Y-scaled to flatten ----
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions,
        radius=radius,
        location=(0, 0, base_z),
    )
    shell = bpy.context.active_object
    shell.name = SHELL_NAME

    # Cull bottom half (z < base_z in world == z < 0 in object-local)
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(shell.data)
    verts_to_remove = [v for v in bm.verts if v.co.z < 0.0]
    bmesh.ops.delete(bm, geom=verts_to_remove, context="VERTS")
    bmesh.update_edit_mesh(shell.data)
    bpy.ops.object.mode_set(mode="OBJECT")

    # Flatten with Y-scale, then apply so vertex positions are baked
    shell.scale = (1.0, 1.0, scale_z)
    bpy.context.view_layer.objects.active = shell
    bpy.ops.object.select_all(action="DESELECT")
    shell.select_set(True)
    bpy.ops.object.transform_apply(scale=True)

    bpy.ops.object.shade_flat()
    _move_to_collection(shell, hub)

    # --- Lattice: duplicate shell + wireframe modifier ------------------
    lattice_data = shell.data.copy()
    lattice = bpy.data.objects.new(LATTICE_NAME, lattice_data)
    bpy.context.scene.collection.objects.link(lattice)
    lattice.location = shell.location

    wf = lattice.modifiers.new(name="Wireframe", type="WIREFRAME")
    wf.thickness = lattice_thickness
    wf.use_replace = True
    wf.use_relative_offset = True
    _move_to_collection(lattice, hub)

    return shell, lattice


def _reset_scene() -> None:
    """Headless-mode scene reset — wipe everything to a clean slate."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def _select_only(*objs: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objs:
        obj.select_set(True)
    if objs:
        bpy.context.view_layer.objects.active = objs[0]


def main() -> None:
    _reset_scene()
    shell, lattice = build_dome()

    _select_only(shell, lattice)
    export_path = export_glb(
        "blender/exports/hub-dome.glb",
        selection_only=True,
    )
    staged = stage_to_public(str(export_path))

    print(f"  shell  : verts={len(shell.data.vertices)} faces={len(shell.data.polygons)}")
    print(f"  lattice: verts={len(lattice.data.vertices)} (wireframe modifier expands at export)")
    print(f"  exported  → {export_path}")
    print(f"  staged at → {staged}")


if __name__ == "__main__":
    main()
