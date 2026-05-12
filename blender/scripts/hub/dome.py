"""Hub dome ceiling — Phase 2.5 Session 14: triangulated chevron rib pattern.

Two named meshes share the dome glb:

- ``hub-dome-shell``   — half-icosphere acting as the glass-transmission
                         vault surface. The React side replaces this with
                         a transparent ``MeshPhysicalMaterial`` so the
                         Drakensberg HDRI shines through.
- ``hub-dome-lattice`` — triangulated UV-sphere half with a wireframe
                         modifier. The UV sphere's quad grid is sliced
                         with a consistent diagonal so the ribs form a
                         herringbone of chevrons pointing toward the apex
                         — Hall-of-Zero-Limits cathedral signature.

Two competing dome topologies are kept in the same file because each
serves a different job: icosphere → cheap rounded shell for transmission;
UV-sphere → predictable quad-then-diagonal grid for the chevron lattice.

Run headless to (re)build geometry + export glb + stage into public/:

    blender -b -P blender/scripts/hub/dome.py
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
SHELL_NAME = "hub-dome-shell"
LATTICE_NAME = "hub-dome-lattice"

HALL_HUB_RADIUS = 14.0      # Session 20 re-scale (was 7.0)
HALL_CEILING_HEIGHT = 28.0  # Session 20 re-scale (was 14.0)
DOME_RADIUS = HALL_HUB_RADIUS * 1.35  # 18.9m — spans wider than the column ring
DOME_SCALE_Z = 0.55                   # flatter at the new scale so the dome
                                       # reads as a ceiling, not a hemispherical roof
SHELL_SUBDIVISIONS = 2                 # icosphere subdivisions for the glass shell

# Chevron lattice — UV sphere parameters. Higher segments == more meridional
# ribs; higher rings == more horizontal bands. The HoZL reference uses
# roughly 16 meridional ribs and ~5 horizontal bands.
LATTICE_SEGMENTS = 16
LATTICE_RINGS = 10  # full sphere ring count; half-sphere keeps top half only
LATTICE_THICKNESS = 0.18  # wireframe rib thickness (doubled with scale)


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


def _build_shell(
    radius: float,
    base_z: float,
    subdivisions: int,
    scale_z: float,
) -> bpy.types.Object:
    """Half-icosphere acting as the glass vault for transmission/IBL.
    Faceted (flat-shaded) so the dome's panels read as discrete facets even
    through the transparent material."""
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions,
        radius=radius,
        location=(0, 0, base_z),
    )
    shell = bpy.context.active_object
    shell.name = SHELL_NAME

    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(shell.data)
    verts_to_remove = [v for v in bm.verts if v.co.z < 0.0]
    bmesh.ops.delete(bm, geom=verts_to_remove, context="VERTS")
    bmesh.update_edit_mesh(shell.data)
    bpy.ops.object.mode_set(mode="OBJECT")

    shell.scale = (1.0, 1.0, scale_z)
    bpy.context.view_layer.objects.active = shell
    bpy.ops.object.select_all(action="DESELECT")
    shell.select_set(True)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.shade_flat()

    return shell


def _build_chevron_lattice(
    radius: float,
    base_z: float,
    scale_z: float,
    segments: int,
    rings: int,
    thickness: float,
) -> bpy.types.Object:
    """UV-sphere half-dome whose quad faces are sliced with a consistent
    diagonal, producing chevron triangle pairs. Wireframe modifier turns
    every edge into a brass rib — meridional verticals + latitudinal rings
    + diagonal chevrons.

    Why not just keep the icosphere wireframe?  The icosphere's hex/pent
    pattern reads as "geodesic dome" — Buckminster Fuller, not Wakandan
    cathedral. The HoZL reference uses radial ribs converging on an apex
    (longitude lines), broken into horizontal rings (latitude lines), with
    a diagonal slash through each cell that makes triangular chevrons.
    UV sphere → triangulate-all → wireframe lands exactly that. """
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        radius=radius,
        location=(0, 0, base_z),
    )
    lattice = bpy.context.active_object
    lattice.name = LATTICE_NAME

    # Cull bottom half. UV-sphere is built around the origin so bottom verts
    # are at z < 0 (object-local).
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(lattice.data)
    verts_to_remove = [v for v in bm.verts if v.co.z < -0.001]
    bmesh.ops.delete(bm, geom=verts_to_remove, context="VERTS")

    # Triangulate every quad with the SAME diagonal direction so adjacent
    # triangles form a herringbone of chevrons. ``quad_method='BEAUTY'`` would
    # alternate diagonals; we want consistent direction → ``FIXED``.
    bm = bmesh.from_edit_mesh(lattice.data)
    bmesh.ops.triangulate(
        bm,
        faces=bm.faces[:],
        quad_method="FIXED",
        ngon_method="BEAUTY",
    )
    bmesh.update_edit_mesh(lattice.data)
    bpy.ops.object.mode_set(mode="OBJECT")

    # Flatten + apply scale so the rib mesh sits on top of the (now-flattened)
    # shell. Same Z scale factor as the shell so the two surfaces coincide.
    lattice.scale = (1.0, 1.0, scale_z)
    bpy.context.view_layer.objects.active = lattice
    bpy.ops.object.select_all(action="DESELECT")
    lattice.select_set(True)
    bpy.ops.object.transform_apply(scale=True)

    # Inflate every edge into a thin rib via the wireframe modifier. The
    # modifier replaces faces with their edge-extrusions, so the final mesh
    # is purely ribs (no panels) — perfect for a transparent dome shell to
    # show through.
    wf = lattice.modifiers.new(name="ChevronWireframe", type="WIREFRAME")
    wf.thickness = thickness
    wf.use_replace = True
    wf.use_relative_offset = True
    # Apply the modifier so the exported glb contains the rib geometry,
    # not just a modifier marker.
    bpy.context.view_layer.objects.active = lattice
    bpy.ops.object.modifier_apply(modifier=wf.name)

    return lattice


def build_dome(
    radius: float = DOME_RADIUS,
    base_z: float = HALL_CEILING_HEIGHT,
    scale_z: float = DOME_SCALE_Z,
    shell_subdivisions: int = SHELL_SUBDIVISIONS,
    lattice_segments: int = LATTICE_SEGMENTS,
    lattice_rings: int = LATTICE_RINGS,
    lattice_thickness: float = LATTICE_THICKNESS,
) -> tuple[bpy.types.Object, bpy.types.Object]:
    """Build the dome shell + chevron lattice. Idempotent."""
    _remove_if_exists(SHELL_NAME, LATTICE_NAME)
    hub = _get_or_create_collection(HUB_COLLECTION)

    shell = _build_shell(radius, base_z, shell_subdivisions, scale_z)
    _move_to_collection(shell, hub)

    lattice = _build_chevron_lattice(
        radius=radius,
        base_z=base_z,
        scale_z=scale_z,
        segments=lattice_segments,
        rings=lattice_rings,
        thickness=lattice_thickness,
    )
    _move_to_collection(lattice, hub)

    return shell, lattice


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
    shell, lattice = build_dome()

    _select_only(shell, lattice)
    export_path = export_glb(
        "blender/exports/hub-dome.glb",
        selection_only=True,
    )
    staged = stage_to_public(str(export_path))

    print(f"  shell  : verts={len(shell.data.vertices)} faces={len(shell.data.polygons)}")
    print(f"  lattice: verts={len(lattice.data.vertices)} faces={len(lattice.data.polygons)}")
    print(f"  exported  → {export_path}")
    print(f"  staged at → {staged}")


if __name__ == "__main__":
    main()
