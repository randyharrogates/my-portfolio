"""Headless FLIP fluid bake script for skills waterfall.

Run with:
    blender -b blender/skills-waterfall-sim.blend -P blender/bake_waterfall_sim.py

Bakes in this order (MODULAR cache, so each can be re-run independently):
  1. DATA pass — FLIP particles + grid simulation
  2. MESH pass — surface mesh from particles (this is what renders as water)
  3. PARTICLES pass — spray + foam + bubble secondary particles

Progress prints to stdout. Each pass writes to disk in the configured
cache directory (blender/cache/skills_waterfall/) and is persisted, so
re-running just one pass after editing materials doesn't redo the others.
"""
import bpy
import time
import sys

print("=" * 60)
print("FLIP fluid bake — skills waterfall")
print("=" * 60)
sys.stdout.flush()

# Ensure domain object is active + selected
domain = bpy.data.objects.get('FluidDomain')
if domain is None:
    print("ERROR: FluidDomain not found in scene", file=sys.stderr)
    sys.exit(1)

bpy.context.view_layer.objects.active = domain
for o in bpy.data.objects:
    o.select_set(False)
domain.select_set(True)

scene = bpy.context.scene
print(f"Frames: {scene.frame_start}..{scene.frame_end}")
fs = domain.modifiers['Fluid'].domain_settings
print(f"Domain resolution: {fs.resolution_max}")
print(f"Cache: {fs.cache_directory}")
sys.stdout.flush()


def stage(name, fn):
    print(f"\n--- {name} ---")
    sys.stdout.flush()
    t0 = time.time()
    fn()
    dt = time.time() - t0
    print(f"--- {name} done in {dt/60:.1f} min ---")
    sys.stdout.flush()


# Bake order: data → mesh → particles (spray/foam/bubble)
stage("DATA bake (FLIP particles + grid)",
      lambda: bpy.ops.fluid.bake_data())
stage("MESH bake (water surface)",
      lambda: bpy.ops.fluid.bake_mesh())
stage("PARTICLES bake (spray + foam + bubble)",
      lambda: bpy.ops.fluid.bake_particles())

# Save .blend so Blender remembers the bake state
bpy.ops.wm.save_as_mainfile(
    filepath='/Users/randychan/git/personal/my-portfolio/blender/skills-waterfall-sim.blend'
)
print("\nAll bakes complete. .blend saved.")
sys.stdout.flush()
