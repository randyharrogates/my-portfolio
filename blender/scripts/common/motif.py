"""Shared motif geometry — hexagon-tracery panels.

Centralised so the wall panels, floor inlay, dome lattice, and HUD frames
all pull from one source of truth. First real implementation lands here
in Phase 4 to fill the alcove archway with a Wakandan hex-tracery
pattern; later phases re-use the same generator for arch variants per
alcove theme.

The pattern is a flat-top (pointy-on-top) hex grid where each cell is a
6-vertex regular hexagon. The grid is generated in 2D in the XZ plane
(Blender Z = up in the build scripts), with the Y axis reserved for
the per-cell extrusion / wireframe inflation that gives the tracery
3D depth.
"""

from __future__ import annotations

import math
from typing import Iterable

import bmesh  # type: ignore[import-not-found]
import bpy  # type: ignore[import-not-found]


def _point_in_triangle(
    p: tuple[float, float],
    a: tuple[float, float],
    b: tuple[float, float],
    c: tuple[float, float],
) -> bool:
    """Standard sign-of-cross-product point-in-triangle test."""
    def sign(p1, p2, p3):
        return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])

    d1 = sign(p, a, b)
    d2 = sign(p, b, c)
    d3 = sign(p, c, a)
    has_neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    has_pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (has_neg and has_pos)


def build_hex_tracery_in_triangle(
    name: str,
    *,
    triangle: tuple[tuple[float, float], tuple[float, float], tuple[float, float]],
    hex_radius: float = 0.45,
    rib_thickness: float = 0.07,
    margin: float = 0.06,
    pointy_top: bool = True,
) -> bpy.types.Object:
    """Build a hex-tracery panel clipped to a triangular region.

    All coordinates are in 2D (X, Z) — the resulting mesh lies in the
    XZ plane at Y=0. Caller is responsible for moving / extruding /
    re-orienting the result.

    The clip mask is the user-supplied triangle, shrunk by `margin` so
    cells whose centres land right on the triangle edge are excluded.
    Each kept cell becomes a 6-vertex hexagon ngon; the WIREFRAME
    modifier on the returned object inflates each ngon's edges into ribs
    of `rib_thickness` cross-section, giving the tracery 3D depth.

    Returns the mesh object with the WIREFRAME modifier *un-applied* so
    callers can tune `thickness` / `offset` / `use_replace` before
    baking it down with `bpy.ops.object.modifier_apply`.
    """
    a, b, c = triangle
    centroid = ((a[0] + b[0] + c[0]) / 3.0, (a[1] + b[1] + c[1]) / 3.0)
    shrunk = tuple(
        (
            v[0] + (centroid[0] - v[0]) * (margin / hex_radius),
            v[1] + (centroid[1] - v[1]) * (margin / hex_radius),
        )
        for v in (a, b, c)
    )

    # Hex grid spacing for pointy-top layout.
    if pointy_top:
        h_spacing = math.sqrt(3.0) * hex_radius
        v_spacing = 1.5 * hex_radius
    else:
        h_spacing = 1.5 * hex_radius
        v_spacing = math.sqrt(3.0) * hex_radius

    min_x = min(v[0] for v in (a, b, c)) - hex_radius
    max_x = max(v[0] for v in (a, b, c)) + hex_radius
    min_y = min(v[1] for v in (a, b, c)) - hex_radius
    max_y = max(v[1] for v in (a, b, c)) + hex_radius

    cols = int((max_x - min_x) / h_spacing) + 2
    rows = int((max_y - min_y) / v_spacing) + 2

    bm = bmesh.new()
    for row in range(rows):
        for col in range(cols):
            cx = min_x + col * h_spacing
            cy = min_y + row * v_spacing
            if pointy_top and row % 2 == 1:
                cx += h_spacing / 2.0
            if (not pointy_top) and col % 2 == 1:
                cy += v_spacing / 2.0

            if not _point_in_triangle((cx, cy), *shrunk):
                continue

            verts: list[bmesh.types.BMVert] = []
            for k in range(6):
                angle = (math.pi / 2.0 if pointy_top else 0.0) + k * math.pi / 3.0
                vx = cx + hex_radius * math.cos(angle)
                vy = cy + hex_radius * math.sin(angle)
                verts.append(bm.verts.new((vx, 0.0, vy)))
            bm.faces.new(verts)

    mesh = bpy.data.meshes.new(name + "_mesh")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)

    wf = obj.modifiers.new(name="HexWireframe", type="WIREFRAME")
    wf.thickness = rib_thickness
    wf.use_replace = True
    wf.use_relative_offset = False
    wf.use_even_offset = True

    return obj


def hex_grid_points(
    *,
    width: float,
    height: float,
    hex_radius: float,
    pointy_top: bool = True,
    centred: bool = True,
) -> Iterable[tuple[float, float]]:
    """Yield (x, y) centres for hex cells filling a `width × height` rect.

    Exposed for callers that want full control over the per-cell decision
    (e.g., a non-triangular clip region, or per-cell variation).
    """
    if pointy_top:
        h_spacing = math.sqrt(3.0) * hex_radius
        v_spacing = 1.5 * hex_radius
    else:
        h_spacing = 1.5 * hex_radius
        v_spacing = math.sqrt(3.0) * hex_radius

    cols = int(width / h_spacing) + 2
    rows = int(height / v_spacing) + 2
    x0 = -width / 2.0 if centred else 0.0
    y0 = -height / 2.0 if centred else 0.0
    for row in range(rows):
        for col in range(cols):
            cx = x0 + col * h_spacing
            cy = y0 + row * v_spacing
            if pointy_top and row % 2 == 1:
                cx += h_spacing / 2.0
            if (not pointy_top) and col % 2 == 1:
                cy += v_spacing / 2.0
            yield (cx, cy)
