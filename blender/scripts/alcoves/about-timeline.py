"""About alcove — timeline stele (Phase 5 asset 5.1).

A vertical brass stele standing to the LEFT of the central alcove
pedestal in the about (origin chamber) alcove. Reads as a memorial /
origin marker: the camera approaching the half-open about alcove sees
the central pedestal + hologram dead-ahead, with this stele off to the
left silhouetted against the open side wall (about is half-open: back
wall + ceiling kept, sides dropped).

Geometry:

- Vertical octagonal plinth 0.50 m × 0.50 m × 3.00 m tall.
- Three horizontal brass "milestone" bands wrapping the plinth at
  heights 0.7 m / 1.5 m / 2.3 m. Each band is 0.70 × 0.16 × 0.70 m,
  protruding 0.10 m on each side of the plinth for a clear shadow line.
- Bevelled cap at top (slight pyramid taper).
- Single joined output mesh `alcove-about-timeline` so React mounts it
  as one transform.

Built at Blender origin (base at z=0); React-side translation positions
it at alcove-local (-3.5, 0, -3.4) (LEFT of the central pedestal, same
depth as the pedestal). Brass material is the same shared brass texture
as the rest of the alcove; per-alcove emissive accent (warm tungsten
``#e8b45a``) is applied React-side via material clone.

Run headless::

    blender -b -P blender/scripts/alcoves/about-timeline.py
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
TIMELINE_NAME = "alcove-about-timeline"

# Session 21 polish: stele height bumped 3.0 → 4.5 m to match the
# resume column's vertical extent. Without this, the about focal-pose
# camera (which pitches 8° upward) cropped most of the stele below
# frame. Bands re-distributed to match the new height.
PLINTH_WIDTH = 0.50
PLINTH_DEPTH = 0.50
PLINTH_HEIGHT = 4.50

BAND_WIDTH = 0.70
BAND_DEPTH = 0.70
BAND_HEIGHT = 0.16
BAND_HEIGHTS = (0.90, 1.95, 3.00, 4.05)

CAP_WIDTH = 0.42
CAP_DEPTH = 0.42
CAP_HEIGHT = 0.22


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


def _make_box(name: str, w: float, d: float, h: float, z_center: float) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.0, 0.0, z_center))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (w, d, h)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.transform_apply(scale=True)

    bevel = obj.modifiers.new(name="EdgeBevel", type="BEVEL")
    bevel.width = 0.018
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(35)
    return obj


def _make_cap(name: str, base_w: float, base_d: float, height: float, z_base: float) -> bpy.types.Object:
    """Slightly tapered cap — base wider than top so it reads as a finial."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.0, 0.0, z_base + height / 2))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (base_w, base_d, height)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.transform_apply(scale=True)

    bevel = obj.modifiers.new(name="EdgeBevel", type="BEVEL")
    bevel.width = 0.030
    bevel.segments = 3
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


def build_timeline() -> bpy.types.Object:
    _remove_if_exists(TIMELINE_NAME)
    alcove = _get_or_create_collection(ALCOVE_COLLECTION)

    plinth = _make_box(
        "timeline-plinth",
        PLINTH_WIDTH,
        PLINTH_DEPTH,
        PLINTH_HEIGHT,
        PLINTH_HEIGHT / 2,
    )

    pieces = [plinth]
    for i, z in enumerate(BAND_HEIGHTS):
        band = _make_box(
            f"timeline-band-{i}",
            BAND_WIDTH,
            BAND_DEPTH,
            BAND_HEIGHT,
            z,
        )
        pieces.append(band)

    cap = _make_cap("timeline-cap", CAP_WIDTH, CAP_DEPTH, CAP_HEIGHT, PLINTH_HEIGHT)
    pieces.append(cap)

    joined = _join_pieces(pieces, TIMELINE_NAME)
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
    timeline = build_timeline()

    _select_only(timeline)
    export_path = export_glb(
        "blender/exports/about-timeline.glb",
        selection_only=True,
    )
    staged = stage_to_public(str(export_path))

    print(f"  timeline: verts={len(timeline.data.vertices)} faces={len(timeline.data.polygons)}")
    print(f"  exported  → {export_path}")
    print(f"  staged at → {staged}")


if __name__ == "__main__":
    main()
