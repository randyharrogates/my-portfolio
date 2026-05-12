"""Skills alcove — floating tech-stack badges (Phase 5 asset 5.2).

A ring of 8 hexagonal brass badges floating waist-high around the
central alcove pedestal in the skills (tool armory) alcove. Each badge
is a flat hex disc (radius 0.40 m, thickness 0.06 m) tilted outward
slightly so its face catches the camera approaching from the hub.

Reads as a Wakandan-futuristic "tech stack on display" — the rotating
constellation that the skills hologram echoes. The skills alcove is
fully-open so the badges are visible from every angle around the hub.

Geometry:

- 8 hex disc badges arranged on a circle radius 1.8 m around the
  alcove-local pedestal, at height z = 1.20 m (chest-height for the
  3.2 m eye-line camera).
- Each badge: 6-sided cylinder, radius 0.40 m, depth 0.06 m, rotated
  to face outward from the ring centre and tilted +12° toward the
  camera vertically.
- Single joined output mesh ``alcove-skills-badges``.

Run headless::

    blender -b -P blender/scripts/alcoves/skills-badges.py
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
BADGES_NAME = "alcove-skills-badges"

BADGE_COUNT = 8
RING_RADIUS = 1.80
BADGE_HEIGHT = 1.20
BADGE_RADIUS = 0.40
BADGE_DEPTH = 0.06
BADGE_TILT_DEG = 12.0


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


def _make_hex_badge(name: str, x: float, y: float, z: float, yaw: float) -> bpy.types.Object:
    """Hex disc, face pointing radially outward (yaw) and tilted up by
    BADGE_TILT_DEG so it angles toward the camera approaching from the
    +y direction (hub side)."""
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6,
        radius=BADGE_RADIUS,
        depth=BADGE_DEPTH,
        location=(x, y, z),
    )
    obj = bpy.context.active_object
    obj.name = name
    # The cylinder's axis is +Z. We want the badge face to point radially
    # outward (along the ring tangent) and tilted up. Rotate so cylinder
    # axis aligns with the radial direction, then tilt.
    # First rotate +X-axis cylinder to face outward in XY plane.
    obj.rotation_euler = (
        math.radians(90),                       # bring cylinder axis to lie in XY
        math.radians(BADGE_TILT_DEG),           # tilt the face up
        yaw,                                    # face outward
    )
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.transform_apply(rotation=True)

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


def build_badges() -> bpy.types.Object:
    _remove_if_exists(BADGES_NAME)
    alcove = _get_or_create_collection(ALCOVE_COLLECTION)

    pieces: list[bpy.types.Object] = []
    for i in range(BADGE_COUNT):
        angle = (i / BADGE_COUNT) * (2 * math.pi)
        x = math.cos(angle) * RING_RADIUS
        y = math.sin(angle) * RING_RADIUS
        # yaw so badge face points outward (along the radial direction)
        yaw = angle - math.pi / 2
        piece = _make_hex_badge(f"badge-{i:02d}", x, y, BADGE_HEIGHT, yaw)
        pieces.append(piece)

    joined = _join_pieces(pieces, BADGES_NAME)
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
    badges = build_badges()

    _select_only(badges)
    export_path = export_glb(
        "blender/exports/skills-badges.glb",
        selection_only=True,
    )
    staged = stage_to_public(str(export_path))

    print(f"  badges: verts={len(badges.data.vertices)} faces={len(badges.data.polygons)}")
    print(f"  exported  → {export_path}")
    print(f"  staged at → {staged}")


if __name__ == "__main__":
    main()
