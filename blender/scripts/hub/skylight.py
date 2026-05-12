"""Hub skylight aperture — Phase 2 Session 6 deliverable (asset 2.6).

A hex skylight aperture built at the origin facing +Z. The React side
mounts it at the dome-base level (``y = HALL_CEILING_HEIGHT + 0.05``)
rotated so its disc faces downward into the hub — this position is also
the spawn point of the volumetric god-ray cone in ``Atmosphere.tsx``,
so the aperture and the ray emit visually from the same point.

Two named meshes per glb:

- ``hub-skylight-ring`` — hex "donut": outer + inner hex rings bridged
                          into a flat brass collar.
- ``hub-skylight-disc`` — flat emissive hex polygon sitting just below
                          the ring's top face — the actual glow source.

Run headless:

    blender -b -P blender/scripts/hub/skylight.py
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
RING_NAME = "hub-skylight-ring"
DISC_NAME = "hub-skylight-disc"

OUTER_RADIUS = 2.90  # Session 20: 2× re-scale (was 1.45)
INNER_RADIUS = 2.10  # was 1.05
RING_THICKNESS = 0.28  # was 0.14
DISC_RADIUS = 1.90   # slightly smaller than INNER_RADIUS for clean nesting (was 0.95)


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


def _build_hex_ring(
    name: str,
    outer_radius: float,
    inner_radius: float,
    thickness: float,
    rotation_deg: float = 30.0,
) -> bpy.types.Object:
    """Build a flat hex donut (annulus) via bmesh."""
    mesh = bpy.data.meshes.new(name + "-mesh")
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)

    bm = bmesh.new()
    top_outer, top_inner, bot_outer, bot_inner = [], [], [], []
    for i in range(6):
        a = i * math.pi / 3 + math.radians(rotation_deg)
        cos_a, sin_a = math.cos(a), math.sin(a)
        top_outer.append(bm.verts.new((cos_a * outer_radius, sin_a * outer_radius, thickness / 2)))
        top_inner.append(bm.verts.new((cos_a * inner_radius, sin_a * inner_radius, thickness / 2)))
        bot_outer.append(bm.verts.new((cos_a * outer_radius, sin_a * outer_radius, -thickness / 2)))
        bot_inner.append(bm.verts.new((cos_a * inner_radius, sin_a * inner_radius, -thickness / 2)))

    for i in range(6):
        j = (i + 1) % 6
        # Top annulus
        bm.faces.new([top_outer[i], top_outer[j], top_inner[j], top_inner[i]])
        # Bottom annulus (reversed for outward normal)
        bm.faces.new([bot_outer[i], bot_inner[i], bot_inner[j], bot_outer[j]])
        # Outer sidewall
        bm.faces.new([top_outer[i], bot_outer[i], bot_outer[j], top_outer[j]])
        # Inner sidewall (reversed normal — faces the disc)
        bm.faces.new([top_inner[i], top_inner[j], bot_inner[j], bot_inner[i]])

    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    return obj


def build_skylight(
    outer_radius: float = OUTER_RADIUS,
    inner_radius: float = INNER_RADIUS,
    thickness: float = RING_THICKNESS,
    disc_radius: float = DISC_RADIUS,
) -> tuple[bpy.types.Object, bpy.types.Object]:
    """Build the skylight ring + disc at the origin. Idempotent."""
    _remove_if_exists(RING_NAME, DISC_NAME)
    hub = _get_or_create_collection(HUB_COLLECTION)

    ring = _build_hex_ring(RING_NAME, outer_radius, inner_radius, thickness)
    bevel = ring.modifiers.new(name="EdgeBevel", type="BEVEL")
    bevel.width = 0.018
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(30)
    _move_to_collection(ring, hub)

    bpy.ops.mesh.primitive_circle_add(
        vertices=6,
        radius=disc_radius,
        fill_type="NGON",
        location=(0, 0, thickness / 2 - 0.002),
    )
    disc = bpy.context.active_object
    disc.name = DISC_NAME
    disc.rotation_euler[2] = math.radians(30)
    bpy.context.view_layer.objects.active = disc
    bpy.ops.object.select_all(action="DESELECT")
    disc.select_set(True)
    bpy.ops.object.transform_apply(rotation=True)
    _move_to_collection(disc, hub)

    return ring, disc


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
    ring, disc = build_skylight()

    _select_only(ring, disc)
    export_path = export_glb(
        "blender/exports/hub-skylight.glb",
        selection_only=True,
    )
    staged = stage_to_public(str(export_path))

    print(f"  ring: verts={len(ring.data.vertices)} faces={len(ring.data.polygons)}")
    print(f"  disc: verts={len(disc.data.vertices)} faces={len(disc.data.polygons)}")
    print(f"  exported  → {export_path}")
    print(f"  staged at → {staged}")


if __name__ == "__main__":
    main()
