"""Hub wall panels — Phase 2 Session 5 deliverable (asset 2.5).

A single short parapet panel built at the origin (centered on Z=0 to Z=1m,
oriented so its +Y face is the inner surface). The React side instantiates
this glb six times at the column positions (hex-edge midpoints, three.js
angles 30°/90°/150°/210°/270°/330° at radius `HALL_HUB_RADIUS * cos(π/6)`),
rotated so each panel's inner face points toward the hub centre.

Two named meshes per glb so the React side can material them independently:

- ``hub-wall-slab``  — dark teal background panel.
- ``hub-wall-frame`` — five brass-emissive bars (top, bottom, left, right,
                       plus one decorative mid-slat) joined into one mesh.

Heights are intentionally low (1m parapet) so the alcove arches stay clearly
visible above the wall when viewed from inside the hub.

Run headless:

    blender -b -P blender/scripts/hub/walls.py
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

HUB_COLLECTION = "Hub"
SLAB_NAME = "hub-wall-slab"
FRAME_NAME = "hub-wall-frame"

PANEL_WIDTH = 3.0     # hex edge length — fits exactly between adjacent columns
PANEL_HEIGHT = 1.0    # parapet height; alcove arches stay visible above
PANEL_THICKNESS = 0.08
FRAME_THICKNESS = 0.04  # how far brass bars protrude from the +Y face
FRAME_WIDTH = 0.06      # cross-section of each brass bar


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


def _make_box(name: str, location: tuple[float, float, float], scale: tuple[float, float, float]) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.transform_apply(scale=True)
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


def build_wall(
    width: float = PANEL_WIDTH,
    height: float = PANEL_HEIGHT,
    thickness: float = PANEL_THICKNESS,
    frame_thickness: float = FRAME_THICKNESS,
    frame_width: float = FRAME_WIDTH,
) -> tuple[bpy.types.Object, bpy.types.Object]:
    """Build the wall slab + brass frame at the origin. Idempotent."""
    _remove_if_exists(SLAB_NAME, FRAME_NAME)
    hub = _get_or_create_collection(HUB_COLLECTION)

    # --- Slab -------------------------------------------------------------
    slab = _make_box(
        name=SLAB_NAME,
        location=(0, 0, height / 2),
        scale=(width, thickness, height),
    )
    bevel = slab.modifiers.new(name="EdgeBevel", type="BEVEL")
    bevel.width = 0.015
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(30)
    _move_to_collection(slab, hub)

    # --- Frame: 4 perimeter bars + 1 mid-slat, joined into one mesh ------
    front_y = thickness / 2 + frame_thickness / 2
    pieces: list[bpy.types.Object] = []

    pieces.append(_make_box(
        "wall-frame-top",
        location=(0, front_y, height - frame_width / 2),
        scale=(width, frame_thickness, frame_width),
    ))
    pieces.append(_make_box(
        "wall-frame-bottom",
        location=(0, front_y, frame_width / 2),
        scale=(width, frame_thickness, frame_width),
    ))
    pieces.append(_make_box(
        "wall-frame-left",
        location=(-width / 2 + frame_width / 2, front_y, height / 2),
        scale=(frame_width, frame_thickness, height),
    ))
    pieces.append(_make_box(
        "wall-frame-right",
        location=(width / 2 - frame_width / 2, front_y, height / 2),
        scale=(frame_width, frame_thickness, height),
    ))
    pieces.append(_make_box(
        "wall-frame-midslat",
        location=(0, front_y, height / 2),
        scale=(width - 2 * frame_width, frame_thickness, frame_width * 0.6),
    ))

    frame = _join_pieces(pieces, FRAME_NAME)
    _move_to_collection(frame, hub)

    return slab, frame


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
    slab, frame = build_wall()

    _select_only(slab, frame)
    export_path = export_glb(
        "blender/exports/hub-wall.glb",
        selection_only=True,
    )
    staged = stage_to_public(str(export_path))

    print(f"  slab : verts={len(slab.data.vertices)} faces={len(slab.data.polygons)}")
    print(f"  frame: verts={len(frame.data.vertices)} faces={len(frame.data.polygons)}")
    print(f"  exported  → {export_path}")
    print(f"  staged at → {staged}")


if __name__ == "__main__":
    main()
