"""Hub floor — Phase 2 Session 1 deliverable.

A hexagonal slab + nested inlay disk, sized to the React side's
``HALL_HUB_RADIUS`` constant (see ``src/landing/sections.ts``).

Run headless to (re)build geometry + export glb + stage into public/:

    blender -b -P blender/scripts/hub/floor.py

Run live via MCP from Claude Code: just exec the file contents inside an
existing scene — ``build_floor()`` will tear down any prior pieces.
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


HUB_COLLECTION = "Hub"
SLAB_NAME = "hub-floor-slab"
INLAY_NAME = "hub-floor-inlay"


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


def build_floor(
    radius: float = 14.0,
    sides: int = 8,
    thickness: float = 0.36,
    bevel_width: float = 0.16,
    bevel_segments: int = 2,
    inset_ratio: float = 0.82,
) -> tuple[bpy.types.Object, bpy.types.Object]:
    """Build the hub floor slab + inlay. Idempotent — tears down prior pieces.

    The slab is rotated +30° around Z so that each of the six flat edges
    faces one alcove direction (alcoves live at three.js angles 0°, 60°,
    120°, 180°, 240°, 300°; after Blender→glTF axis swap the +Y direction
    in Blender maps to three.js −Z, which is the "about" alcove ray).
    """
    _remove_if_exists(SLAB_NAME, INLAY_NAME)
    hub = _get_or_create_collection(HUB_COLLECTION)

    # --- Slab -------------------------------------------------------------
    # Octagonal floor (Phase 2.5 take-2 — was hex). 22.5° rotation puts one
    # flat edge facing each cardinal/diagonal direction, so the irregular
    # alcoves above don't necessarily align with floor vertices — the
    # asymmetry between floor and alcove layout adds another "less planned"
    # cue from the HoZL reference.
    rotation_deg = 22.5 if sides == 8 else 30
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=sides,
        radius=radius,
        depth=thickness,
        location=(0, 0, -thickness / 2),
    )
    slab = bpy.context.active_object
    slab.name = SLAB_NAME
    slab.rotation_euler[2] = math.radians(rotation_deg)
    bpy.context.view_layer.objects.active = slab
    bpy.ops.object.select_all(action="DESELECT")
    slab.select_set(True)
    bpy.ops.object.transform_apply(rotation=True)

    bevel = slab.modifiers.new(name="EdgeBevel", type="BEVEL")
    bevel.width = bevel_width
    bevel.segments = bevel_segments
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(30)
    _move_to_collection(slab, hub)

    # --- Inlay disk -------------------------------------------------------
    bpy.ops.mesh.primitive_circle_add(
        vertices=sides,
        radius=radius * inset_ratio,
        fill_type="NGON",
        location=(0, 0, 0.001),
    )
    inlay = bpy.context.active_object
    inlay.name = INLAY_NAME
    inlay.rotation_euler[2] = math.radians(rotation_deg)
    bpy.ops.object.select_all(action="DESELECT")
    inlay.select_set(True)
    bpy.ops.object.transform_apply(rotation=True)
    _move_to_collection(inlay, hub)

    return slab, inlay


def _reset_scene() -> None:
    """Headless-mode scene reset — wipe everything to a clean slate."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def main() -> None:
    _reset_scene()
    slab, inlay = build_floor()

    export_path = export_glb(
        "blender/exports/hub-floor.glb",
        selection_only=False,
    )
    staged = stage_to_public(str(export_path))

    print(f"  slab : verts={len(slab.data.vertices)} faces={len(slab.data.polygons)}")
    print(f"  inlay: verts={len(inlay.data.vertices)} faces={len(inlay.data.polygons)}")
    print(f"  exported  → {export_path}")
    print(f"  staged at → {staged}")


if __name__ == "__main__":
    main()
