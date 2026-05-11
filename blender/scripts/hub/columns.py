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

CEILING_HEIGHT = 5.5  # mirrors HALL_CEILING_HEIGHT in src/landing/sections.ts


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


def build_column(
    base_height: float = 0.4,
    base_radius: float = 0.42,
    base_bevel: float = 0.025,
    shaft_radius_bottom: float = 0.36,
    shaft_radius_top: float = 0.28,
    capital_height: float = 0.7,
    capital_radius: float = 0.46,
    capital_bevel: float = 0.05,
    ceiling_height: float = CEILING_HEIGHT,
    sides: int = 6,
) -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    """Build a single brass column at the origin: base + tapered shaft + capital.

    Idempotent — removes any prior column objects before building. All three
    pieces land in the ``Hub`` collection.
    """
    _remove_if_exists(BASE_NAME, SHAFT_NAME, CAPITAL_NAME)
    hub = _get_or_create_collection(HUB_COLLECTION)

    shaft_height = ceiling_height - base_height - capital_height
    if shaft_height <= 0:
        raise ValueError(
            f"shaft_height={shaft_height} must be > 0 — "
            "increase ceiling_height or shrink base/capital"
        )

    # --- Base -------------------------------------------------------------
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=sides,
        radius=base_radius,
        depth=base_height,
        location=(0, 0, base_height / 2),
    )
    base = bpy.context.active_object
    base.name = BASE_NAME
    _apply_z_rotation(base, 30.0)
    bevel_b = base.modifiers.new(name="EdgeBevel", type="BEVEL")
    bevel_b.width = base_bevel
    bevel_b.segments = 2
    bevel_b.limit_method = "ANGLE"
    bevel_b.angle_limit = math.radians(30)
    _move_to_collection(base, hub)

    # --- Shaft ------------------------------------------------------------
    shaft = _build_shaft(
        z_bottom=base_height,
        z_top=base_height + shaft_height,
        radius_bottom=shaft_radius_bottom,
        radius_top=shaft_radius_top,
        sides=sides,
        rotation_deg=30.0,
    )
    _move_to_collection(shaft, hub)

    # --- Capital ----------------------------------------------------------
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=sides,
        radius=capital_radius,
        depth=capital_height,
        location=(0, 0, base_height + shaft_height + capital_height / 2),
    )
    capital = bpy.context.active_object
    capital.name = CAPITAL_NAME
    _apply_z_rotation(capital, 30.0)
    bevel_c = capital.modifiers.new(name="EdgeBevel", type="BEVEL")
    bevel_c.width = capital_bevel
    bevel_c.segments = 3
    bevel_c.limit_method = "ANGLE"
    bevel_c.angle_limit = math.radians(30)
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
