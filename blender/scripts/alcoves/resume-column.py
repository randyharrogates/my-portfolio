"""Resume alcove — credentials column (Phase 5 asset 5.4).

A tall narrow brass column standing beside the central alcove pedestal
in the resume (credentials wall) alcove. Reads as a scroll-cylinder /
filing column — the unbroken record of credentials. The resume alcove
uses ``half-open`` openness so the column silhouettes against the cream
tungsten back wall when seen from the camera.

Geometry:

- Vertical cylinder (24 sides) — outer radius 0.45 m, height 4.20 m.
- 8 horizontal "rib bands" wrapping the cylinder at evenly-spaced
  heights — each is a slightly wider cylinder (radius 0.52 m, height
  0.08 m) so they read as protruding ribs / scroll-binding cords.
- Base flange (radius 0.62 m, height 0.18 m) and cap flange
  (radius 0.56 m, height 0.14 m) so the column terminates cleanly.
- Single joined output mesh ``alcove-resume-column``.

Run headless::

    blender -b -P blender/scripts/alcoves/resume-column.py
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
COLUMN_NAME = "alcove-resume-column"

SHAFT_RADIUS = 0.45
SHAFT_HEIGHT = 4.20
SHAFT_VERTS = 24

RIB_RADIUS = 0.52
RIB_HEIGHT = 0.08
RIB_COUNT = 8

BASE_RADIUS = 0.62
BASE_HEIGHT = 0.18

CAP_RADIUS = 0.56
CAP_HEIGHT = 0.14


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


def _make_cyl(name: str, radius: float, height: float, z_center: float, verts: int = 16) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=verts,
        radius=radius,
        depth=height,
        location=(0.0, 0.0, z_center),
    )
    obj = bpy.context.active_object
    obj.name = name
    bevel = obj.modifiers.new(name="EdgeBevel", type="BEVEL")
    bevel.width = 0.015
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(35)
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


def build_column() -> bpy.types.Object:
    _remove_if_exists(COLUMN_NAME)
    alcove = _get_or_create_collection(ALCOVE_COLLECTION)

    pieces: list[bpy.types.Object] = []

    base = _make_cyl("col-base", BASE_RADIUS, BASE_HEIGHT, BASE_HEIGHT / 2, verts=24)
    pieces.append(base)

    shaft_z_base = BASE_HEIGHT
    shaft_z_center = shaft_z_base + SHAFT_HEIGHT / 2
    shaft = _make_cyl("col-shaft", SHAFT_RADIUS, SHAFT_HEIGHT, shaft_z_center, verts=SHAFT_VERTS)
    pieces.append(shaft)

    # Rib bands evenly distributed along shaft.
    rib_span_z = SHAFT_HEIGHT - 0.3
    rib_z_start = shaft_z_base + 0.15
    for i in range(RIB_COUNT):
        t = i / (RIB_COUNT - 1)
        z = rib_z_start + t * rib_span_z
        rib = _make_cyl(f"col-rib-{i:02d}", RIB_RADIUS, RIB_HEIGHT, z, verts=24)
        pieces.append(rib)

    cap_z_base = shaft_z_base + SHAFT_HEIGHT
    cap_z_center = cap_z_base + CAP_HEIGHT / 2
    cap = _make_cyl("col-cap", CAP_RADIUS, CAP_HEIGHT, cap_z_center, verts=24)
    pieces.append(cap)

    joined = _join_pieces(pieces, COLUMN_NAME)
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
    column = build_column()

    _select_only(column)
    export_path = export_glb(
        "blender/exports/resume-column.glb",
        selection_only=True,
    )
    staged = stage_to_public(str(export_path))

    print(f"  column: verts={len(column.data.vertices)} faces={len(column.data.polygons)}")
    print(f"  exported  → {export_path}")
    print(f"  staged at → {staged}")


if __name__ == "__main__":
    main()
