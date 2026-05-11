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

#### Session 2 — 2026-05-11 — 6 brass columns at hex-edge midpoints
- **Built**: single brass column at origin — hex base (0.42m radius × 0.4m
  tall, 0.025m angle-bevel) + tapered hex shaft (radius 0.36m → 0.28m,
  4.4m tall, built via bmesh ring-bridge) + hex capital (0.46m radius ×
  0.7m tall, 0.05m chamfered top). All three pieces rotated 30° around Z
  so flat faces align with the hex floor. Total height 5.5m = `HALL_CEILING_HEIGHT`.
- **Script**: `blender/scripts/hub/columns.py` — parameterized (base /
  shaft / capital independently tweakable), idempotent, `selection_only=True`
  on export so live-MCP runs don't accidentally include floor pieces.
- **Output**: `public/models/hall/hub-column.glb` (34KB uncompressed).
- **React side**: `Hub.tsx` — new `HubColumns` subcomponent loads the
  glb, extracts `hub-column-{base,shaft,capital}` geometries, instantiates
  6 `<group position={...}>` at hex-edge midpoints (radius
  `HALL_HUB_RADIUS * cos(π/6) ≈ 2.598m`, angles 30°/90°/150°/210°/270°/330°
  in three.js so each column sits between two adjacent alcoves rather
  than blocking either arch). Replaced the 8-column primitive placeholder.
- **Decision**: columns at hex-EDGE midpoints (between alcoves) rather
  than hex-VERTICES (at alcove rays). Vertex placement would point a
  column directly at each alcove arch and block the view from inside
  the hub.
- **Verification**: live `/hall` renders the 6 columns framing the
  alcove arches; 60 fps; 0 console errors; build + tests pass.
- **Honest read**: intentionally austere placeholder — clean structural
  supports, no carved capitals or fluting yet. Asset 2.3 (carved-capital
  ornament) is the separate ornament-density question and the real
  Phase 2 decision-point driver.
- **Time spent**: ~45 min.
- **Next session priority**: dome ceiling (Asset 2.4) — biggest single
  visual-impact piece; the Wakandan-futuristic identity payoff.

#### Session 3 — 2026-05-11 — ornamented capital + base (asset 2.3)
- **Built**: 5-tier hex stack for both column **base** AND **capital**,
  joined into one mesh per part. Alternating 30°/0° Z-rotation between
  adjacent tiers creates a stepped/staircase silhouette that reads as
  carved ornament without leaving placeholder territory.
  - Base profile (bottom→top): plinth · lower torus · middle · upper
    torus · apophyge. Total 0.4m.
  - Capital profile (bottom→top): neck · lower band · echinus · upper
    band · abacus. Total 0.7m.
- **Script**: `blender/scripts/hub/columns.py` — extended with
  `_make_tier`, `_join_pieces`, `BASE_TIER_PROFILE`,
  `CAPITAL_TIER_PROFILE` data tables. The 3-named-mesh contract is
  preserved (`hub-column-{base,shaft,capital}`) so the React side
  needs no changes.
- **Geometry budget**: base 60 verts / 40 faces, capital 60 verts /
  40 faces, shaft unchanged at 12 verts / 8 faces. Per-column total
  ~132 verts — still trivial relative to the 8k/column budget.
- **Output**: `public/models/hall/hub-column.glb` (re-exported, replaces
  session 2 plain-prism version).
- **Verification**: live `/hall` renders tiered ornament on both
  base and capital of all 6 columns; 60 fps; 0 console errors;
  build + tests pass.
- **Honest read**: ~4-5/10 ornament density vs Hall of Zero Limits
  reference. Procedural geometry can stack tiers cleanly but can't
  carve organic Wakandan tracery without authoring intent. The
  actual ornament-vs-budget call still lives at 2.🎯 (paid KitBash3D
  + Sketchfab hero capitals can close most of the remaining gap).
- **Time spent**: ~35 min.
- **Next session priority**: dome ceiling (Asset 2.4) — biggest single
  visual-impact piece; the Wakandan-futuristic identity payoff.

#### Session 4 — 2026-05-11 — dome ceiling (asset 2.4)
- **Built**: faceted geodesic half-dome from a subdivided icosphere (subdivision
  2 → 42 verts, top-half-only after culling = 26 verts / 40 flat-shaded
  triangles). Y-scaled 0.65 → 2.93m dome height above z = 5.5m. Radius
  4.5m so the dome spans wider than the column ring (2.598m) but stays
  inside the alcove envelope (7m).
- **Two named meshes per glb**:
  - `hub-dome-shell` — flat-shaded interior, rendered with `THREE.BackSide`
    so the camera inside the hub sees the dark vault.
  - `hub-dome-lattice` — duplicate of the shell with a Wireframe modifier
    (thickness 0.04m, `use_replace=True`), rendered DoubleSide as
    brass-emissive ribs.
- **Script**: `blender/scripts/hub/dome.py` — bmesh-based bottom-half cull,
  scale-apply, flat-shade, modifier-driven lattice. Parameterized for
  radius, subdivisions, z-base, scale_z, and lattice thickness.
- **Output**: `public/models/hall/hub-dome.glb` (39KB uncompressed).
- **React side**: `Hub.tsx` — new `HubDome` subcomponent extracts both
  named meshes from the glb. Replaced the placeholder smooth-half-sphere
  + emissive-teal material; new shell uses the same dark colour but the
  faceted geometry + visible lattice does the heavy lifting now.
- **Verification**: live `/hall` renders the faceted dome with visible
  brass-lattice ribs at the top of frame; 60 fps; 0 console errors;
  build + tests pass.
- **Honest read**: clearly more "Wakandan-coded" than the smooth sphere —
  geodesic facets + brass ribs match the angular sci-fi vocabulary. Still
  obviously procedural compared to the reference's organic carved dome
  panels, but a meaningful visual upgrade.
- **Time spent**: ~25 min.
- **Next session priority**: wall panels between columns (asset 2.5) —
  triangle-tracery motif via geometry nodes, locks in the wall vocabulary
  for the rest of Phase 2.

#### Session 5 — 2026-05-11 — wall panels between columns (asset 2.5)
- **Built**: short parapet wall panel at origin — dark teal slab
  (3m × 1m × 0.08m, 8 verts / 6 faces) + brass frame (5 bars joined:
  top, bottom, left, right + decorative mid-slat, 40 verts / 30 faces).
  The +Y face is the inner-facing surface; the brass bars sit slightly
  proud of the slab so they read as raised metal on the hub interior.
- **Script**: `blender/scripts/hub/walls.py` — `_make_box` + `_join_pieces`
  helpers; `build_wall()` parameterized for width / height / thickness /
  frame dimensions.
- **Output**: `public/models/hall/hub-wall.glb` (small, plain glb).
- **React side**: `Hub.tsx` — new `HubWalls` subcomponent loads the glb,
  extracts both named meshes, and instantiates 6 panels at the column
  positions (hex-edge midpoints, three.js angles 30°/90°/150°/210°/270°/330°
  at radius `HALL_HUB_RADIUS * cos(π/6) ≈ 2.598m`) with `rotation.y = π - θ`
  so each panel's +Y inner face points at the hub centre.
- **Architectural read**: the six panels meet at hex vertices (alcove ray
  directions), forming a continuous hex parapet ring with brass framing.
  Walls are intentionally short (1m tall) so the alcove arches and
  holograms read clearly *above* the parapet — closed at floor level,
  open at sight level.
- **Verification**: live `/hall` renders a hex-ringed parapet with
  bright brass framing; 60 fps; 0 console errors; build + tests pass.
- **Honest read**: biggest single-session visual upgrade so far. The
  brass frames + slat give the hub real architectural identity instead
  of just "columns floating in space." Tracery motif (triangles, geom
  nodes) deferred — a row of frame bars carries enough of the visual
  load for placeholder.
- **Time spent**: ~30 min.
- **Next session priority**: skylight aperture (asset 2.6) — small hex
  ring at the dome apex, drives the god-ray spawn point. Then
  PolyHaven materials (2.7, 2.8) for the first real PBR pass.

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
