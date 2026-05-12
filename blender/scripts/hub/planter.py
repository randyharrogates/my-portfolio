"""Hub central planter — Phase 2.5 take-2 deliverable.

A chunky octagonal brass-rimmed stone planter at the hub centre, sitting
directly on top of the floor inlay disc. Replaces the empty centre with a
focal anchor: from the orbiting camera, the eye now lands on the planter
silhouette against the floor-glow rings, instead of drifting across an
empty floor.

Two named meshes per glb:

- ``hub-planter-base``  — squat octagonal stone shell (the pot body).
- ``hub-planter-rim``   — brass-emissive ring at the top edge.

The planter sits at the hub centre (0,0,0 in Blender → 0,0,0 in three.js
after axis swap). Top rim z = 0.55 m, well below the camera's 4 m eye
height so the planter reads as a feature on the floor, not an obstruction.

Run headless::

    blender -b -P blender/scripts/hub/planter.py
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
BASE_NAME = "hub-planter-base"
RIM_NAME = "hub-planter-rim"

OUTER_RADIUS = 2.90   # Session 20: 2× re-scale (was 1.45)
INNER_RADIUS = 2.20   # was 1.10 — bowl cavity
HEIGHT = 1.10         # was 0.55
RIM_THICKNESS = 0.12  # was 0.06
RIM_HEIGHT = 0.16     # was 0.08
SIDES = 8


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


def _build_octagonal_pot(
    name: str,
    outer_radius: float,
    inner_radius: float,
    height: float,
    sides: int,
) -> bpy.types.Object:
    """Octagonal pot via bmesh — outer wall + bevel-flared base + inner
    bowl cavity. One closed-volume mesh (no open faces) so AO bakes cleanly.
    """
    mesh = bpy.data.meshes.new(name + "-mesh")
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)

    bm = bmesh.new()
    # Outer + inner rings at z=0 (base) and z=height (top).
    outer_bot, outer_top, inner_bot, inner_top = [], [], [], []
    for i in range(sides):
        a = (i / sides) * math.pi * 2
        cos_a, sin_a = math.cos(a), math.sin(a)
        outer_bot.append(bm.verts.new((cos_a * outer_radius, sin_a * outer_radius, 0)))
        outer_top.append(bm.verts.new((cos_a * outer_radius, sin_a * outer_radius, height)))
        inner_bot.append(bm.verts.new((cos_a * inner_radius, sin_a * inner_radius, 0.08)))
        inner_top.append(bm.verts.new((cos_a * inner_radius, sin_a * inner_radius, height)))

    for i in range(sides):
        j = (i + 1) % sides
        # Outer wall
        bm.faces.new([outer_bot[i], outer_bot[j], outer_top[j], outer_top[i]])
        # Inner wall (reversed for inward-facing normal)
        bm.faces.new([inner_top[i], inner_top[j], inner_bot[j], inner_bot[i]])
        # Top annulus (between outer and inner top)
        bm.faces.new([outer_top[i], outer_top[j], inner_top[j], inner_top[i]])
        # Bottom annulus (the pot's outer rim sitting on the floor)
        bm.faces.new([outer_bot[i], inner_bot[i], inner_bot[j], outer_bot[j]])
    # Cap the bowl bottom (interior floor of the pot, slightly above base)
    bm.faces.new(inner_bot)

    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    return obj


def _build_octagonal_rim(
    name: str,
    outer_radius: float,
    rim_thickness: float,
    rim_height: float,
    sides: int,
    z_base: float,
) -> bpy.types.Object:
    """Thin octagonal brass collar sitting on top of the planter outer edge."""
    mesh = bpy.data.meshes.new(name + "-mesh")
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)

    bm = bmesh.new()
    inner_r = outer_radius - rim_thickness
    outer_bot, outer_top, inner_bot, inner_top = [], [], [], []
    for i in range(sides):
        a = (i / sides) * math.pi * 2
        cos_a, sin_a = math.cos(a), math.sin(a)
        outer_bot.append(bm.verts.new((cos_a * outer_radius, sin_a * outer_radius, z_base)))
        outer_top.append(bm.verts.new((cos_a * outer_radius, sin_a * outer_radius, z_base + rim_height)))
        inner_bot.append(bm.verts.new((cos_a * inner_r, sin_a * inner_r, z_base)))
        inner_top.append(bm.verts.new((cos_a * inner_r, sin_a * inner_r, z_base + rim_height)))

    for i in range(sides):
        j = (i + 1) % sides
        bm.faces.new([outer_bot[i], outer_bot[j], outer_top[j], outer_top[i]])
        bm.faces.new([inner_top[i], inner_top[j], inner_bot[j], inner_bot[i]])
        bm.faces.new([outer_top[i], outer_top[j], inner_top[j], inner_top[i]])
        bm.faces.new([outer_bot[i], inner_bot[i], inner_bot[j], outer_bot[j]])

    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    return obj


def build_planter(
    outer_radius: float = OUTER_RADIUS,
    inner_radius: float = INNER_RADIUS,
    height: float = HEIGHT,
    rim_thickness: float = RIM_THICKNESS,
    rim_height: float = RIM_HEIGHT,
    sides: int = SIDES,
) -> tuple[bpy.types.Object, bpy.types.Object]:
    """Build the planter base + rim. Idempotent."""
    _remove_if_exists(BASE_NAME, RIM_NAME)
    hub = _get_or_create_collection(HUB_COLLECTION)

    base = _build_octagonal_pot(BASE_NAME, outer_radius, inner_radius, height, sides)
    bevel = base.modifiers.new(name="EdgeBevel", type="BEVEL")
    bevel.width = 0.02
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(30)
    _move_to_collection(base, hub)

    rim = _build_octagonal_rim(
        RIM_NAME, outer_radius, rim_thickness, rim_height, sides, height
    )
    _move_to_collection(rim, hub)

    return base, rim


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
    base, rim = build_planter()

    _select_only(base, rim)
    export_path = export_glb(
        "blender/exports/hub-planter.glb",
        selection_only=True,
    )
    staged = stage_to_public(str(export_path))

    print(f"  base : verts={len(base.data.vertices)} faces={len(base.data.polygons)}")
    print(f"  rim  : verts={len(rim.data.vertices)} faces={len(rim.data.polygons)}")
    print(f"  exported  → {export_path}")
    print(f"  staged at → {staged}")


if __name__ == "__main__":
    main()
