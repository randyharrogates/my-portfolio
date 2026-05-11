"""Shared motif geometry — hexagon-and-line tracery panels.

Centralised so the wall panels, floor inlay, dome lattice, and HUD frames all
pull from one source of truth. Fleshed out in Phase 2 once the hub geometry
proves out the motif.
"""

from __future__ import annotations

import bpy  # type: ignore[import-not-found]


def build_hex_panel(
    name: str,
    *,
    width: float,
    height: float,
    hex_radius: float = 0.08,
    line_thickness: float = 0.004,
) -> bpy.types.Object:
    """Create a flat hex-tracery panel as a single mesh object.

    Wired into geometry nodes in Phase 2. Stub raises now so it can't be
    silently called too early.
    """
    raise NotImplementedError(
        "build_hex_panel — implement in Phase 2 with geometry nodes"
    )
