"""Hub lightmap bake — Phase 2 asset 2.9.

Bakes one combined diffuse-irradiance map per named mesh in the hub.
Each map captures the direct+indirect diffuse contribution from the hub
light rig (dome sky tint + warm skylight key from the aperture), giving
the runtime PBR material a pre-shaded base it can layer on top of the
tileable albedo.

Output: ``public/textures/hall/baked/lightmap/<mesh-name>.png`` at 512².
glb side: each hub glb is re-exported with the lightmap UV layer.

The lighting rig here is a *deliberately mild* approximation of the
React-side scene. It exists to give the lightmap interesting variation,
not to replace the runtime lighting — the runtime ``MeshStandardMaterial``
still runs full PBR shading; the lightmap just multiplies into the
diffuse term via ``material.lightMap`` + ``lightMapIntensity``.

Key + fill setup:

- Warm key light at the skylight aperture (``y = HALL_CEILING_HEIGHT + 0.05``)
  pointing downward — analogue of the runtime skylight emissive disc.
- Cool sky dome (``world`` background) at low intensity — analogue of
  the runtime Environment HDRI.
- Faint warm fill at the floor inlay centre — analogue of the runtime
  floor-glow ring.

Run headless::

    /Applications/Blender.app/Contents/MacOS/Blender -b \\
        -P blender/scripts/bake/hub-lightmap.py
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy  # type: ignore[import-not-found]

_SCRIPTS_DIR = Path(__file__).resolve().parent.parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from bake._common import run_bake_pipeline  # noqa: E402

CEILING_HEIGHT = 14.0  # Phase 2.5 re-scale (was 5.5 — gazebo proportions)


def _add_sun(
    name: str,
    direction: tuple[float, float, float],
    energy: float,
    colour: tuple[float, float, float],
) -> None:
    """Add a Sun light pointing along ``direction`` (world-space)."""
    bpy.ops.object.light_add(type="SUN", location=(0, 0, 10))
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.color = colour
    # Orient sun to look toward direction. We rotate (0, 0, -1) → direction.
    import mathutils

    d = mathutils.Vector(direction).normalized()
    default = mathutils.Vector((0, 0, -1))
    quat = default.rotation_difference(d)
    light.rotation_mode = "QUATERNION"
    light.rotation_quaternion = quat


def _add_point(
    name: str,
    location: tuple[float, float, float],
    energy: float,
    colour: tuple[float, float, float],
    radius: float = 0.6,
) -> None:
    bpy.ops.object.light_add(type="POINT", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.color = colour
    light.data.shadow_soft_size = radius


def setup_hub_world() -> None:
    """Set up the cycles light rig for the hub lightmap bake.

    Coordinate frame is Blender (Z-up). ``y_react = z_blender``, so the
    skylight aperture is at Blender (0, 0, 5.55).
    """
    scene = bpy.context.scene

    # Cool sky dome — gives the lattice + floor a faint cyan tint top-side.
    world = scene.world
    world.use_nodes = True
    world_nt = world.node_tree
    for n in list(world_nt.nodes):
        world_nt.nodes.remove(n)
    bg = world_nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Color"].default_value = (0.06, 0.13, 0.16, 1.0)  # deep teal
    bg.inputs["Strength"].default_value = 0.45
    wout = world_nt.nodes.new("ShaderNodeOutputWorld")
    world_nt.links.new(bg.outputs["Background"], wout.inputs["Surface"])

    # Warm skylight key from above — analogue of the runtime emissive disc.
    # Energy scaled ~6.5× from 120W → 800W to compensate for the 2.55× ceiling
    # distance (inverse-square: 2.55² ≈ 6.5). Falls off naturally to a sane
    # irradiance at floor level.
    _add_point(
        "skylight-key",
        location=(0, 0, CEILING_HEIGHT - 1.5),
        energy=800.0,
        colour=(1.0, 0.86, 0.62),  # warm brass
        radius=1.2,
    )

    # Soft warm fill at hub-floor centre — analogue of floor-glow ring.
    # Radius scaled with the new hub diameter so the falloff still reaches
    # the column ring instead of dying mid-floor.
    _add_point(
        "floor-fill",
        location=(0, 0, 0.05),
        energy=60.0,
        colour=(0.30, 0.82, 0.78),  # emerald-teal
        radius=5.5,
    )

    # Faint cool rim from above-side to break up the dome shading.
    _add_sun(
        "rim-cool",
        direction=(0.4, 0.4, -1.0),
        energy=0.35,
        colour=(0.78, 0.92, 1.0),
    )


def main() -> None:
    results = run_bake_pipeline(
        kind="lightmap",
        bake_type="DIFFUSE",
        resolution=512,
        samples=256,
        setup_world=setup_hub_world,
    )
    print()
    print(f"Lightmap bake complete — {len(results)} maps written.")
    for name, png, glb in results:
        print(f"  {name}: {png.name}  ({glb.name})")


if __name__ == "__main__":
    main()
