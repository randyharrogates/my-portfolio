# Render log

Side-by-side reference vs build screenshots per phase. The Phase 2 decision
point uses the scorecard at the bottom; everything before that is incremental
visual diff.

## Conventions

- Capture at 1920×1080 in equivalent FOV / angle to the reference.
- Save preview screenshots under `blender/renders/<phase>-<slug>.png`. These
  are committed (small JPEG/PNG, <500 KB each) so build history is reviewable.
- For each entry note: build commit, lighting setup, post-processing settings.

## Entries

### Phase 0 (foundation)
- No renders yet. Scaffolding only.

### Phase 1 (pipeline proof)
- `phase-1-test-cube.png` — first Draco-glTF + PolyHaven brass roundtrip.

### Phase 2 (hub prototype) — DECISION POINT

#### Session 1 — 2026-05-11 — hub hexagonal floor + inlay
- **Built**: hex slab (6 sides, vertex-radius 3.0m, thickness 0.10m, 0.04m angle-bevel) + nested inlay disk (hex, radius 2.4m, 80% ratio, z+0.001m).
- **Rotation**: +30° around Z so flat edges face the six alcove directions
  (Blender +Y → three.js -Z = "about" alcove ray).
- **Script**: `blender/scripts/hub/floor.py` (parameterized + idempotent;
  `python -P` invocation rebuilds glb + stages to public/).
- **Output**: `public/models/hall/hub-floor.glb` (13KB uncompressed).
- **React side**: `src/landing/Hall/Hub.tsx` — placeholder `CylinderGeometry`
  pair replaced with a `HubFloor` subcomponent that loads via
  `useGLTF(FLOOR_GLB)`, extracts named-mesh geometries from the loaded
  scene, and mounts them as plain `<mesh>` nodes with explicit override
  materials. Convention now: floor top sits at y = 0.
- **Verification**: live `/hall` renders the hex floor; 47–60 fps; 0
  console errors; build + test gates clean.
- **Side change**: atmosphere floor-glow rings + Hub's outer ring all
  swapped to 6-segment `ringGeometry` so the whole hub reads as
  hexagonal. Without that, the circular rings dominated the visual
  reading and the hex floor was barely legible from the idle-orbit
  camera pose.
- **Gotcha resolved — Draco decoder not registered**: first export used
  Draco level 7 (4.3KB output) but the React app doesn't ship a
  `DRACOLoader`, so `useGLTF` suspended forever (no error logged because
  GLTFLoader returns a never-resolving promise). Fix: switched
  `scripts/common/export.py` default to `use_draco=False` — gated
  behind an explicit flag for future hero assets. Re-exported to 13KB.
- **Gotcha resolved — `<primitive object={scene}>` didn't render the
  extracted glTF**: assigning materials to traversed nodes inside an
  unmounted primitive scene didn't produce visible meshes. Working
  pattern is to extract `m.geometry` from the loaded scene via
  `useMemo([scene])` and mount as plain `<mesh geometry={...}>`. Cost:
  named-mesh lookup at load time; benefit: explicit React-side control
  of material/shadows/transforms.
- **Time spent**: ~2 hr (45 min for geometry redirect + 75 min for the
  two render gotchas above).
- **Next session priority**: 8 brass columns (highest visual-impact +
  surfaces the Phase 2 ornament-gap risk early).

#### Pending references for Phase 2 decision point
- `phase-2-hub-wide.png` — match to `refs/hozl-01-hub-wide.png`
- `phase-2-column-detail.png` — match to `refs/hozl-02-column-detail.png`
- `phase-2-floor-glow.png` — match to `refs/hozl-03-floor-glow.png`

### Phase 2 scorecard (fill in after rendering)

Score each dimension 1–10 against the Hall of Zero Limits reference:

| Dimension | Score | Notes |
|---|---|---|
| Ornament density | _ | … |
| Material realism | _ | … |
| Atmosphere | _ | … |
| Ambition (overall feel) | _ | … |

**Decision rule:** if ornament density < 6/10, recommend unlocking
$200–$500 paid-asset budget for KitBash3D + Sketchfab heroes. Otherwise
continue the $0 procedural path.
