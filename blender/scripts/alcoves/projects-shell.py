"""Alcove pavilion shell — Phase 4 Session 16 deliverable (asset 4.1).

The first concrete alcove asset. Locks the geometry pattern that every
remaining alcove (about, skills, blog, resume, contact) re-uses; per
ASSET-PLAN.md the script is named after the "projects" alcove because that
is the first one to be swapped in on the React side, but the exported glb
is generic (``alcove-shell.glb``) and is instantiated 6× by
``Alcove.tsx`` at each alcove ring slot.

Geometry — top-down view, hub at local +Z, alcove opens at z=0:

::

      x↑
       |    (opening — local +Z points to hub)
       |    ────────────────────────────── z=0
       |   /                              \\
       |  / left-side             right-side\\
       | /     wall                    wall  \\
       |/____________________________________\\  z=-s·√3/2
       |              back wall

Half of a regular hexagon (3 contiguous sides). Edge length ``s`` controls
both opening width and alcove depth.

Five named meshes per glb so the React side can material them
independently — the dark-teal slabs use the same PolyHaven concrete-style
PBR as the hub walls; the brass corner pilasters use the same brass map as
the hub columns.

- ``alcove-shell-walls``     — 3 dark-teal wall slabs joined (back + 2 sides)
- ``alcove-shell-ceiling``   — half-hex ceiling cap
- ``alcove-shell-floor``     — half-hex raised floor (alcove threshold)
- ``alcove-shell-pilasters`` — 4 brass vertical pilasters at panel corners
- ``alcove-shell-cornice``   — brass cornice band running along the top
                               of all 3 walls

Run headless::

    blender -b -P blender/scripts/alcoves/projects-shell.py
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
# Session 20: walls now split into 3 separately-named meshes so the
# React side can conditionally hide them per theme.openness.
BACK_WALL_NAME = "alcove-shell-back-wall"
SIDE_WALL_LEFT_NAME = "alcove-shell-side-wall-left"
SIDE_WALL_RIGHT_NAME = "alcove-shell-side-wall-right"
CEILING_NAME = "alcove-shell-ceiling"
FLOOR_NAME = "alcove-shell-floor"
PILASTERS_NAME = "alcove-shell-pilasters"
CORNICE_NAME = "alcove-shell-cornice"

# Half-hex edge length. Each of the 3 wall panels is this long.
# Opening width at z=0 is 2·s (16m). Alcove depth is s·√3/2 (6.93m).
PANEL_EDGE = 8.0       # Session 20: 2× (was 4.0)
# Session 26d: shell capped at the alcove-arch shoulder line (14 m, lifted
# from 10 m) to match the taller cathedral arch. The arch's rounded top
# (14 m → 22 m) reads cleanly against the outer wall + daylight HDRI
# at radius 40 m.
PANEL_HEIGHT = 14.0    # was 10.0 (which was 18.0)
PANEL_THICKNESS = 0.60  # was 0.30

# Floor and ceiling thickness (the slabs)
SLAB_THICKNESS = 0.36  # was 0.18
# How far the alcove floor sits above the hub floor — defines the threshold.
FLOOR_LIFT = 0.16  # was 0.08

# Brass corner pilaster cross-section.
PILASTER_WIDTH = 0.64  # was 0.32
PILASTER_DEPTH = 0.64  # was 0.32
# How far the pilaster protrudes from the panel surface (toward the alcove
# interior).
PILASTER_PROTRUSION = 0.36  # was 0.18

# Brass cornice band running along the top of all 3 walls.
CORNICE_HEIGHT = 0.84  # was 0.42
CORNICE_PROTRUSION = 0.32  # was 0.16


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


def _make_box_rotated_z(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    yaw: float,
) -> bpy.types.Object:
    """Make a box and rotate it around the Z axis (yaw), applying the rotation."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    obj.rotation_euler[2] = yaw
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
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


def _half_hex_corners(edge: float) -> list[tuple[float, float]]:
    """Return the 4 corners of the half-hex (where adjacent panels meet),
    in (x, y) — Blender coordinates. The half-hex opens toward +Y in
    Blender; +Y maps to +Z (hub direction) after the glTF export's
    Y-up swap.

    Corners are returned left-to-right when looking from the opening
    inward — left outer, left back, right back, right outer.
    """
    s = edge
    # Hexagon centered at origin, opening half is +Y, back half is -Y.
    # The 4 corners of the back half are:
    return [
        (-s,        0.0),                  # left-outer (where left side wall meets opening)
        (-s / 2,   -s * math.sqrt(3) / 2),  # left-back (where left side wall meets back wall)
        ( s / 2,   -s * math.sqrt(3) / 2),  # right-back
        ( s,        0.0),                   # right-outer
    ]


def _build_walls(edge: float, height: float, thickness: float) -> tuple[
    bpy.types.Object, bpy.types.Object, bpy.types.Object
]:
    """Build the 3 wall panels (left-side, back, right-side) as 3 separate
    named meshes so React can conditionally hide them per theme.openness.

    Wall indices follow `_half_hex_corners` order (left-outer → left-back
    → right-back → right-outer), so:
      - wall 0 = LEFT side wall  (between left-outer + left-back corners)
      - wall 1 = BACK wall       (between left-back + right-back corners)
      - wall 2 = RIGHT side wall (between right-back + right-outer corners)
    """
    corners = _half_hex_corners(edge)
    wall_names = [
        SIDE_WALL_LEFT_NAME,
        BACK_WALL_NAME,
        SIDE_WALL_RIGHT_NAME,
    ]
    walls: list[bpy.types.Object] = []

    for i in range(3):
        a = corners[i]
        b = corners[i + 1]
        cx = (a[0] + b[0]) / 2
        cy = (a[1] + b[1]) / 2
        dx = b[0] - a[0]
        dy = b[1] - a[1]
        wall_yaw = math.atan2(dy, dx)
        # Push the wall outward by half its thickness along the outward
        # normal so the inner face sits flush with the half-hex edge.
        nx = -math.sin(wall_yaw)
        ny = math.cos(wall_yaw)
        push = thickness / 2
        cx -= nx * push
        cy -= ny * push
        wall = _make_box_rotated_z(
            name=wall_names[i],
            location=(cx, cy, height / 2),
            scale=(edge, thickness, height),
            yaw=wall_yaw,
        )
        bevel = wall.modifiers.new(name="EdgeBevel", type="BEVEL")
        bevel.width = 0.08
        bevel.segments = 2
        bevel.limit_method = "ANGLE"
        bevel.angle_limit = math.radians(40)
        walls.append(wall)

    return walls[0], walls[1], walls[2]


def _half_hex_ngon_verts(edge: float) -> list[tuple[float, float]]:
    """6 vertices of the half-hex footprint (closed ngon). The ngon is the
    floor / ceiling shape: the 4 panel corners + the 2 opening corners at
    (±s, 0) — wait, those are the same as left-outer and right-outer.

    So the half-hex footprint has 4 corners total — it's actually a
    quadrilateral (trapezoid). Let me recount: a half-hex cut along the
    long diameter is a trapezoid with 4 corners.
    """
    s = edge
    h = s * math.sqrt(3) / 2
    # Trapezoid corners (Blender x,y, counter-clockwise from top-left):
    return [
        (-s,      0.0),     # left-outer / opening corner
        ( s,      0.0),     # right-outer / opening corner
        ( s / 2, -h),       # right-back
        (-s / 2, -h),       # left-back
    ]


def _build_slab(
    name: str,
    edge: float,
    z_center: float,
    thickness: float,
) -> bpy.types.Object:
    """Build a half-hex (trapezoidal) slab at the given z, with the given
    thickness."""
    verts2d = _half_hex_ngon_verts(edge)
    # Create the slab as a flat ngon then solidify to thickness.
    mesh = bpy.data.meshes.new(name + "_mesh")
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)

    verts3d = [(x, y, 0.0) for (x, y) in verts2d]
    faces = [list(range(len(verts2d)))]
    mesh.from_pydata(verts3d, [], faces)
    mesh.update()

    # Solidify to give the slab thickness; offset 0 centers it on z=0.
    solidify = obj.modifiers.new(name="Solidify", type="SOLIDIFY")
    solidify.thickness = thickness
    solidify.offset = 0.0
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=solidify.name)

    obj.location[2] = z_center
    bpy.ops.object.transform_apply(location=True)

    # Subtle bevel on the visible edges
    bevel = obj.modifiers.new(name="EdgeBevel", type="BEVEL")
    bevel.width = 0.03
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(30)
    return obj


def _build_pilasters(edge: float, height: float) -> bpy.types.Object:
    """4 brass vertical pilasters at the 4 panel-junction corners."""
    corners = _half_hex_corners(edge)
    pieces: list[bpy.types.Object] = []
    for i, (x, y) in enumerate(corners):
        # Pilaster sits just inside the panel corner (pushed slightly
        # toward the alcove interior / +Y) so it visually wraps the corner.
        # For simplicity, position it AT the corner — the pilaster's cross-
        # section is centered on the panel junction.
        pil = _make_box(
            name=f"alcove-pilaster-{i}",
            location=(x, y, height / 2),
            scale=(PILASTER_WIDTH, PILASTER_DEPTH, height),
        )
        # Bevel the vertical edges so the pilaster has a chamfered profile.
        bevel = pil.modifiers.new(name="EdgeBevel", type="BEVEL")
        bevel.width = 0.04
        bevel.segments = 3
        bevel.limit_method = "ANGLE"
        bevel.angle_limit = math.radians(25)
        pieces.append(pil)

    joined = _join_pieces(pieces, PILASTERS_NAME)
    return joined


def _build_cornice(edge: float, height: float) -> bpy.types.Object:
    """Brass cornice band along the top of all 3 wall panels, just below
    the ceiling. Three rotated bars joined into one mesh."""
    corners = _half_hex_corners(edge)
    pieces: list[bpy.types.Object] = []
    cornice_z = height - CORNICE_HEIGHT / 2

    for i in range(3):
        a = corners[i]
        b = corners[i + 1]
        cx = (a[0] + b[0]) / 2
        cy = (a[1] + b[1]) / 2
        dx = b[0] - a[0]
        dy = b[1] - a[1]
        bar_yaw = math.atan2(dy, dx)
        # Push the cornice bar inward (toward alcove interior) by half its
        # depth so it visually protrudes from the panel face.
        nx = -math.sin(bar_yaw)
        ny = math.cos(bar_yaw)
        # Inward normal points toward alcove interior, but in our coord
        # system the interior is +Y (since the alcove opens to +Y).
        # Make sure the protrusion is into the interior. Test:
        # the back wall runs from (-s/2, -h) to (s/2, -h); midpoint
        # (0, -h). atan2(0, s) = 0 → bar_yaw = 0 → nx = 0, ny = 1.
        # Pushing by (0, 1) * push moves cornice toward +Y, which is
        # into the alcove interior ✓.
        push = CORNICE_PROTRUSION / 2
        cx += nx * push
        cy += ny * push
        bar = _make_box_rotated_z(
            name=f"alcove-cornice-{i}",
            location=(cx, cy, cornice_z),
            scale=(edge, CORNICE_PROTRUSION + PANEL_THICKNESS, CORNICE_HEIGHT),
            yaw=bar_yaw,
        )
        bevel = bar.modifiers.new(name="EdgeBevel", type="BEVEL")
        bevel.width = 0.025
        bevel.segments = 2
        bevel.limit_method = "ANGLE"
        bevel.angle_limit = math.radians(30)
        pieces.append(bar)

    joined = _join_pieces(pieces, CORNICE_NAME)
    return joined


def build_shell(
    edge: float = PANEL_EDGE,
    height: float = PANEL_HEIGHT,
    thickness: float = PANEL_THICKNESS,
) -> tuple[
    bpy.types.Object,  # side-wall-left
    bpy.types.Object,  # back-wall
    bpy.types.Object,  # side-wall-right
    bpy.types.Object,  # ceiling
    bpy.types.Object,  # floor
    bpy.types.Object,  # pilasters
    bpy.types.Object,  # cornice
]:
    """Build the full alcove shell at the origin. Idempotent."""
    _remove_if_exists(
        SIDE_WALL_LEFT_NAME,
        BACK_WALL_NAME,
        SIDE_WALL_RIGHT_NAME,
        CEILING_NAME,
        FLOOR_NAME,
        PILASTERS_NAME,
        CORNICE_NAME,
    )
    alcove = _get_or_create_collection(ALCOVE_COLLECTION)

    left_wall, back_wall, right_wall = _build_walls(edge, height, thickness)
    _move_to_collection(left_wall, alcove)
    _move_to_collection(back_wall, alcove)
    _move_to_collection(right_wall, alcove)

    # Ceiling: half-hex slab centered just above the panel top.
    ceiling = _build_slab(
        CEILING_NAME,
        edge=edge,
        z_center=height + SLAB_THICKNESS / 2,
        thickness=SLAB_THICKNESS,
    )
    ceiling.name = CEILING_NAME
    _move_to_collection(ceiling, alcove)

    # Floor: half-hex slab raised slightly above hub floor level (threshold).
    floor = _build_slab(
        FLOOR_NAME,
        edge=edge,
        z_center=FLOOR_LIFT - SLAB_THICKNESS / 2,
        thickness=SLAB_THICKNESS,
    )
    floor.name = FLOOR_NAME
    _move_to_collection(floor, alcove)

    pilasters = _build_pilasters(edge, height)
    _move_to_collection(pilasters, alcove)

    cornice = _build_cornice(edge, height)
    _move_to_collection(cornice, alcove)

    return left_wall, back_wall, right_wall, ceiling, floor, pilasters, cornice


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
    left_wall, back_wall, right_wall, ceiling, floor, pilasters, cornice = build_shell()

    _select_only(left_wall, back_wall, right_wall, ceiling, floor, pilasters, cornice)
    export_path = export_glb(
        "blender/exports/alcove-shell.glb",
        selection_only=True,
    )
    staged = stage_to_public(str(export_path))

    for obj in (left_wall, back_wall, right_wall, ceiling, floor, pilasters, cornice):
        print(f"  {obj.name:<32s}: verts={len(obj.data.vertices)} faces={len(obj.data.polygons)}")
    print(f"  exported  → {export_path}")
    print(f"  staged at → {staged}")


if __name__ == "__main__":
    main()
