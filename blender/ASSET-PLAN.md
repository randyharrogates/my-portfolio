# Blender asset plan — Hall of Zero Limits

A single source of truth for every asset that needs to be built in Blender
and shipped as glTF to `public/models/hall/`. Tick items as they ship.

Conventions (mirror `README.md`):

- Units: meters, +Y up after glTF export.
- Triangle budgets per zone: hub ≤ 80k, alcove ≤ 40k, hero piece ≤ 8k.
- Texture budgets: tileables 2K UASTC, hero brass 4K UASTC, background props 1K ETC1S.
- One Blender script per asset under `blender/scripts/<zone>/<asset>.py`. Idempotent + parameterized.
- Final glb staged at `public/models/hall/<zone>-<asset>.glb`.
- Materials: PBR via PolyHaven where possible (`scripts/common/pbr.py`).
- Lighting baked separately in `scripts/bake/*` once geometry is locked.

## Status legend

| Symbol | Meaning |
|---|---|
| ✅ | Shipped — glb + script + wired into React |
| 🟡 | In progress |
| ⬜ | Planned, not yet started |
| 🔒 | Blocked / awaiting prior asset |
| 🎯 | Phase 2 decision-point checkpoint |

## Phase 2 — Hub rotunda

The canary phase. After all hub geometry + materials + bake are done, render
side-by-side against `refs/hozl-*.png` and score for the
`$0` → `$300` budget decision.

| # | Asset | Script | Notes | Status |
|---|---|---|---|---|
| 2.1 | Hexagonal floor slab + inlay | `hub/floor.py` | radius 3m, 6 sides, 0.10m thick, 0.04m bevel; inlay disk 2.4m radius at z+0.001 | ✅ 2026-05-11 |
| 2.2 | 6 brass columns (between alcoves) | `hub/columns.py` | base + tapered fluted shaft + capital; positioned at hex edge midpoints (between alcoves, not blocking arches); height = `HALL_CEILING_HEIGHT` | ⬜ session 2 |
| 2.3 | Column capitals (carved ornament) | `hub/capital.py` | The ornament-density risk piece. Procedural extrusion + array + bevel + boolean cuts. If <6/10 vs reference, this is where paid kit pays off. | 🔒 (after 2.2) |
| 2.4 | Dome ceiling | `hub/dome.py` | Geometry-node hex tessellation at radius ~5m; backface visible from inside; emissive lattice slats | ⬜ session 3 |
| 2.5 | Wall panels between columns | `hub/walls.py` | Six panels filling between adjacent columns; triangle-tracery motif via geometry nodes (`common/motif.py`) | ⬜ session 4 |
| 2.6 | Skylight aperture mesh | `hub/skylight.py` | Hex ring at dome apex, drives the god-ray spawn point on the React side | 🔒 (after 2.4) |
| 2.7 | PolyHaven brass material (columns + inlay) | `common/pbr.py` extension | Apply `metal_plate_02` or `brushed_brass_02` to columns + inlay; tile via UV unwrap | ⬜ session 5 |
| 2.8 | PolyHaven dark marble (floor slab) | `common/pbr.py` extension | Apply `dark_concrete_floor` or `marble_01` tileable to floor slab | ⬜ session 5 |
| 2.9 | Cycles light bake → KTX2 lightmap | `bake/hub-lightmap.py` | One bake per hub material; output to `public/textures/hall/hub-*.ktx2`; `toktx` / `gltf-transform` step | ⬜ session 6 |
| 2.10 | Cycles AO bake → KTX2 | `bake/hub-ao.py` | Combined AO map; corners + niches read darker | ⬜ session 6 |
| 2.🎯 | **Phase 2 decision point** | (manual) | Render hub at production quality; screenshot vs `refs/hozl-01-hub-wide.png`; fill scorecard in `RENDER-LOG.md`; choose $0 or $300 path | ⬜ session 7 |

## Phase 4 — First alcove (Projects)

Locks the alcove template. The other 5 alcoves re-use the geometry pattern.

| # | Asset | Script | Notes | Status |
|---|---|---|---|---|
| 4.1 | Alcove pavilion shell | `alcoves/projects-shell.py` | Half-hexagon back wall + two angled side walls + ceiling. Replaces placeholder geometry in `Alcove.tsx`. | ⬜ |
| 4.2 | Hex-tracery archway | `alcoves/projects-arch.py` | Brass arch on hub-facing side. Reuses `common/motif.py` triangle pattern. | 🔒 |
| 4.3 | Hologram mount frame | `alcoves/projects-mount.py` | Small brass frame surrounding the hologram screen. | 🔒 |
| 4.4 | Pedestal + floor | `alcoves/projects-pedestal.py` | Walking surface inside the alcove + central pedestal for a hero prop. | 🔒 |

## Phase 5 — Remaining alcoves (×5)

Each alcove follows the Phase 4 template with section-specific decoration.

| Alcove | Theme | Unique props | Status |
|---|---|---|---|
| About (origin chamber) | warm tungsten | timeline pedestal, hologram portrait plinth | ⬜ |
| Skills (tool armory) | green accent | floating tech-stack badges, signal-graph aurora | ⬜ |
| Blog (library) | violet accent | bookshelf with hologram book covers | ⬜ |
| Resume (credentials wall) | cream tungsten | scrolling resume column, download CTA plinth | ⬜ |
| Contact (comms array) | cyan accent | rotating social orbits, mailto button plinth | ⬜ |

## Phase 6 — Atmosphere assets

| # | Asset | Script | Notes | Status |
|---|---|---|---|---|
| 6.1 | Skybox 360 EXR | `atmo/skybox-bake.py` | Procedural Wakandan-futuristic city silhouette baked from Blender camera; output `public/hdri/hall-vista.exr` | ⬜ |
| 6.2 | Volumetric god-ray cone (upgrade) | (React side) | Existing `Atmosphere.tsx` cone tightened + tinted to match dome HDRI; no Blender output | ⬜ |
| 6.3 | Particle mote noise texture | `atmo/mote-noise.py` | Baked blue-noise PNG for particle disp; `public/textures/hall/mote-noise.png` | ⬜ |

## Phase 8 — Polish assets

| # | Asset | Script | Notes | Status |
|---|---|---|---|---|
| 8.1 | Final LUT (Wakandan grade) | `scripts/generate-lut-hall.mjs` (Node) | 32-slice 3D LUT PNG; replaces warm-evening LUT for the Hall route only | ⬜ |
| 8.2 | Boot-sequence camera path | `boot/path.py` | Animated camera path through hub + alcove flyover; bakes to JSON read by `CameraDirector.tsx` | ⬜ |
| 8.3 | Loading-screen brass-triangle GIF | `boot/loader.py` | Tessellating brass triangle animation; exported as APNG/WebM | ⬜ |

## Audio (parallel track)

CC0 sources from `freesound.org`. License-check each file, document in
`public/audio/hall/CREDITS.md`. Live in `public/audio/hall/*.ogg`.

| # | Asset | Source filter | Notes | Status |
|---|---|---|---|---|
| A.1 | Ambient drone (hub) | "drone ambient" CC0 | 30–60s seamless loop, low-end heavy | ⬜ |
| A.2 | Transition whoosh (×3 variants) | "swoosh" CC0 | 0.8–1.2s, alternated per camera fly | ⬜ |
| A.3 | Per-alcove ambient bed (×6) | varies by theme | library: page rustles; contact: CB static; etc. | ⬜ |

## Tracking conventions

- When an asset ships, change its row to ✅ and add the commit SHA + date.
- When a row's "Notes" reveals a new sub-task, split it into a child row indented under the parent (no separate table).
- Add a `RENDER-LOG.md` entry per session referencing which rows it advanced.
- Keep this file in commit-clean state — don't track in-progress scratch state here (use `RENDER-LOG.md` for that).
