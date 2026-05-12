"""Alcove archway — Session 26 rebuild (Wakandan cathedral typology).

Replaces the Session 17 "pointed-pentagon + hex-tracery" arch with a
rounded-top portal + vertical mullion bars, matching the canonical
Hall of Zero Limits reference (Marvel/Sprite Wakandan cathedral):

::

                  .--------------.            ← elliptical arch top
                /                  \\
              /     (open arch)      \\
            /                          \\
          /                              \\
        +--+--+--+--+--+--+--+--+--+--+    ← shoulder line (y = SHOULDER)
        |  |  |  |    open    |  |  |  |
        |  |  |  |   passage  |  |  |  |
        |  ↑  ↑  ↑            ↑  ↑  ↑  |    ← 3 vertical mullion bars
        |  |  |  |            |  |  |  |
        +--+--+--+------------+--+--+--+    ← floor (y = 0)
       (-w/2)                          (+w/2)

Two named meshes per glb (contract unchanged from Session 17 so the
React-side ``Alcove.tsx`` keeps loading the same names):

- ``alcove-arch-frame``   — slim brass portal outline: two vertical
                             posts + semi-elliptical arch cap.
- ``alcove-arch-tracery`` — three vertical mullion bars running
                             floor → shoulder (no hex; cathedral style).

The arch outline is now ~1.8× taller than wide at the shoulder (vs.
the previous 1:1 cottage square) so the alcoves read as ceremonial
portal openings rather than peaked huts. The mullions sit BEHIND the
frame plane so the brass outline reads clean from the hub.

Same `+Y opens to hub` convention — `Alcove.tsx` wraps in a
``<group rotation={[0, Math.PI, 0]}>`` after the glTF Y-up axis swap.

Run headless::

    blender -b -P blender/scripts/alcoves/projects-arch.py
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

ALCOVE_COLLECTION = "Alcove"
FRAME_NAME = "alcove-arch-frame"
TRACERY_NAME = "alcove-arch-tracery"

# Outline dimensions — keep width matched to the alcove pavilion shell
# (16 m at Session 20 scale) but raise the shoulder so vertical walls
# dominate before the elliptical cap, giving cathedral proportions.
ARCH_WIDTH = 16.0
# Session 26d: taller proportions for cathedral feel (1:1.375 vs 1:1.125).
# Width held at 16 so outer-wall windows + alcove content layouts stay
# valid; only the vertical dimensions grow.
ARCH_HEIGHT = 22.0            # was 18 — taller cathedral peak
ARCH_SHOULDER_HEIGHT = 14.0   # vertical posts run 0 → 14; arch caps top 8 m
ARCH_DEPTH = 0.50             # was 0.80 — slimmer profile
FRAME_THICKNESS = 0.45        # was 0.80 — slimmer brass

# Arch top — semi-elliptical (semi-major = half_w, semi-minor = arch height).
ARCH_TOP_SEGMENTS = 24        # tessellation of the elliptical arc

# Mullion bars in the lower portal (cathedral style — 3 bars → 4 panes).
MULLION_COUNT = 3
MULLION_THICKNESS = 0.20
MULLION_DEPTH = 0.30          # sits just behind the frame plane

# Impost cornice — horizontal brass band at the arch shoulder that ties
# the shell cornice line into the springing of the rounded arch top.
# Sits proud of the frame plane so it reads as a cathedral impost detail.
IMPOST_OVERHANG = 0.6         # extends past the portal width on each side
IMPOST_HEIGHT = 0.55          # vertical thickness of the band
IMPOST_DEPTH = 0.85           # proud of the wall plane (front-to-back)

ARCH_Y_CENTER = 0.0


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


def _build_outline_curve(
    half_w: float,
    shoulder_h: float,
    total_h: float,
    segments: int,
) -> list[tuple[float, float, float]]:
    """Outline of the portal in the XZ plane at Y=0.

    Starts at (-half_w, 0), runs up the left post, sweeps over a
    semi-elliptical top (semi-major = half_w, semi-minor = total_h -
    shoulder_h), back down the right post, and closes implicitly when
    the face is created from the vertex list.
    """
    pts: list[tuple[float, float, float]] = []
    # Left post — bottom to shoulder.
    pts.append((-half_w, 0.0, 0.0))
    pts.append((-half_w, 0.0, shoulder_h))
    # Elliptical arc from (-half_w, shoulder) over (0, total_h) to (half_w, shoulder).
    # Parametrise t in [pi, 0]: x = -half_w * cos(t), z = shoulder + (total_h - shoulder) * sin(t).
    arc_h = total_h - shoulder_h
    for i in range(1, segments):
        t = math.pi - (math.pi * i / segments)
        x = -half_w * math.cos(t)
        z = shoulder_h + arc_h * math.sin(t)
        pts.append((x, 0.0, z))
    # Right post — shoulder to bottom.
    pts.append((half_w, 0.0, shoulder_h))
    pts.append((half_w, 0.0, 0.0))
    return pts


def _build_frame(
    width: float,
    total_h: float,
    shoulder_h: float,
    frame_thickness: float,
    depth: float,
) -> bpy.types.Object:
    """Rounded-top portal frame — slim brass outline + impost cornice.

    Constructs the outline as a single ngon, insets to leave a frame
    strip, extrudes along Y for chunk. Then adds a horizontal impost
    band at the shoulder height that ties the arch springing into the
    shell cornice line. Both pieces are joined into the single
    `alcove-arch-frame` mesh so the React side keeps loading one name.
    """
    half_w = width / 2.0
    outline = _build_outline_curve(half_w, shoulder_h, total_h, ARCH_TOP_SEGMENTS)

    mesh = bpy.data.meshes.new(FRAME_NAME + "_mesh")
    obj = bpy.data.objects.new(FRAME_NAME, mesh)
    bpy.context.scene.collection.objects.link(obj)
    mesh.from_pydata(outline, [], [list(range(len(outline)))])
    mesh.update()

    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)

    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.inset(thickness=frame_thickness)
    bpy.ops.mesh.delete(type="FACE")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.extrude_region_move(
        TRANSFORM_OT_translate={"value": (0.0, depth, 0.0)}
    )
    bpy.ops.object.mode_set(mode="OBJECT")

    obj.location.y = -depth / 2.0 + ARCH_Y_CENTER
    bpy.ops.object.transform_apply(location=True)

    bevel = obj.modifiers.new(name="EdgeBevel", type="BEVEL")
    bevel.width = 0.025
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(30)
    bpy.ops.object.modifier_apply(modifier=bevel.name)

    # Impost cornice — horizontal brass band proud of the wall plane.
    impost_w = width + 2 * IMPOST_OVERHANG
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, shoulder_h))
    impost = bpy.context.active_object
    impost.name = FRAME_NAME + "_impost"
    impost.scale = (impost_w, IMPOST_DEPTH, IMPOST_HEIGHT)
    bpy.ops.object.transform_apply(scale=True)
    impost_bevel = impost.modifiers.new(name="ImpostBevel", type="BEVEL")
    impost_bevel.width = 0.05
    impost_bevel.segments = 2
    impost_bevel.limit_method = "ANGLE"
    impost_bevel.angle_limit = math.radians(30)
    bpy.ops.object.modifier_apply(modifier=impost_bevel.name)

    # Join impost into the frame mesh.
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    impost.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.join()
    # The join preserves obj's name; impost geometry is now merged in.

    return obj


def _build_tracery(
    width: float,
    shoulder_h: float,
    frame_thickness: float,
    depth: float,
) -> bpy.types.Object:
    """Vertical mullion bars in the lower portal.

    Three slim brass bars dividing the lower window into four panes,
    each running from the floor to the shoulder line. The bars are
    centred on the frame plane (Y=0) so they plug into the brass
    outline without z-fighting.
    """
    half_w = width / 2.0
    interior_w = width - 2 * frame_thickness
    spacing = interior_w / (MULLION_COUNT + 1)
    bar_h = shoulder_h - 0.05
    bar_w = MULLION_THICKNESS
    bar_d = MULLION_DEPTH

    verts: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    for i in range(MULLION_COUNT):
        x_c = -half_w + frame_thickness + spacing * (i + 1)
        x0, x1 = x_c - bar_w / 2.0, x_c + bar_w / 2.0
        y0, y1 = -bar_d / 2.0, bar_d / 2.0
        z0, z1 = 0.0, bar_h
        base = len(verts)
        verts.extend([
            (x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),  # bottom
            (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1),  # top
        ])
        # 6 quad faces — outward winding.
        b = base
        faces.extend([
            (b + 0, b + 1, b + 2, b + 3),  # bottom (-Z)
            (b + 4, b + 7, b + 6, b + 5),  # top    (+Z)
            (b + 0, b + 4, b + 5, b + 1),  # front  (-Y)
            (b + 1, b + 5, b + 6, b + 2),  # right  (+X)
            (b + 2, b + 6, b + 7, b + 3),  # back   (+Y)
            (b + 3, b + 7, b + 4, b + 0),  # left   (-X)
        ])

    mesh = bpy.data.meshes.new(TRACERY_NAME + "_mesh")
    obj = bpy.data.objects.new(TRACERY_NAME, mesh)
    bpy.context.scene.collection.objects.link(obj)
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    # Subtle bevel for highlight catch on the slim bars.
    bevel = obj.modifiers.new(name="EdgeBevel", type="BEVEL")
    bevel.width = 0.015
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(35)

    return obj


def build_arch(
    width: float = ARCH_WIDTH,
    height: float = ARCH_HEIGHT,
    shoulder_height: float = ARCH_SHOULDER_HEIGHT,
    frame_thickness: float = FRAME_THICKNESS,
    depth: float = ARCH_DEPTH,
) -> tuple[bpy.types.Object, bpy.types.Object]:
    """Build the alcove arch (frame + mullion tracery) at the origin. Idempotent."""
    _remove_if_exists(FRAME_NAME, TRACERY_NAME)
    alcove = _get_or_create_collection(ALCOVE_COLLECTION)

    frame = _build_frame(width, height, shoulder_height, frame_thickness, depth)
    _move_to_collection(frame, alcove)

    tracery = _build_tracery(width, shoulder_height, frame_thickness, depth)
    _move_to_collection(tracery, alcove)

    return frame, tracery


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
    frame, tracery = build_arch()

    _select_only(frame, tracery)
    export_path = export_glb(
        "blender/exports/alcove-arch.glb",
        selection_only=True,
    )
    staged = stage_to_public(str(export_path))

    print(f"  frame  : verts={len(frame.data.vertices)} faces={len(frame.data.polygons)}")
    print(f"  tracery: verts={len(tracery.data.vertices)} faces={len(tracery.data.polygons)}")
    print(f"  exported  → {export_path}")
    print(f"  staged at → {staged}")


if __name__ == "__main__":
    main()
