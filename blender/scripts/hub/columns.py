"""Hub columns — Phase 2 Session 2 deliverable.

One column built at the origin (base centre at z=0, capital top at z=5.5m
matching ``HALL_CEILING_HEIGHT``). The React side instantiates this glb six
times at the hex-floor's edge-midpoint angles so each column flanks two
adjacent alcove openings rather than blocking either of them.

Run headless to (re)build geometry + export glb + stage into public/:

    blender -b -P blender/scripts/hub/columns.py

Run live via MCP from Claude Code: just exec the file contents inside the
existing scene — ``build_column()`` will tear down any prior pieces.
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
BASE_NAME = "hub-column-base"
SHAFT_NAME = "hub-column-shaft"
CAPITAL_NAME = "hub-column-capital"

CEILING_HEIGHT = 28.0  # mirrors HALL_CEILING_HEIGHT in src/landing/sections.ts
                        # (Session 20 re-scale: 14 → 28 — open-plaza height)


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


def _apply_z_rotation(obj: bpy.types.Object, degrees: float) -> None:
    obj.rotation_euler[2] = math.radians(degrees)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.transform_apply(rotation=True)


def _build_shaft(
    z_bottom: float,
    z_top: float,
    radius_bottom: float,
    radius_top: float,
    sides: int = 6,
    rotation_deg: float = 30.0,
) -> bpy.types.Object:
    """Build a tapered n-gon prism via bmesh. Bridges two n-gon rings."""
    mesh = bpy.data.meshes.new(SHAFT_NAME + "-mesh")
    obj = bpy.data.objects.new(SHAFT_NAME, mesh)
    bpy.context.scene.collection.objects.link(obj)

    bm = bmesh.new()
    verts_bottom = []
    verts_top = []
    for i in range(sides):
        a = (i / sides) * math.pi * 2 + math.radians(rotation_deg)
        vb = bm.verts.new(
            (math.cos(a) * radius_bottom, math.sin(a) * radius_bottom, z_bottom)
        )
        vt = bm.verts.new(
            (math.cos(a) * radius_top, math.sin(a) * radius_top, z_top)
        )
        verts_bottom.append(vb)
        verts_top.append(vt)
    for i in range(sides):
        j = (i + 1) % sides
        bm.faces.new(
            [verts_bottom[i], verts_bottom[j], verts_top[j], verts_top[i]]
        )
    # bottom face (reversed for outward normal), top face
    bm.faces.new(verts_bottom[::-1])
    bm.faces.new(verts_top)
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    return obj


def _make_tier(
    name: str,
    z_base: float,
    height: float,
    radius: float,
    rotation_deg: float,
    sides: int = 6,
) -> bpy.types.Object:
    """One n-gon prism at a given height + rotation. Used by the tiered base
    and capital builders below. Object is left in the scene un-collected so
    the caller can join + collect."""
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=sides,
        radius=radius,
        depth=height,
        location=(0, 0, z_base + height / 2),
    )
    obj = bpy.context.active_object
    obj.name = name
    if rotation_deg != 0:
        _apply_z_rotation(obj, rotation_deg)
    return obj


def _join_pieces(pieces: list[bpy.types.Object], final_name: str) -> bpy.types.Object:
    """Join multiple objects into the first one; rename the result. Pieces
    after [0] are consumed (removed from scene)."""
    bpy.ops.object.select_all(action="DESELECT")
    for p in pieces:
        p.select_set(True)
    bpy.context.view_layer.objects.active = pieces[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = final_name
    return joined


# Tiered ornament profiles — five layers per part with alternating
# 30°/0° rotation between layers, giving a stepped silhouette that reads
# as carved ornament. Tuples are (z_offset_from_part_base, height, radius,
# rotation_deg). Phase 9 reference realignment: slimmed to match the new
# 0.80→0.60 shaft and 8-sided cross-section. Base sum = 1.6 (matches
# base_height); capital sum = 1.8 (matches capital_height). Max radii kept
# to ~1.5× shaft radius so the column reads as a sentinel post, not a
# bulky pillar.
BASE_TIER_PROFILE: list[tuple[float, float, float, float]] = [
    (0.00, 0.32, 1.20, 22.5),   # plinth — wide flat foot
    (0.32, 0.28, 1.04, 0.0),    # lower torus (alt rotation)
    (0.60, 0.32, 0.96, 22.5),   # middle
    (0.92, 0.28, 1.04, 0.0),    # upper torus (alt rotation)
    (1.20, 0.40, 0.80, 22.5),   # apophyge — transitions to shaft bottom radius
]
CAPITAL_TIER_PROFILE: list[tuple[float, float, float, float]] = [
    (0.00, 0.30, 0.60, 22.5),   # neck — transitions from shaft top radius
    (0.30, 0.32, 0.88, 0.0),    # lower band (alt rotation)
    (0.62, 0.46, 0.78, 22.5),   # echinus — narrower middle
    (1.08, 0.38, 0.98, 0.0),    # upper band (alt rotation)
    (1.46, 0.34, 1.10, 22.5),   # abacus — top slab
]


def build_column(
    base_height: float = 1.6,
    shaft_radius_bottom: float = 0.80,
    shaft_radius_top: float = 0.60,
    capital_height: float = 1.8,
    ornament_bevel: float = 0.08,
    ceiling_height: float = CEILING_HEIGHT,
    sides: int = 8,
) -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    """Build a single brass column at the origin: ornamented tiered base +
    tapered shaft + ornamented tiered capital.

    Idempotent — removes any prior column objects before building. All three
    pieces land in the ``Hub`` collection. The base and capital are each
    built as a stack of five hex tiers with alternating 30°/0° rotation,
    then joined into a single mesh per part so the React side keeps the
    three-named-mesh contract: ``hub-column-{base,shaft,capital}``.
    """
    _remove_if_exists(BASE_NAME, SHAFT_NAME, CAPITAL_NAME)
    hub = _get_or_create_collection(HUB_COLLECTION)

    shaft_height = ceiling_height - base_height - capital_height
    if shaft_height <= 0:
        raise ValueError(
            f"shaft_height={shaft_height} must be > 0 — "
            "increase ceiling_height or shrink base/capital"
        )

    # --- Base (5-tier stack joined) --------------------------------------
    base_pieces = [
        _make_tier(f"base-tier-{i}", z_off, h, r, rot, sides=sides)
        for i, (z_off, h, r, rot) in enumerate(BASE_TIER_PROFILE)
    ]
    base = _join_pieces(base_pieces, BASE_NAME)
    bevel_b = base.modifiers.new(name="EdgeBevel", type="BEVEL")
    bevel_b.width = ornament_bevel
    bevel_b.segments = 2
    bevel_b.limit_method = "ANGLE"
    bevel_b.angle_limit = math.radians(25)
    _move_to_collection(base, hub)

    # --- Shaft ------------------------------------------------------------
    shaft = _build_shaft(
        z_bottom=base_height,
        z_top=base_height + shaft_height,
        radius_bottom=shaft_radius_bottom,
        radius_top=shaft_radius_top,
        sides=sides,
        # Half-face offset so the shaft aligns with the rotated base+capital
        # tiers above and below. 6 sides → 30°; 8 sides → 22.5°.
        rotation_deg=(360.0 / sides) / 2.0,
    )
    _move_to_collection(shaft, hub)

    # --- Capital (5-tier stack joined, sitting on top of the shaft) -------
    shaft_top_z = base_height + shaft_height
    capital_pieces = [
        _make_tier(
            f"capital-tier-{i}",
            shaft_top_z + z_off,
            h,
            r,
            rot,
            sides=sides,
        )
        for i, (z_off, h, r, rot) in enumerate(CAPITAL_TIER_PROFILE)
    ]
    capital = _join_pieces(capital_pieces, CAPITAL_NAME)
    bevel_c = capital.modifiers.new(name="EdgeBevel", type="BEVEL")
    bevel_c.width = ornament_bevel + 0.005  # capital edges slightly more pronounced
    bevel_c.segments = 2
    bevel_c.limit_method = "ANGLE"
    bevel_c.angle_limit = math.radians(25)
    _move_to_collection(capital, hub)

    return base, shaft, capital


def _reset_scene() -> None:
    """Headless-mode scene reset — wipe everything to a clean slate."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def _select_only(*objs: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objs:
        obj.select_set(True)
    if objs:
        bpy.context.view_layer.objects.active = objs[0]


def main() -> None:
    _reset_scene()
    base, shaft, capital = build_column()

    _select_only(base, shaft, capital)
    export_path = export_glb(
        "blender/exports/hub-column.glb",
        selection_only=True,
    )
    staged = stage_to_public(str(export_path))

    print(f"  base   : verts={len(base.data.vertices)} faces={len(base.data.polygons)}")
    print(f"  shaft  : verts={len(shaft.data.vertices)} faces={len(shaft.data.polygons)}")
    print(f"  capital: verts={len(capital.data.vertices)} faces={len(capital.data.polygons)}")
    print(f"  exported  → {export_path}")
    print(f"  staged at → {staged}")


if __name__ == "__main__":
    main()
