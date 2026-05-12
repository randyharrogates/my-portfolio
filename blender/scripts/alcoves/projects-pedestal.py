"""Alcove pedestal + threshold — Phase 4 Session 19 deliverable (asset 4.4).

The last Phase 4 asset. Two pieces that together finish the alcove
template:

- ``alcove-pedestal`` — central 3-tier octagonal brass altar in the
                        middle of the alcove floor. Sized to read as
                        waist-height (~0.95 m) for a 1.6 m eye-height
                        camera so it composes well with the hologram
                        floating behind it. Future Phase 7+ "hero
                        prop" can mount on top; for now it's a
                        standalone sculptural element.
- ``alcove-threshold`` — brass strip running along the alcove opening
                        edge, bridging the hub floor (y=0) and the
                        raised alcove floor (y=0.08). Visually unifies
                        the two floors and gives each alcove a clear
                        "entrance" cue from the hub side.

Both built at Blender origin and positioned via React-side translation.

Run headless::

    blender -b -P blender/scripts/alcoves/projects-pedestal.py
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
PEDESTAL_NAME = "alcove-pedestal"
THRESHOLD_NAME = "alcove-threshold"

# Pedestal — 3 stepped octagonal tiers (echoes the hub column's stepped
# base / capital language).
PED_BOTTOM_RADIUS = 1.30  # Session 20: 2× (was 0.65)
PED_BOTTOM_HEIGHT = 0.40  # was 0.20
PED_MIDDLE_RADIUS = 1.00  # was 0.50
PED_MIDDLE_HEIGHT = 1.10  # was 0.55
PED_TOP_RADIUS = 1.40     # was 0.70
PED_TOP_HEIGHT = 0.36     # was 0.18

# Threshold — flat brass strip at the alcove opening.
THR_WIDTH = 16.0   # matches alcove opening width (was 8.0)
THR_DEPTH = 0.80   # was 0.40
THR_HEIGHT = 0.16  # bridges new alcove floor lift of 0.16 m (was 0.08)


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


def _make_octagonal_tier(
    name: str,
    radius: float,
    height: float,
    z_center: float,
    rotation_deg: float = 22.5,
) -> bpy.types.Object:
    """Create an 8-sided cylinder slab. Rotated by `rotation_deg` so the
    flat edges face the cardinal/diagonal directions (matches the hub
    floor's octagon orientation from Session 1)."""
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8,
        radius=radius,
        depth=height,
        location=(0, 0, z_center),
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler[2] = math.radians(rotation_deg)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.transform_apply(rotation=True)

    bevel = obj.modifiers.new(name="EdgeBevel", type="BEVEL")
    bevel.width = 0.025
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(30)
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


def _build_pedestal() -> bpy.types.Object:
    """3-tier octagonal pedestal. Total height ≈ 0.93 m. Built so its
    base sits at Blender z=0; React-side translate lifts it to the
    alcove floor (y=0.08)."""
    bottom_z = PED_BOTTOM_HEIGHT / 2
    middle_z = PED_BOTTOM_HEIGHT + PED_MIDDLE_HEIGHT / 2
    top_z = PED_BOTTOM_HEIGHT + PED_MIDDLE_HEIGHT + PED_TOP_HEIGHT / 2

    bottom = _make_octagonal_tier(
        "pedestal-bottom", PED_BOTTOM_RADIUS, PED_BOTTOM_HEIGHT, bottom_z
    )
    middle = _make_octagonal_tier(
        "pedestal-middle", PED_MIDDLE_RADIUS, PED_MIDDLE_HEIGHT, middle_z
    )
    top = _make_octagonal_tier(
        "pedestal-top", PED_TOP_RADIUS, PED_TOP_HEIGHT, top_z
    )

    joined = _join_pieces([bottom, middle, top], PEDESTAL_NAME)
    return joined


def _build_threshold() -> bpy.types.Object:
    """Flat brass strip 8.0 × 0.40 × 0.08, centered at Blender origin.
    React-side translate puts it at the alcove opening edge."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, THR_HEIGHT / 2))
    obj = bpy.context.active_object
    obj.name = THRESHOLD_NAME
    obj.scale = (THR_WIDTH, THR_DEPTH, THR_HEIGHT)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.transform_apply(scale=True)

    bevel = obj.modifiers.new(name="EdgeBevel", type="BEVEL")
    bevel.width = 0.015
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(30)
    return obj


def build_pedestal_set() -> tuple[bpy.types.Object, bpy.types.Object]:
    _remove_if_exists(PEDESTAL_NAME, THRESHOLD_NAME)
    alcove = _get_or_create_collection(ALCOVE_COLLECTION)

    pedestal = _build_pedestal()
    _move_to_collection(pedestal, alcove)

    threshold = _build_threshold()
    _move_to_collection(threshold, alcove)

    return pedestal, threshold


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
    pedestal, threshold = build_pedestal_set()

    _select_only(pedestal, threshold)
    export_path = export_glb(
        "blender/exports/alcove-pedestal.glb",
        selection_only=True,
    )
    staged = stage_to_public(str(export_path))

    print(f"  pedestal : verts={len(pedestal.data.vertices)} faces={len(pedestal.data.polygons)}")
    print(f"  threshold: verts={len(threshold.data.vertices)} faces={len(threshold.data.polygons)}")
    print(f"  exported  → {export_path}")
    print(f"  staged at → {staged}")


if __name__ == "__main__":
    main()
