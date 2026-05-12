"""Outer enclosing wall — Phase 9 reference realignment.

Cylindrical wall at radius 40 m (just beyond the alcove back walls), 28 m
tall, 0.5 m thick, pierced by 6 tall pointed-arch windows aligned with the
alcove angles. Light pours through the windows into the alcoves and out
toward the HDRI sky beyond.

Two named meshes per glb:

- ``hub-outer-wall-slab``  — dark concrete cylinder ring with the 6 window
                              cuts subtracted. Carries the procedural
                              Wakandan triangle motif on the inner face of
                              each wall section.
- ``hub-outer-wall-frame`` — brass arched frames around each of the 6
                              window openings.

Headless run::

    blender -b -P blender/scripts/hub/outer-wall.py
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
SLAB_NAME = "hub-outer-wall-slab"
FRAME_NAME = "hub-outer-wall-frame"

# Mirror constants from sections.ts so the two stay in sync.
WALL_RADIUS = 40.0
WALL_HEIGHT = 28.0
WALL_THICKNESS = 0.50

# 6 windows aligned with ALCOVE_ANGLE_DEG in sections.ts so light pours
# through each alcove opening from the sky beyond the wall.
WINDOW_ANGLES_DEG = [0, 48, 102, 170, 220, 285]
WINDOW_WIDTH_M = 8.0          # arc-length width at the wall surface
WINDOW_RECT_HEIGHT = 16.0     # rectangular section height (ground to spring line)
# Session 26d: arch rise bumped 2 → 4 so the rounded top is a proper
# half-ellipse cathedral arch instead of a shallow dome. Window peaks at
# z=22, matching the alcove arch peak so the two arches frame cleanly
# when viewed from the hub.
WINDOW_ARCH_RISE = 4.0
WINDOW_BOTTOM_OFFSET = 2.0
ARCH_TOP_SEGMENTS = 12        # tessellation of the elliptical arc

# Triangle motif relief on the inner wall face — alternating point-up /
# point-down rows. Session 27: motif dialed down (rows 4→2, relief
# 0.18→0.08) to halve the prism geometry that was crossing the per-frame
# vert budget. The brass material on the motif still reads as gold
# Wakandan etching; just less of it.
MOTIF_ROWS = 2
MOTIF_TRIANGLES_PER_SECTION = 6
MOTIF_TRIANGLE_HEIGHT = 1.4   # vertical edge of each equilateral
MOTIF_RELIEF = 0.08           # was 0.18 — back to subtle relief

# Brass frame around each window — thin pillars + arched lintel.
FRAME_WIDTH = 0.35
FRAME_DEPTH = 0.55


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


def _make_box(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    rotation_z_deg: float = 0.0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    if rotation_z_deg != 0.0:
        obj.rotation_euler[2] = math.radians(rotation_z_deg)
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


def _apply_modifier(obj: bpy.types.Object, name: str) -> None:
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=name)


def _build_cylinder_ring(
    radius: float,
    thickness: float,
    height: float,
    segments: int = 96,
) -> bpy.types.Object:
    """Build a hollow cylinder ring as one mesh: outer + inner cylinder
    surfaces joined by top + bottom rings. Z=0 at the floor; +Z up."""
    mesh = bpy.data.meshes.new(SLAB_NAME + "-mesh")
    obj = bpy.data.objects.new(SLAB_NAME, mesh)
    bpy.context.scene.collection.objects.link(obj)

    outer_r = radius
    inner_r = radius - thickness

    bm = bmesh.new()
    outer_bot, outer_top, inner_bot, inner_top = [], [], [], []
    for i in range(segments):
        a = (i / segments) * math.pi * 2
        cos_a, sin_a = math.cos(a), math.sin(a)
        outer_bot.append(bm.verts.new((cos_a * outer_r, sin_a * outer_r, 0.0)))
        outer_top.append(bm.verts.new((cos_a * outer_r, sin_a * outer_r, height)))
        inner_bot.append(bm.verts.new((cos_a * inner_r, sin_a * inner_r, 0.0)))
        inner_top.append(bm.verts.new((cos_a * inner_r, sin_a * inner_r, height)))

    for i in range(segments):
        j = (i + 1) % segments
        # Outer face (normal points outward, +radial)
        bm.faces.new([outer_bot[i], outer_top[i], outer_top[j], outer_bot[j]])
        # Inner face (normal points inward, -radial)
        bm.faces.new([inner_bot[i], inner_bot[j], inner_top[j], inner_top[i]])
        # Top cap
        bm.faces.new([outer_top[i], inner_top[i], inner_top[j], outer_top[j]])
        # Bottom cap
        bm.faces.new([outer_bot[i], outer_bot[j], inner_bot[j], inner_bot[i]])
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    return obj


def _build_window_cutter(
    angle_deg: float,
    width: float,
    rect_height: float,
    arch_rise: float,
    bottom_offset: float,
    radius: float,
    thickness: float,
    name: str,
) -> bpy.types.Object:
    """Build a solid prism shaped like the rounded-arch window opening,
    oriented and positioned so it cuts cleanly through the cylinder wall
    when used with a boolean DIFFERENCE modifier.

    Session 26d: silhouette upgraded from 5-vert pointed pentagon to a
    multi-segment rounded portal — two bottom corners, two side posts
    rising to the spring line, then a half-elliptical arc sweeping over
    the peak. Matches the alcove arch typology so the two read as one
    architectural family.
    """
    mesh = bpy.data.meshes.new(name + "-mesh")
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)

    half_angle = (width / 2) / radius
    a_centre = math.radians(angle_deg)
    a_left = a_centre - half_angle
    a_right = a_centre + half_angle

    # Cutter must extend slightly outside both the outer + inner faces so
    # the boolean cut is clean.
    r_outer = radius + 0.3
    r_inner = radius - thickness - 0.3

    z_bot = bottom_offset
    z_spring = bottom_offset + rect_height

    def vert_at(angle: float, r: float, z: float) -> tuple[float, float, float]:
        return (math.cos(angle) * r, math.sin(angle) * r, z)

    # Silhouette: bottom-left → bottom-right → (arc from right-spring CCW
    # over peak to left-spring). The arc is parametrised t ∈ [0, π]:
    #   angle(t) = a_centre + half_angle * cos(t)
    #   z(t)     = z_spring + arch_rise * sin(t)
    silhouette_pts: list[tuple[float, float]] = [
        (a_left, z_bot),
        (a_right, z_bot),
    ]
    for i in range(ARCH_TOP_SEGMENTS + 1):
        t = math.pi * i / ARCH_TOP_SEGMENTS
        angle = a_centre + half_angle * math.cos(t)
        z = z_spring + arch_rise * math.sin(t)
        silhouette_pts.append((angle, z))

    bm = bmesh.new()
    silhouette_outer = [
        bm.verts.new(vert_at(ang, r_outer, z)) for (ang, z) in silhouette_pts
    ]
    silhouette_inner = [
        bm.verts.new(vert_at(ang, r_inner, z)) for (ang, z) in silhouette_pts
    ]
    # End caps (ngons).
    bm.faces.new(silhouette_outer)
    bm.faces.new(list(reversed(silhouette_inner)))
    # Side quads along the silhouette perimeter.
    n = len(silhouette_pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new(
            [silhouette_outer[i], silhouette_outer[j], silhouette_inner[j], silhouette_inner[i]]
        )
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    return obj


def _build_window_frame(
    angle_deg: float,
    width: float,
    rect_height: float,
    arch_rise: float,
    bottom_offset: float,
    radius: float,
    frame_width: float,
    frame_depth: float,
    name_prefix: str,
) -> list[bpy.types.Object]:
    """Build brass frame pieces around a single window opening: two side
    pillars + a flat lintel just below the arch peak. Frame sits on the
    inner face of the wall (at radius - thickness)."""
    half_angle = (width / 2) / radius
    a_centre = math.radians(angle_deg)
    a_left = a_centre - half_angle
    a_right = a_centre + half_angle

    # Frame inner radius — protrudes a touch beyond the wall's inner face
    # toward the hub so it reads as a raised brass surround.
    r_frame = radius - WALL_THICKNESS - frame_depth / 2 + 0.05

    pieces: list[bpy.types.Object] = []

    # Side pillars — local Z extends from sill (z_bot) up to spring line.
    z_bot = bottom_offset
    z_spring = bottom_offset + rect_height
    pillar_height = rect_height + arch_rise * 0.6

    for label, angle in (("left", a_left), ("right", a_right)):
        loc = (math.cos(angle) * r_frame, math.sin(angle) * r_frame, z_bot + pillar_height / 2)
        # Pillar's long axis along Z, frame width along the arc (tangent),
        # frame depth along the radial. Rotate the box around Z so its
        # local-X axis is tangent to the cylinder at this angle.
        pillar = _make_box(
            f"{name_prefix}-{label}",
            location=loc,
            scale=(frame_width, frame_depth, pillar_height),
            rotation_z_deg=math.degrees(angle) + 90.0,
        )
        pieces.append(pillar)

    # Session 26d: curved arc lintel — series of short brass box segments
    # following the rounded arch outline from spring-right over peak to
    # spring-left. Replaces the old flat transom lintel so the brass
    # framing matches the rounded window typology.
    lintel_segments = 14
    for i in range(lintel_segments):
        t_mid = math.pi * (i + 0.5) / lintel_segments
        angle = a_centre + half_angle * math.cos(t_mid)
        z = z_spring + arch_rise * math.sin(t_mid)
        # Approximate segment chord length on the (angle, z) curve.
        t0 = math.pi * i / lintel_segments
        t1 = math.pi * (i + 1) / lintel_segments
        a0 = a_centre + half_angle * math.cos(t0)
        z0 = z_spring + arch_rise * math.sin(t0)
        a1 = a_centre + half_angle * math.cos(t1)
        z1 = z_spring + arch_rise * math.sin(t1)
        x0, y0 = math.cos(a0) * r_frame, math.sin(a0) * r_frame
        x1, y1 = math.cos(a1) * r_frame, math.sin(a1) * r_frame
        seg_chord = math.hypot(x1 - x0, y1 - y0)
        seg_chord = math.hypot(seg_chord, z1 - z0) + frame_width * 0.3
        # Orientation: tangent direction of arc at the midpoint.
        # In world XY: derivative of (cos(a)*r, sin(a)*r) wrt t with
        # da/dt = -half_angle*sin(t) gives a horizontal tangent direction;
        # vertical tangent is arch_rise*cos(t). Combine for the yaw angle.
        dx = -math.sin(angle) * (-half_angle * math.sin(t_mid)) * r_frame
        dy =  math.cos(angle) * (-half_angle * math.sin(t_mid)) * r_frame
        dz =  arch_rise * math.cos(t_mid)
        # Project tangent into the wall-tangent local frame to get yaw.
        # Simpler: rotate by (angle + π/2) around Z (matches the pillars),
        # then tilt around the local-tangent axis by the arc slope.
        slope = math.atan2(dz, math.hypot(dx, dy))
        loc = (math.cos(angle) * r_frame, math.sin(angle) * r_frame, z)
        seg = _make_box(
            f"{name_prefix}-lintel-{i}",
            location=loc,
            scale=(seg_chord, frame_depth, frame_width),
            rotation_z_deg=math.degrees(angle) + 90.0,
        )
        # Tilt the segment in place so it follows the arc slope. The seg's
        # long axis is local-X (tangent to the cylinder), so we rotate
        # around local-Y (radial-inward) by -slope.
        seg.rotation_euler[1] = -slope
        bpy.context.view_layer.objects.active = seg
        bpy.ops.object.select_all(action="DESELECT")
        seg.select_set(True)
        bpy.ops.object.transform_apply(rotation=True)
        pieces.append(seg)

    return pieces


def _build_triangle_relief(
    angle_centre_deg: float,
    arc_width_rad: float,
    radius: float,
    name_prefix: str,
) -> list[bpy.types.Object]:
    """Generate the Wakandan triangle motif on a single wall section.

    Produces a coarse grid of small triangle prisms attached to the inner
    face of the cylinder wall. Alternating rows are point-up / point-down.
    Kept intentionally coarse (MOTIF_ROWS × MOTIF_TRIANGLES_PER_SECTION) so
    Smart UV Project during the bake pipeline doesn't fragment.
    """
    a_centre = math.radians(angle_centre_deg)
    a_left = a_centre - arc_width_rad / 2
    a_right = a_centre + arc_width_rad / 2

    # Strip occupies the middle band of the wall section vertically.
    band_z_start = WALL_HEIGHT * 0.32
    band_z_end = WALL_HEIGHT * 0.32 + MOTIF_ROWS * MOTIF_TRIANGLE_HEIGHT

    # Inner face of the wall, plus a bit so the relief protrudes inward.
    r_relief = radius - WALL_THICKNESS - MOTIF_RELIEF / 2 + 0.01

    pieces: list[bpy.types.Object] = []
    angular_step = (a_right - a_left) / MOTIF_TRIANGLES_PER_SECTION

    for row in range(MOTIF_ROWS):
        z0 = band_z_start + row * MOTIF_TRIANGLE_HEIGHT
        point_up = row % 2 == 0
        for col in range(MOTIF_TRIANGLES_PER_SECTION):
            a_left_col = a_left + col * angular_step
            a_right_col = a_left_col + angular_step
            a_mid_col = (a_left_col + a_right_col) / 2

            # Triangular prism extruded along the radial direction. Three
            # vertices form a triangle in the wall-tangent plane; the prism
            # has depth MOTIF_RELIEF along the radial axis.
            mesh = bpy.data.meshes.new(f"{name_prefix}-tri-{row}-{col}-mesh")
            obj = bpy.data.objects.new(f"{name_prefix}-tri-{row}-{col}", mesh)
            bpy.context.scene.collection.objects.link(obj)

            def vert(angle: float, z: float, r: float) -> tuple[float, float, float]:
                return (math.cos(angle) * r, math.sin(angle) * r, z)

            r_front = r_relief - MOTIF_RELIEF / 2
            r_back = r_relief + MOTIF_RELIEF / 2

            if point_up:
                # Tip at top centre, base at bottom edges.
                tri_front = [
                    vert(a_left_col, z0, r_front),
                    vert(a_right_col, z0, r_front),
                    vert(a_mid_col, z0 + MOTIF_TRIANGLE_HEIGHT, r_front),
                ]
                tri_back = [
                    vert(a_left_col, z0, r_back),
                    vert(a_right_col, z0, r_back),
                    vert(a_mid_col, z0 + MOTIF_TRIANGLE_HEIGHT, r_back),
                ]
            else:
                # Tip at bottom centre, base at top edges.
                tri_front = [
                    vert(a_left_col, z0 + MOTIF_TRIANGLE_HEIGHT, r_front),
                    vert(a_right_col, z0 + MOTIF_TRIANGLE_HEIGHT, r_front),
                    vert(a_mid_col, z0, r_front),
                ]
                tri_back = [
                    vert(a_left_col, z0 + MOTIF_TRIANGLE_HEIGHT, r_back),
                    vert(a_right_col, z0 + MOTIF_TRIANGLE_HEIGHT, r_back),
                    vert(a_mid_col, z0, r_back),
                ]

            bm = bmesh.new()
            vf = [bm.verts.new(p) for p in tri_front]
            vb = [bm.verts.new(p) for p in tri_back]
            bm.faces.new(vf)
            bm.faces.new(vb[::-1])
            for i in range(3):
                j = (i + 1) % 3
                bm.faces.new([vf[i], vf[j], vb[j], vb[i]])
            bm.normal_update()
            bm.to_mesh(mesh)
            bm.free()
            pieces.append(obj)

    return pieces


def _section_midpoint_and_arc(
    window_angles_deg: list[float],
    i: int,
) -> tuple[float, float]:
    """Compute the midpoint angle (degrees) and arc width (radians) of the
    wall section between windows[i] and windows[i+1]. Wraps at i = last."""
    n = len(window_angles_deg)
    a = math.radians(window_angles_deg[i])
    b = math.radians(window_angles_deg[(i + 1) % n])
    delta = b - a
    if delta <= 0:
        delta += 2 * math.pi
    mid = a + delta / 2

    # Subtract the window's half-angles from the section arc width so the
    # triangle motif stays away from the window openings.
    half_angle = (WINDOW_WIDTH_M / 2) / WALL_RADIUS
    usable_arc = max(delta - 2 * half_angle - 0.2, 0.0)
    return math.degrees(mid) % 360, usable_arc


def build_outer_wall() -> tuple[bpy.types.Object, bpy.types.Object]:
    """Build the cylindrical outer enclosing wall + 6 brass window frames.

    Returns the two named meshes the React side mounts: ``hub-outer-wall-slab``
    and ``hub-outer-wall-frame``.
    """
    _remove_if_exists(SLAB_NAME, FRAME_NAME)
    hub = _get_or_create_collection(HUB_COLLECTION)

    # --- Build the base cylinder ring -----------------------------------
    slab = _build_cylinder_ring(
        radius=WALL_RADIUS,
        thickness=WALL_THICKNESS,
        height=WALL_HEIGHT,
    )

    # --- Subtract 6 window cutters via boolean modifiers ----------------
    cutters: list[bpy.types.Object] = []
    for i, a_deg in enumerate(WINDOW_ANGLES_DEG):
        cutter = _build_window_cutter(
            angle_deg=a_deg,
            width=WINDOW_WIDTH_M,
            rect_height=WINDOW_RECT_HEIGHT,
            arch_rise=WINDOW_ARCH_RISE,
            bottom_offset=WINDOW_BOTTOM_OFFSET,
            radius=WALL_RADIUS,
            thickness=WALL_THICKNESS,
            name=f"outer-wall-cutter-{i}",
        )
        cutters.append(cutter)
        mod_name = f"WindowCut{i}"
        boolean = slab.modifiers.new(name=mod_name, type="BOOLEAN")
        boolean.operation = "DIFFERENCE"
        boolean.object = cutter
        boolean.solver = "EXACT"
        _apply_modifier(slab, mod_name)

    # Clean up cutters now that they've been applied.
    for cutter in cutters:
        bpy.data.objects.remove(cutter, do_unlink=True)

    slab.name = SLAB_NAME
    _move_to_collection(slab, hub)

    # --- Triangle motif on each wall section ----------------------------
    # Session 26d: motif joined into the FRAME mesh instead of the slab
    # so it inherits the brass material (gold-on-dark Wakandan etching).
    motif_pieces: list[bpy.types.Object] = []
    for i in range(len(WINDOW_ANGLES_DEG)):
        mid_deg, usable_arc = _section_midpoint_and_arc(WINDOW_ANGLES_DEG, i)
        if usable_arc <= 0:
            continue
        motif_pieces.extend(
            _build_triangle_relief(
                angle_centre_deg=mid_deg,
                arc_width_rad=usable_arc,
                radius=WALL_RADIUS,
                name_prefix=f"outer-wall-motif-{i}",
            )
        )

    # --- Brass window frames --------------------------------------------
    frame_pieces: list[bpy.types.Object] = []
    for i, a_deg in enumerate(WINDOW_ANGLES_DEG):
        frame_pieces.extend(
            _build_window_frame(
                angle_deg=a_deg,
                width=WINDOW_WIDTH_M,
                rect_height=WINDOW_RECT_HEIGHT,
                arch_rise=WINDOW_ARCH_RISE,
                bottom_offset=WINDOW_BOTTOM_OFFSET,
                radius=WALL_RADIUS,
                frame_width=FRAME_WIDTH,
                frame_depth=FRAME_DEPTH,
                name_prefix=f"outer-wall-frame-{i}",
            )
        )

    frame = _join_pieces(frame_pieces + motif_pieces, FRAME_NAME)
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
    slab, frame = build_outer_wall()

    _select_only(slab, frame)
    export_path = export_glb(
        "blender/exports/hub-outer-wall.glb",
        selection_only=True,
    )
    staged = stage_to_public(str(export_path))

    print(f"  slab : verts={len(slab.data.vertices)} faces={len(slab.data.polygons)}")
    print(f"  frame: verts={len(frame.data.vertices)} faces={len(frame.data.polygons)}")
    print(f"  exported  → {export_path}")
    print(f"  staged at → {staged}")


if __name__ == "__main__":
    main()
