"""Hub island base — archipelago pivot, Phase 2 Session 1.

A floating rock platter that sits under the existing cathedral hub. ~60 m
diameter on top, jagged spire-style underside, origin at world (0, 0, 0).
The cathedral floor (`hub-floor`, 14 m radius octagon) sits on top of the
island top face; the rock visibly extends past it on all sides so cinematic
flies + the map view read the silhouette of an island, not just a slab.

Design:
- Top platter: 30 m radius, 4 m thick. Slight inward dish so the cathedral
  footprint sits cleanly. Heavy radial segmentation for the displace pass.
- Bottom spire: tapers from 28 m → 0 over 14 m depth (origin at top of
  platter, so bottom point is at y = -18 m).
- Joined mesh + Displace (procedural Voronoi) for jagged rock irregularity.
- Decimate to ~50 K tris (the per-island budget; authored detail is free
  in Blender, we shed it on export).

Run headless to (re)build geometry + export glb + stage into public/:

    blender -b -P blender/scripts/islands/island-hub.py

Run live via MCP from Claude Code: just exec the file contents inside an
existing scene — ``build_island_hub()`` will tear down any prior pieces.
"""

from __future__ import annotations

import sys
from pathlib import Path

import bmesh  # type: ignore[import-not-found]
import bpy  # type: ignore[import-not-found]

_SCRIPTS_DIR = Path(__file__).resolve().parent.parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from common.export import export_glb, stage_to_public  # noqa: E402


ISLANDS_COLLECTION = "Islands"
ISLAND_NAME = "island-hub"


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


def build_island_hub(
    top_radius: float = 30.0,
    top_thickness: float = 4.0,
    spire_depth: float = 16.0,
    radial_segments: int = 96,
    horizontal_loop_cuts: tuple[float, ...] = (
        -1.0, -3.0, -5.0, -7.0, -9.0, -11.0, -13.0, -15.0, -17.0,
    ),
    displace_strength: float = 2.4,
    displace_noise_scale: float = 0.18,
    decimate_ratio: float = 0.5,
) -> bpy.types.Object:
    """Build the floating hub island. Idempotent — tears down prior piece.

    Mesh is positioned so the top of the platter is at z = 0 (cathedral
    floor sits at z ≈ 0 in Blender; the glTF axis swap maps Blender +Z →
    three.js +Y, so the React scene sees the island top at y = 0).

    The platter (cylinder) and spire (downward cone) share the same base
    radius so a `remove_doubles` after join welds the seam ring cleanly.
    Extra horizontal loop cuts give Displace something to push at
    midpoints between platter-bottom and apex — without them, the
    procedural Voronoi noise only deforms the cylinder/cone end rings and
    the silhouette reads as two stacked frustums.
    """
    _remove_if_exists(ISLAND_NAME)
    islands = _get_or_create_collection(ISLANDS_COLLECTION)

    # --- Top platter ------------------------------------------------------
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=radial_segments,
        radius=top_radius,
        depth=top_thickness,
        location=(0, 0, -top_thickness / 2),
    )
    platter = bpy.context.active_object
    platter.name = ISLAND_NAME

    # --- Bottom spire: cone with apex pointing DOWN ----------------------
    # Blender's primitive_cone_add places radius1 at the BOTTOM of the
    # cone and radius2 at the TOP. Apex-down ⇒ radius1=0, radius2=base.
    # Base radius matches platter radius so the seam welds.
    bpy.ops.mesh.primitive_cone_add(
        vertices=radial_segments,
        radius1=0.0,
        radius2=top_radius,
        depth=spire_depth,
        location=(0, 0, -top_thickness - spire_depth / 2),
    )
    spire = bpy.context.active_object
    spire.name = f"{ISLAND_NAME}-spire-tmp"

    # --- Join platter + spire --------------------------------------------
    bpy.ops.object.select_all(action="DESELECT")
    spire.select_set(True)
    platter.select_set(True)
    bpy.context.view_layer.objects.active = platter
    bpy.ops.object.join()
    island = bpy.context.active_object
    island.name = ISLAND_NAME

    # --- Weld seam + insert horizontal loop cuts for displace midpoints --
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=0.05)
    bm = bmesh.from_edit_mesh(island.data)
    for z in horizontal_loop_cuts:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(
            bm,
            geom=geom,
            plane_co=(0.0, 0.0, z),
            plane_no=(0.0, 0.0, 1.0),
            clear_outer=False,
            clear_inner=False,
        )
    bmesh.update_edit_mesh(island.data)
    bpy.ops.object.mode_set(mode="OBJECT")

    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

    # --- Subdivide for displace headroom ---------------------------------
    subsurf = island.modifiers.new(name="IslandSubsurf", type="SUBSURF")
    subsurf.subdivision_type = "CATMULL_CLARK"
    subsurf.levels = 1
    subsurf.render_levels = 1

    # --- Displace with procedural Voronoi for rock irregularity ----------
    tex = bpy.data.textures.new("IslandRockNoise", type="VORONOI")
    tex.noise_scale = displace_noise_scale
    tex.distance_metric = "DISTANCE"

    displace = island.modifiers.new(name="IslandDisplace", type="DISPLACE")
    displace.texture = tex
    displace.strength = displace_strength
    displace.mid_level = 0.5

    # --- Decimate to budget ---------------------------------------------
    decimate = island.modifiers.new(name="IslandDecimate", type="DECIMATE")
    decimate.decimate_type = "COLLAPSE"
    decimate.ratio = decimate_ratio

    # --- Shade smooth so the displaced rock reads as one mass ------------
    for poly in island.data.polygons:
        poly.use_smooth = True

    _move_to_collection(island, islands)
    return island


def _reset_scene() -> None:
    """Headless-mode scene reset — wipe everything to a clean slate."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def main() -> None:
    _reset_scene()
    island = build_island_hub()

    export_path = export_glb(
        "blender/exports/island-hub.glb",
        selection_only=False,
    )
    staged = stage_to_public(str(export_path))

    print(f"  island: verts={len(island.data.vertices)} faces={len(island.data.polygons)}")
    print(f"  exported  → {export_path}")
    print(f"  staged at → {staged}")


if __name__ == "__main__":
    main()
