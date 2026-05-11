"""Draco-compressed glTF export helpers.

Usage from any build script:

    from common.export import export_glb
    export_glb("blender/exports/hub.glb", selection_only=False)

Defaults are tuned for the Hall pipeline (Draco level 7, no animations, no
cameras/lights — we re-create lighting on the React side).
"""

from __future__ import annotations

import os
from pathlib import Path

import bpy  # type: ignore[import-not-found]


def export_glb(
    output_path: str,
    *,
    selection_only: bool = False,
    use_draco: bool = False,
    draco_level: int = 7,
    include_lights: bool = False,
    include_cameras: bool = False,
) -> Path:
    """Export the current Blender scene to a glTF binary.

    Draco compression is off by default — the React side doesn't ship a
    ``DRACOLoader``, so compressed glbs can't be decoded. Pass
    ``use_draco=True`` once a hero asset is heavy enough to justify wiring
    up the decoder (and remember to register the loader in the React app
    before flipping the flag).

    The output directory is created if missing. Returns the resolved absolute
    Path of the produced .glb so callers can chain it into a copy step.
    """
    out = Path(output_path).expanduser().resolve()
    out.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.export_scene.gltf(
        filepath=str(out),
        export_format="GLB",
        use_selection=selection_only,
        export_apply=True,
        export_yup=True,
        export_draco_mesh_compression_enable=use_draco,
        export_draco_mesh_compression_level=draco_level,
        export_lights=include_lights,
        export_cameras=include_cameras,
        export_animations=False,
        export_extras=False,
    )
    return out


def stage_to_public(glb_path: str, public_dir: str = "public/models/hall") -> Path:
    """Copy an exported glb into the React public/ tree.

    Idempotent — overwrites any existing file. Returns the staged Path.
    """
    src = Path(glb_path).resolve()
    if not src.exists():
        raise FileNotFoundError(f"export not found: {src}")

    repo_root = _repo_root()
    dest_dir = (repo_root / public_dir).resolve()
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / src.name

    dest.write_bytes(src.read_bytes())
    return dest


def _repo_root() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "package.json").exists() and (parent / "blender").exists():
            return parent
    raise RuntimeError("could not locate repo root from " + str(here))
