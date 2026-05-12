"""Alcove hologram mount frame — Phase 4 Session 18 deliverable (asset 4.3).

A small brass bezel surrounding the hologram screen + a horizontal shelf
projecting below the screen. The bezel "frames" the hologram from behind
(camera-side face is coplanar with the hologram, frame extends behind
into the alcove); the shelf reads as the altar / mainframe that the
holographic projection appears to emerge from — a classic Wakandan
sci-fi cue.

Built at Blender origin and mounted in React via translation to the
alcove-local position `(0, 2.3, +3.0)` in the π-flip wrapper (which
becomes outer-group `(0, 2.3, -3.0)` — same as the hologram screen).

Two named meshes per glb:

- ``alcove-mount-frame`` — rectangular bezel (outer 3.45 × 2.10 m,
                            inner 3.05 × 1.80 m, depth 0.12 m).
- ``alcove-mount-shelf`` — horizontal shelf below the bezel
                            (3.30 m wide × 0.20 m tall × 0.50 m deep),
                            top face flush with the bezel's bottom edge.

Run headless::

    blender -b -P blender/scripts/alcoves/projects-mount.py
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
FRAME_NAME = "alcove-mount-frame"
SHELF_NAME = "alcove-mount-shelf"

# Bezel outline. Hologram size in React doubles to 6.0 × 3.5 m at the
# Session 20 scale. Add a small margin so the brass hugs the hologram,
# then a 0.40 m brass strip on each side.
HOLOGRAM_W = 6.0       # Session 20: 2× (was 3.0)
HOLOGRAM_H = 3.5       # was 1.75
INNER_MARGIN = 0.10    # was 0.05
FRAME_THICKNESS = 0.40 # was 0.20
FRAME_DEPTH = 0.24     # was 0.12

OUTER_W = HOLOGRAM_W + 2 * (INNER_MARGIN + FRAME_THICKNESS)  # 7.00 m
OUTER_H = HOLOGRAM_H + 2 * (INNER_MARGIN + FRAME_THICKNESS)  # 4.50 m
INNER_W = HOLOGRAM_W + 2 * INNER_MARGIN                       # 6.20 m
INNER_H = HOLOGRAM_H + 2 * INNER_MARGIN                       # 3.70 m

# Shelf — sits just below the bezel's outer bottom edge.
SHELF_W = 6.60   # was 3.30
SHELF_H = 0.40   # was 0.20
SHELF_DEPTH = 1.00  # was 0.50


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


def _build_frame(
    outer_w: float,
    outer_h: float,
    frame_thickness: float,
    depth: float,
) -> bpy.types.Object:
    """Rectangular bezel: outer rect, inset by frame_thickness to define
    the inner hole, extrude along Y by `depth`."""
    half_w = outer_w / 2
    half_h = outer_h / 2
    outline = [
        (-half_w, 0.0, -half_h),
        ( half_w, 0.0, -half_h),
        ( half_w, 0.0,  half_h),
        (-half_w, 0.0,  half_h),
    ]
    mesh = bpy.data.meshes.new(FRAME_NAME + "_mesh")
    obj = bpy.data.objects.new(FRAME_NAME, mesh)
    bpy.context.scene.collection.objects.link(obj)
    mesh.from_pydata(outline, [], [list(range(4))])
    mesh.update()

    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)

    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.inset(thickness=frame_thickness)
    bpy.ops.mesh.delete(type="FACE")
    bpy.ops.mesh.select_all(action="SELECT")
    # Extrude in -Y so the bezel's front face stays at Y=0 (the hologram
    # plane after the React-side π-flip + position translate land it on
    # the alcove's back-wall side of the hologram).
    bpy.ops.mesh.extrude_region_move(
        TRANSFORM_OT_translate={"value": (0.0, -depth, 0.0)}
    )
    bpy.ops.object.mode_set(mode="OBJECT")

    # Centre the bezel on Y=0 in depth so it straddles the hologram plane.
    obj.location.y = depth / 2
    bpy.ops.object.transform_apply(location=True)

    bevel = obj.modifiers.new(name="EdgeBevel", type="BEVEL")
    bevel.width = 0.02
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(35)

    return obj


def _build_shelf(
    width: float,
    height: float,
    depth: float,
    frame_bottom_z: float,
) -> bpy.types.Object:
    """Horizontal shelf below the bezel. Top face at z = `frame_bottom_z`.
    Projects forward (toward the camera in the alcove) by `depth`."""
    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=(0.0, -depth / 2, frame_bottom_z - height / 2),
    )
    obj = bpy.context.active_object
    obj.name = SHELF_NAME
    obj.scale = (width, depth, height)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.transform_apply(scale=True)

    bevel = obj.modifiers.new(name="EdgeBevel", type="BEVEL")
    bevel.width = 0.025
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(35)

    return obj


def build_mount() -> tuple[bpy.types.Object, bpy.types.Object]:
    _remove_if_exists(FRAME_NAME, SHELF_NAME)
    alcove = _get_or_create_collection(ALCOVE_COLLECTION)

    frame = _build_frame(OUTER_W, OUTER_H, FRAME_THICKNESS, FRAME_DEPTH)
    _move_to_collection(frame, alcove)

    shelf = _build_shelf(SHELF_W, SHELF_H, SHELF_DEPTH, -OUTER_H / 2)
    _move_to_collection(shelf, alcove)

    return frame, shelf


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
    frame, shelf = build_mount()

    _select_only(frame, shelf)
    export_path = export_glb(
        "blender/exports/alcove-mount.glb",
        selection_only=True,
    )
    staged = stage_to_public(str(export_path))

    print(f"  frame: verts={len(frame.data.vertices)} faces={len(frame.data.polygons)}")
    print(f"  shelf: verts={len(shelf.data.vertices)} faces={len(shelf.data.polygons)}")
    print(f"  exported  → {export_path}")
    print(f"  staged at → {staged}")


if __name__ == "__main__":
    main()
