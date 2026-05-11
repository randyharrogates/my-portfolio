"""Headless installer for the BlenderMCP addon.

Runs once during initial setup to install + enable the addon stored at
blender/mcp-setup/addon.py into the user's Blender preferences. Persists
across Blender sessions — you only need to run this once per machine.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P \\
        blender/mcp-setup/install-addon.py

After this, opening Blender will show the BlenderMCP sidebar tab (press N in
the 3D viewport) and you can click "Connect to Claude" each session.
"""

from __future__ import annotations

import os
import sys

import bpy  # type: ignore[import-not-found]


ADDON_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "addon.py",
)
ADDON_MODULE = "addon"


def main() -> None:
    if not os.path.isfile(ADDON_FILE):
        print(f"[install-addon] addon.py not found at {ADDON_FILE}", file=sys.stderr)
        sys.exit(1)

    print(f"[install-addon] installing from {ADDON_FILE}")
    bpy.ops.preferences.addon_install(filepath=ADDON_FILE, overwrite=True)

    print(f"[install-addon] enabling module '{ADDON_MODULE}'")
    bpy.ops.preferences.addon_enable(module=ADDON_MODULE)

    bpy.ops.wm.save_userpref()
    print("[install-addon] saved user preferences. BlenderMCP is ready.")


if __name__ == "__main__":
    main()
