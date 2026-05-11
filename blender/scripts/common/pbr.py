"""PolyHaven PBR material loader.

Phase 1 will flesh out the real PolyHaven REST API integration. For now this
exposes the function signature so the script tree is shaped correctly and
imports work.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import bpy  # type: ignore[import-not-found]


@dataclass(frozen=True)
class PbrMaps:
    """A minimal PBR map set sufficient for our materials."""

    base_color: str
    normal: str
    roughness: Optional[str] = None
    metallic: Optional[str] = None
    ao: Optional[str] = None


def load_polyhaven_material(slug: str, resolution: str = "2k") -> bpy.types.Material:
    """Download (if needed) and build a Blender material from a PolyHaven slug.

    Caching layer + REST integration are introduced in Phase 1. Until then this
    raises NotImplementedError so build scripts fail loudly rather than
    silently producing flat-grey materials.
    """
    raise NotImplementedError(
        "PolyHaven loader not implemented yet — wire up in Phase 1"
    )


def apply_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    """Slot a material onto an object as its single material."""
    obj.data.materials.clear()
    obj.data.materials.append(material)
