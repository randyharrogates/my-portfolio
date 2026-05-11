"""Phase 1 verification — produces blender/exports/test-cube.glb.

Run headless:
    blender -b -P blender/scripts/test-cube.py

Or interactively via MCP: ask Claude to execute the contents of this file.
The output glTF should round-trip via Draco decoder on the React side at
/#/hall-test (added in Phase 1).
"""

from __future__ import annotations

import os
import sys

# Make sibling-package imports work both headless and inside Blender's runtime.
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

import bpy  # type: ignore[import-not-found]

from common.export import export_glb, stage_to_public


def build_test_cube() -> None:
    # Start from a clean slate so headless runs are deterministic.
    bpy.ops.wm.read_factory_settings(use_empty=True)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, 0.0))
    cube = bpy.context.active_object
    cube.name = "test-cube"


def main() -> None:
    build_test_cube()
    glb = export_glb("blender/exports/test-cube.glb")
    stage_to_public(str(glb))


if __name__ == "__main__":
    main()
