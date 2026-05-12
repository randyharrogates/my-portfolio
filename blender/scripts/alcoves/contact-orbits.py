"""Contact alcove — orbital comms array (Phase 5 asset 5.5).

Three brass orbital rings at different inclinations forming a Bohr-model
"comms array" around a small core sphere. Stands waist-high beside the
central alcove pedestal in the contact (comms array) alcove. The contact
alcove is fully-open so the orbital array is visible from any angle
around the hub.

Geometry:

- Core sphere: brass, radius 0.30 m, at the centre of the orbital
  pivot (alcove-local position determined React-side).
- Three torus rings:
   - Ring 1 (horizontal):     major radius 1.20 m, minor radius 0.025 m, no tilt.
   - Ring 2 (tilted +60°):    major radius 1.20 m, minor radius 0.025 m,
                              rotated 60° about X axis.
   - Ring 3 (tilted -60°):    major radius 1.20 m, minor radius 0.025 m,
                              rotated -60° about X axis.
- Single joined output mesh ``alcove-contact-orbits``.

The rings are static geometry; React-side `useFrame` can rotate them
slowly as decoration if desired (Phase 6 polish).

Run headless::

    blender -b -P blender/scripts/alcoves/contact-orbits.py
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy  # type: ignore[import-not-found]

_SCRIPTS_DIR = Path(__file__).resolve().parent.parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from common.export import export_glb, stage_to_public  # noqa: E402

ALCOVE_COLLECTION = "Alcove"
ORBITS_NAME = "alcove-contact-orbits"

CORE_RADIUS = 0.30
RING_MAJOR = 1.20
RING_MINOR = 0.030
RING_MAJOR_SEGS = 48
RING_MINOR_SEGS = 8


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


def _make_core(name: str) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=CORE_RADIUS,
        segments=24,
        ring_count=16,
        location=(0.0, 0.0, 0.0),
    )
    obj = bpy.context.active_object
    obj.name = name

    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.shade_smooth()
    return obj


def _make_ring(name: str, tilt_x_deg: float, tilt_y_deg: float = 0.0) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=RING_MAJOR,
        minor_radius=RING_MINOR,
        major_segments=RING_MAJOR_SEGS,
        minor_segments=RING_MINOR_SEGS,
        location=(0.0, 0.0, 0.0),
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = (
        math.radians(tilt_x_deg),
        math.radians(tilt_y_deg),
        0.0,
    )
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.transform_apply(rotation=True)
    bpy.ops.object.shade_smooth()
    return obj


def _join_pieces(pieces: list[bpy.types.Object], final_name: str) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for p in pieces:
        p.select_set(True)
    bpy.context.view_layer.objects.active = pieces[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = final_name
    return joined


def build_orbits() -> bpy.types.Object:
    _remove_if_exists(ORBITS_NAME)
    alcove = _get_or_create_collection(ALCOVE_COLLECTION)

    core = _make_core("orbit-core")
    ring_a = _make_ring("orbit-ring-a", 0.0)
    ring_b = _make_ring("orbit-ring-b", 60.0)
    ring_c = _make_ring("orbit-ring-c", -60.0, 30.0)

    joined = _join_pieces([core, ring_a, ring_b, ring_c], ORBITS_NAME)
    _move_to_collection(joined, alcove)
    return joined


def _reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def _select_only(*objs: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objs:
        obj.select_set(True)
    if objs:
        bpy.context.view_layer.objects.active = objs[0]


def main() -> None:
    _reset_scene()
    orbits = build_orbits()

    _select_only(orbits)
    export_path = export_glb(
        "blender/exports/contact-orbits.glb",
        selection_only=True,
    )
    staged = stage_to_public(str(export_path))

    print(f"  orbits: verts={len(orbits.data.vertices)} faces={len(orbits.data.polygons)}")
    print(f"  exported  → {export_path}")
    print(f"  staged at → {staged}")


if __name__ == "__main__":
    main()
