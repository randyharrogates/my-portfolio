# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2026-05-12

### Added

- **(landing)** Six themed alcove pavilions around the hub — each with a half-hex shell (back wall + 2 side walls + ceiling + floor + brass corner pilasters + brass cornice), arched hub-facing opening, brass mount frame + shelf for content, central brass pedestal, and threshold strip. Built via reproducible Blender scripts: `projects-shell.py`, `projects-arch.py`, `projects-mount.py`, `projects-pedestal.py`. Alcoves at `HALL_ALCOVE_RADIUS = 14` (Session 20 2× scale), 60° intervals, oriented toward the hub centre by `alcoveAngle` / `alcoveFacing`. Replaces the placeholder half-hex primitives from Phase 0
- **(landing)** Per-alcove openness modes — `fully-open`, `half-open`, `translucent`, `gated` (Phase 9) — each rendering a different subset of shell pieces so the alcove "personality" matches its theme. Projects + contact are fully-open galleries; about + resume are half-open chambers (back-wall only); blog is a translucent library; skills is gated by a knee-height brass parapet
- **(landing)** Cathedral typology rebuild (Session 26) — rounded-top portal alcove arches with 3 vertical mullion bars + brass impost cornice replace the original Session 17 "pointed pentagon + hex tracery" cottage arches. Arch dimensions 16 m wide × 22 m tall (1:1.375), shoulder line at 14 m, semi-elliptical top swept across 24 segments. The impost cornice extends 0.6 m past the portal width on each side and protrudes 0.85 m proud of the wall plane, tying the arch springing to the shell cornice line
- **(landing)** Outer enclosing wall (asset 9.1) — dark concrete cylinder at `HALL_OUTER_WALL_RADIUS = 40` m, 28 m tall, 0.5 m thick, pierced by 6 rounded-top portal windows aligned to the alcove angles. Window cutter upgraded from a 5-vert pointed pentagon to a 15-vert rounded portal silhouette (half-elliptical top, 12 segments). Curved brass arc lintel (14 short box segments tracking the arc slope) replaces the old flat transom. Built by `blender/scripts/hub/outer_wall.py`
- **(landing)** Wakandan triangle relief motif — 2 rows × 6 triangles per wall section × 6 sections (72 prisms total) on the inner face of the outer wall, alternating point-up / point-down. Motif geometry joined into the brass `hub-outer-wall-frame` mesh so it reads as gold-on-dark Wakandan etching instead of disappearing into the dark wall slab
- **(landing)** Slim sentinel columns (Phase 9 reference realignment) — `blender/scripts/hub/columns.py` defaults rebuilt: 3 columns at 30° / 150° / 270° (was 6 between alcove gaps), shaft radius 2.20 → 0.80 (bottom) / 1.70 → 0.60 (top), 8-sided cross-section. Reads as decorative sentinel posts rather than load-bearing pillars; the new outer wall takes the structural weight
- **(landing)** Central hub planter (asset 8) — octagonal brass-rimmed stone planter (`blender/scripts/hub/planter.py`) at the hub centre, with a Pachira aquatica "money tree" centerpiece and 4 fern clumps as low-mid fill (PolyHaven CC0 alpha-mask leaf models). Anchors the orbital camera and gives the empty hub centre a focal point
- **(landing)** Six per-alcove content props built by Blender scripts — `about-timeline.py` (5-panel chronological wall), `projects-mount.py` + `projects-pedestal.py` (hologram mount + display plinth), `skills-badges.py` (revolving tool-badge crown), `blog-bookshelf.py` (5-shelf bookcase with procedurally-placed books, 8.4 m wide), `resume-column.py` (4.2 m tall hex-ribbed column), `contact-orbits.py` (3 concentric orbit rings + central node)
- **(landing)** Daylight Drakensberg HDRI (Session 26b) — `blender/scripts/atmo/skybox-bake.py` rebuilt as a procedural daytime sky: cyan zenith → pale azure → cream-white horizon glow → olive ground bottom, with a deep forest-green mountain silhouette band sculpted by low-frequency noise at elevation 0–5° above horizon. Replaces the earlier Wakandan-dusk magenta gradient. Output staged to `public/hdri/hall-vista.hdr` (~836 KB). Also ships the photographic `public/hdri/drakensberg-vista-1k.hdr` (1.5 MB) as a fallback option
- **(landing)** Door + 30 m corridor cinematic entrance (Phase 9) — `Entrance.tsx` mounts the door slab (clickable) + brass doorframe + 30 m hallway (floor, ceiling, two walls) + 6 sconce pairs at 5 m intervals + midpoint brass archway at 15 m. `HALL_DOOR_RADIUS = 70` m so the door sits well outside the outer wall. Phase machine in `HallLanding.tsx` sequences `intro → entering → interactive` with a 2.4 s fly through the corridor. Click the door or press Enter / Space to advance
- **(landing)** Boot cinematic with multi-waypoint path (`public/data/hall-boot-path.json`) — 4-waypoint Catmull-Rom polyline fly from `boot-start` (bird's eye) through `boot-corridor` (above the entrance corridor) → `boot-descent` → `hub-pose`. ~5.4 s total. Skippable via the `boot-skip-on` route entry. The polyline path is interpolated by `CameraDirector` via `THREE.CatmullRomCurve3` with centripetal parameterisation
- **(landing)** Drag-orbit + wheel-zoom + multi-waypoint flies in `CameraDirector.tsx` — pointer-event drag rotates the camera around the active target (yaw free 360° on hub, ±15° on alcoves), wheel-zoom dollies in/out (radius × [0.4, 3.0]), `flyWaypoints` prop drives polyline flies through intermediate poses. Pose-outside-cylinder skip-clamp added (Session 25b fix) so scripted intro / boot poses outside the new containment radius aren't yanked back inside
- **(landing)** Per-mesh AO + lightmap bake pipeline (`blender/scripts/bake/`) — Cycles-baked diffuse irradiance + ambient occlusion per named mesh, 512² PNG → KTX2 transcoded via basisu. Pipeline iterates `HUB_PIECES` in `_common.py` and re-exports each glb with a `UVMap_lightmap` second UV channel so three.js' `aoMap` / `lightMap` material slots get the right coords. 15 maps per pass; total KTX2 payload AO 432 KB + Lightmap 376 KB
- **(landing)** Procedurally-synthesised Hall audio — `blender/scripts/audio/generate-audio.py` outputs CC0 16-bit PCM WAVs at 44.1 kHz: `ambient-drone.wav` (30 s seamless loop, 3 sine partials at 60 / 80.6 / 119.3 Hz + 2 noise pads, LFO-modulated) + `whoosh-{1,2,3}.wav` (resonant bandpass white noise sweeps for camera transitions). Loaded by `HallAudio.tsx` via Web Audio
- **(landing)** Color-graded Hall postprocessing — Hall-specific LUT (`public/luts/hall-wakandan.png`, generated by `scripts/generate-lut-hall.mjs`) layered on top of the existing SMAA + N8AO + Bloom + Vignette + ACES chain. Cooler Wakandan-leaning palette vs the Workstation's warm-evening LUT
- **(landing)** PolyHaven plant assets — `hub-plant-pachira.glb` (5.6 MB, Pachira aquatica with bark + leaves PBR maps) and `hub-plant-fern.glb` (1.7 MB, fern with alpha-masked fronds) staged in `public/models/hall/`. PolyHaven source assets cached in `blender/exports/polyhaven/` for re-bake provenance
- **(landing)** `HallLoader.tsx` + CSS — animated loading state shown while the Suspense graph resolves the GLBs + HDRI + textures on first visit
- **(build)** Basis Universal transcoder shipped at `public/basis/basis_transcoder.{js,wasm}` so KTX2 textures can be decoded in-browser

### Fixed

- **(landing)** Door + boot cinematic only fired on the very first visit per device (localStorage-persisted) — migrated `landing.hall.entered` + `landing.hall.bootSeen` from `localStorage` → `sessionStorage` (Session 25 follow-up), so the corridor cinematic now replays on every fresh browser tab. In-tab navigation still respects the cached state. Mirrors the pattern already used by `WorkstationLanding.tsx`
- **(landing)** Camera containment regression — Phase 9 set `CAMERA_MAX_R = HALL_OUTER_WALL_RADIUS - 0.5` (39.5 m) but the intro door pose sits at radius 73.2 m. `clampToCylinder` was yanking the camera back inside the outer wall on every idle frame, so the door was never visible after `sessionStorage` made the intro actually replay (Session 25b). Fix: skip the cylinder clamp when the canonical pose itself sits outside the cylinder (`poseR > CAMERA_MAX_R`)
- **(landing)** Door slab invisible in the dim dusk HDRI — door colour `#1a1410` → `#221912` and emissive intensity 0.04 → 0.10 so the slab silhouettes against the sky without glowing

### Changed

- **(perf)** Phase 1 strip + diet (Session 27) — Canvas-level shadows disabled (`shadows={false}`), cathedral sun directional light with 2048² shadow map removed entirely, `<SunBeam>` volumetric cone shader removed from `Atmosphere.tsx`, dust motes 6000 → 1500 (low-fi 2000 → 800), outer wall triangle motif relief halved (rows 4 → 2, depth 0.18 → 0.08 m). Browser pass: ~1 fps → ~35 fps steady-state (≈35× reclaim) on consumer Apple Silicon
- **(landing)** Removed inner hub parapet walls (Session 25) — `<HubWalls />` and its 6-panel placement helpers deleted from `Hub.tsx`. The Phase 2 brass-framed dark-teal panels at radius ~12 m between columns added no architectural meaning and visually boxed in the hub plaza. The new outer wall at 40 m provides the proper enclosure
- **(landing)** Outer wall material rebuilt as matte dark concrete (Session 25c) — `metalness: 0.3 → 0.0`, `roughness: 0.55 → 0.95`, `color: "#2a3540" → "#10161c"`, `emissive: "#3a4858" → "#161e26"` at intensity 0.5 → 0.18. The previous slate-blue + metallic mix was reflecting the magenta horizon band of the HDRI and competing luminance-wise with the sky; now the wall silhouettes against the bright sky cleanly
- **(landing)** Per-alcove theme accent emissives muted (Session 26c) — wall material `emissiveIntensity` 0.05 → 0.02 (hover 0.16 → 0.08); glass material base colour `accent` → neutral dark teal `#1a2228` with accent surviving only in `attenuationColor`; tracery brass accent emissive 0.35 → 0.15. Stops the blog alcove from reading as a flat purple panel against the daylight palette
- **(landing)** Daylight `Lighting.tsx` retune (Session 26c) — ambient 0.22 → 0.45 + colour `#8aa4b8 → #c8d4e0`; dome key 3.4 → 2.0 + colour `#cfdfee → #e0eaf2`; floor-up emerald fill 1.6 → 0.8; skylight halo 2.2 → 1.4. Pivoted from the dusk-era "cool dome key + emerald floor bounce against magenta HDRI" to a softer daylight profile that lets the new HDRI carry the colour identity
- **(landing)** Scene `Environment` retuned for daylight HDRI — `backgroundIntensity: 0.75 → 0.65`, `environmentIntensity: 0.85 → 0.55`, `backgroundBlurriness: 0.05 → 0.08`. Fog colour `#2a2418` (warm brown) → `#8090a0` (cool atmospheric haze) matching the new palette
- **(docs)** Removed obsolete Hall planning docs — `blender/MOODBOARD.md` (134 lines), `blender/RENDER-LOG.md` (278 lines of session-by-session bake notes), `blender/ASSET-PLAN.md` (101 lines), `blender/README.md` (115 lines), `public/audio/hall/CREDITS.md`. Git history preserves the originals; the regeneration command for the procedural audio is documented in the generator script's docstring
- **(assets)** Cleaned ~200 orphan reference / debug screenshots — 117 `blender/renders/*.png` (the side-by-side ref-vs-build shots for the deleted RENDER-LOG) + 83 root-level `hall-*.png` / `phase4-*.png` / `session1?-*.png` / `session2?-*.png` showcase + debug screenshots from earlier iterative sessions. `public/textures/hall/mote-noise.png` (unreferenced) also removed; only `mote-sprite.png` is loaded at runtime

## [0.7.0] - 2026-05-11

### Added

- **(landing)** Hall of Zero Limits 3D landing system at `/#/hall` — central hexagonal rotunda (hub) with six alcoves arrayed at 60° intervals, one per section (about, projects, skills, blog, resume, contact). Lazy-loaded via `React.lazy` so the main bundle is untouched; existing Workstation at `/` continues to be the default landing throughout the build-out
- **(landing)** `CameraDirector.tsx` — N-target Bezier camera path system with cubic ease-in-out (1.2s flies between named viewpoints), idle hub orbit, and bird's-eye boot-sequence pose. Supersedes the single-target dolly in the Workstation
- **(landing)** Hologram screen shader (`Hologram.tsx`) — curved-plane GLSL with chroma aberration, rolling scanlines, fresnel rim, time-modulated flicker, normal-blended alpha derived from content luminance. One per alcove, tinted by `HALL_THEMES[id].hologramColor`
- **(landing)** Per-alcove procedural hologram content — `AboutTimeline`, `ProjectTiles`, `SkillConstellation`, `BlogFeed`, `ScrollingResume`, `ContactArray`. All canvas-rendered, pull from existing `src/data/portfolio.ts` (no data duplication), uploaded as `THREE.CanvasTexture` to the hologram material
- **(landing)** `HallLanding.tsx` — Canvas host with keyboard nav (`1–6` jumps to alcoves, `0` returns to hub, `M` toggles map, `Esc` clears), bidirectional URL hash sync (`/hall/<alcove>`), boot sequence gated by `localStorage.getItem('landing.hall.bootSeen')`, and a "skip to terminal" escape hatch
- **(landing)** Top-down map overlay (`Map.tsx`) — six labeled hex tiles arranged around the hub; click a tile to fly the camera; press `M` again or `Esc` to dismiss. The "Hall image 3 style" wayfinding mockup from the original design brief
- **(landing)** Hall HUD overlay — phase chip, map/audio/fidelity toggles, dynamic lower-third caption per active target, FPS counter, keymap hint, "back to workstation" link. Separate from the Workstation HUD so its styling can diverge
- **(landing)** Procedural Web Audio synth (`HallAudio.tsx`) — ambient drone + per-transition whoosh + per-alcove shimmer. Replaces a CC0 sample library for first pass; samples can layer in later. Mute persists across navigation
- **(landing)** Hall postprocessing chain — SMAA + N8AO + Bloom + Vignette + ACES tone-mapping. Tuned for the cooler hub palette vs the warm Workstation route; both routes share the same post pipeline but with different intensities
- **(landing)** Hall atmosphere — god-ray cone from the dome skylight, pulsing floor-glow rings, particle motes (~250–600 instances depending on fidelity), depth-haze fog tinted to the hub palette. Each layer gated on `!lowFidelity && !reducedMotion`
- **(landing)** Six themed alcoves (`Alcove.tsx`) — half-hexagonal pavilions with arched hub-facing arches, back-wall-mounted holograms, practical fill light per alcove, click hit-volumes for camera flyovers. Orientation math (`alcoveAngle` / `alcoveFacing` / `alcoveCentre` / `alcoveFocalPose` in `sections.ts`) keeps geometry, camera poses, and the map overlay in sync from one source of truth
- **(landing)** Hub hexagonal floor — first Blender-MCP-generated asset, replacing the placeholder cylinder pair. 6-sided slab (vertex-radius 3m, 0.10m thick, 0.04m angle-bevel) + nested 80%-ratio hex inlay disk. Flat edges align with the six alcove directions
- **(landing)** 6 brass columns at hex-edge midpoints — single column glb (hex base + tapered hex shaft + hex capital, total 5.5m matching `HALL_CEILING_HEIGHT`) built via Blender MCP, instantiated 6× in `HubColumns` at three.js angles 30°/90°/150°/210°/270°/330° so each column flanks two adjacent alcoves without blocking either arch. Replaces the 8-column primitive placeholder. Built by `blender/scripts/hub/columns.py`
- **(landing)** Ornamented column base + capital (asset 2.3) — replaced the plain hex-prism base and capital with 5-tier hex stacks joined into one mesh per part, alternating 30°/0° rotation between adjacent tiers for a stepped staircase silhouette. Profile uses classical architecture terminology (plinth/torus/apophyge for the base; neck/echinus/abacus for the capital). 60 verts / 40 faces per part, ~132 verts/column total — well under the 8k/column budget. Honest ~4-5/10 ornament density vs reference; real Wakandan-carved tracery stays the Phase 2 decision-point question
- **(landing)** Faceted geodesic dome ceiling (asset 2.4) — replaced the smooth-half-sphere placeholder with a subdivided icosphere (subdiv 2, top half only, flat shaded, Y-scaled 0.65 → 2.93m dome height above z=5.5m). Ships as `hub-dome.glb` with two named meshes: `hub-dome-shell` (40-tri faceted interior, BackSide-rendered, dark teal w/ subtle emissive) and `hub-dome-lattice` (Wireframe-modifier duplicate, brass-emissive DoubleSide ribs). Built by `blender/scripts/hub/dome.py`. Distinctly more Wakandan-coded read than the smooth sphere — geodesic facets + brass ribs match the angular sci-fi vocabulary
- **(landing)** Six hex-edge parapet wall panels (asset 2.5) — short brass-framed walls connecting adjacent columns at floor level, forming a continuous hex ring around the hub. Each panel is 3m × 1m × 0.08m with two named meshes: `hub-wall-slab` (dark teal background) + `hub-wall-frame` (top + bottom + left + right brass bars joined with a decorative mid-slat). Built by `blender/scripts/hub/walls.py`; instantiated 6× by `HubWalls` at three.js angles 30°/90°/150°/210°/270°/330° with `rotation.y = π - θ` so each panel faces the hub centre. Intentionally short so alcove arches stay visible above the parapet — biggest single-session visual upgrade so far, gives the hub real architectural identity
- **(landing)** Hex skylight aperture (asset 2.6) — replaced the 32-segment circle `ringGeometry` placeholder with `hub-skylight.glb` containing a 6-vert hex donut (24 verts / 24 faces, built via bmesh ring-bridge) + nested hex emissive disc. Mounted at `y = HALL_CEILING_HEIGHT + 0.05` so the existing volumetric god-ray cone in `Atmosphere.tsx` continues to spawn from the same point. Built by `blender/scripts/hub/skylight.py`. Small geometry change but consistency win — every hub element now reads as hexagonal
- **(landing)** PolyHaven PBR materials for hub brass + floor (assets 2.7 + 2.8) — downloaded PolyHaven `metal_plate_02` (brass surrogate) and `concrete_floor_02` (dark floor) 1k JPG map sets via Blender MCP. New `useBrassMaterial` + `useFloorMaterial` hooks in `Hub.tsx` use drei's `useTexture` to load diffuse + GL-normal + roughness maps, clone the textures per-material so each surface (column shaft / base / capital / wall frame / dome lattice / skylight ring / floor inlay / floor slab) can tile the same source independently, and apply `MeshStandardMaterial` with brass tint (`#b8862a`, metalness 1.0) for the brass set and dark-concrete tint (`#3a4a4e`, metalness 0.1, roughness 0.85) for the floor
- **(assets)** `public/textures/hall/{brass,floor}/*.jpg` — six PolyHaven CC0 texture maps (~1.5MB total) staged for the Hall route. Mirrors the existing `public/textures/floor-concrete/` pattern used by the Workstation. AO maps saved alongside but not yet wired (three.js needs uv2 attribute; deferred)
- **(landing)** Atmosphere floor-glow rings + Hub outer ring — `RingGeometry` segments swapped from 64 → 6 so the entire hub reads as hexagonal. Without this, the circular rings dominated and the hex floor was barely legible from the idle-orbit camera pose
- **(blender)** `blender/` repo-root pipeline — `scripts/common/{export.py, pbr.py, motif.py}` helpers; `scripts/hub/floor.py` deterministic builder for the hexagonal floor; `mcp-setup/` with the ahujasid/blender-mcp addon staged + headless installer; `MOODBOARD.md`, `RENDER-LOG.md`, `ASSET-PLAN.md`, `README.md` planning docs
- **(blender)** `.mcp.json` at repo root — Claude Code MCP config wiring `uvx blender-mcp` so live geometry generation works from this chat
- **(assets)** `public/models/hall/hub-floor.glb` — 13KB uncompressed glb, first piece of real Blender geometry shipped to the React side
- **(docs)** `blender/ASSET-PLAN.md` — single source of truth for every Blender asset planned across Phases 2/4/5/6/8, with status emojis and budget targets per zone
- **(docs)** `blender/RENDER-LOG.md` — per-session record of what shipped, gotchas resolved, time spent; entry 1 captures the Draco-decoder and `<primitive object={scene}>` lessons so session 2+ doesn't re-discover them

### Fixed

- **(landing)** Hex floor no longer invisible — Phase-1 export used Draco level 7 (4.3KB), but the React app doesn't register a `DRACOLoader`, so `useGLTF` suspended forever (silently, no thrown error). Switched `scripts/common/export.py` default to `use_draco=False` (still parameterizable for future hero assets when a decoder is wired). Re-exported to 13KB
- **(landing)** Hex-floor materials weren't overriding via `<primitive object={scene}>` — the path traverses-and-assigns but glTF-loaded child nodes inside an unmounted primitive ignore React-side material assignment. Switched `HubFloor` to extract `BufferGeometry` from named meshes via `useMemo([scene])` and mount as plain `<mesh geometry={...}>` with explicit `material={...}` — works reliably and gives React full control over shadows/transforms

### Changed

- **(routing)** `src/App.tsx` — added `/hall` and `/hall/<section>` HashRouter routes mapping to the lazy-loaded `HallLanding`. Existing Workstation route at `/` untouched. Global ESC handler now skips Hall paths so Hall manages its own escape behavior
- **(landing)** `src/landing/sections.ts` — extended with Hall-specific scene config: `HALL_HUB_RADIUS`, `HALL_ALCOVE_RADIUS`, `HALL_CEILING_HEIGHT`, `HALL_ALCOVE_ORDER`, alcove pose math (`alcoveAngle` / `alcoveFacing` / `alcoveCentre` / `alcoveFocalPose`), `HALL_HUB_POSE`, `HALL_BOOT_POSE`, `HALL_THEMES` palette, `buildHallTargetPoses` helper for the CameraDirector. Workstation config untouched
- **(landing)** `src/landing/HUD.tsx` — small adjustments so the HUD doesn't collide with the Hall route (Hall has its own HUD overlay; the legacy HUD stays mounted for the Workstation)
- **(config)** `.claude/settings.json` — permissions adjusted for the Blender MCP + Playwright tooling used during the session

## [0.6.0] - 2026-05-11

### Added

- **(landing)** Implied half-room (`Room.tsx`) — warm-grey back wall with a rectangular window cutout, four-strip wall geometry around the opening, four-bar window frame plus a horizontal mullion, an emissive vertical-gradient exterior sky tinted by `tint.rim`, ~400 instanced city-light specks twinkling via a per-point sin-seed shader, an emissive moon + halo, and an optional glass pane using `MeshPhysicalMaterial` transmission. Replaces the flat back wall that used to live in `Desk.tsx`. Glass falls back to thin `MeshBasicMaterial` on low-fidelity.
- **(landing)** GLTF prop pipeline — `useFittedGltf` hook clones a loaded GLTF, scales it so its X-extent matches a target width, and exposes scaled Y/Z bounds so downstream components can ground the model on the floor and avoid intersections with desk geometry regardless of the GLTF's authored pivot. `AssetBoundary` error boundary renders the existing primitive build if the GLB 404s in production.
- **(landing)** GLTF mechanical keyboard, ceramic mug, office chair, and server tower — each lives in `public/models/*.glb` (~3 MB chair, sub-MB others), preloaded via `useGLTF.preload`, with the original primitive geometry retained as a Suspense + ErrorBoundary fallback so first paint isn't blocked
- **(landing)** Reflective desk top — `MeshReflectorMaterial` plane sits on top of the brushed-metal body so monitors, mug, plant, and keyboard cast soft reflections onto the desk. Gated `!lowFidelity && !reducedMotion` to skip the per-frame mirror RT cost
- **(landing)** PBR brushed-concrete floor — Poly Haven CC0 albedo + normal + roughness + AO maps (`public/textures/floor-concrete/`) with `RepeatWrapping` 8×8 and anisotropy 4, replacing the flat `#0a0908` plane
- **(landing)** Volumetric god-ray light shafts (`LightShafts.tsx`) — cone geometry with additive front-facing blending fakes scattered light from the key spotlight + ceiling wash. Cheap (two cone meshes), atmospheric, and respects the warm-evening time-of-day tint
- **(landing)** HDR environment lighting — `public/hdri/warm-evening-1k.hdr` (1.1 MB) preloaded for IBL reflections on metals; previously the scene synthesized its env map from preset colors
- **(landing)** LUT color grading — bakes the warm-evening look into a 32-slice `LookupTexture` via the new `scripts/generate-lut.mjs` Node script, lazy-loaded in `Postprocessing.tsx` so first paint doesn't block on PNG decode
- **(landing)** Real depth-of-field (idle camera only) — `<DepthOfField>` mounted before `<Bloom>` in the post chain with `multisampling=0`, sidestepping the Chrome/ANGLE GL_INVALID_OPERATION conflict that originally forced `<TiltShift2>` as a stand-in. Auto-disabled when a monitor is focused so screen content stays crisp
- **(landing)** PCSS-style soft shadows via drei `<SoftShadows size={25} focus={0.5} samples={8}>` — penumbra tightens at contact (desk-leg foot) and softens at floor distance
- **(landing)** Grounding via drei `<ContactShadows>` — single shadow plane under the workstation that captures chair, plant, monitor stalks, and mug to the floor. Cheaper than baking per-light shadow maps and reads as proper contact
- **(landing)** Leaf subsurface translucency — `GltfPlant` upgrades green-dominant materials on the loaded model to `MeshPhysicalMaterial` with `transmission: 0.25`, `ior: 1.4`, `side: DoubleSide` so backlight from the window shows through foliage. Disposers attached so replaced materials are released on unmount
- **(landing)** Magnetic monitor hover — each `Monitor` springs forward + scales up + tilts 2° toward the camera on hover via a damped lerp on a hover-progress ref; reduced-motion users get a 35%-magnitude version that still reads as feedback
- **(landing)** Camera overshoot/settle — `CameraRig` pushes the camera 4% past the focus target between dolly progress 0.85 → 1.0, then eases back, so monitor focus arrivals land instead of stopping flat
- **(landing)** ESC clears focus dolly — pressing Escape from the workstation now exits a focused monitor and returns to the idle pose, mirroring the HUD hint. Previously ESC only worked once a section route had loaded
- **(a11y)** Skip link in `HUD` — visually hidden until focused, jumps Tab-from-URL-bar users straight to `/#/about`
- **(a11y)** Per-monitor invisible HTML button overlay rendered via drei `<Html>` — gives each monitor an accessible name (`Open <Section> section`), keyboard activation (Enter/Space → same handler as the 3D click), Tab order matching SECTIONS order, and a visible emissive focus ring drawn behind the bezel when focused
- **(a11y)** Arrow-key spatial nav between monitors — `ArrowLeft/Right/Up/Down` picks the neighbour with the best directional projection minus orthogonal-drift penalty, so a "right" step doesn't jump diagonally when a same-row neighbour exists
- **(assets)** `public/models/{keyboard,mug,chair,tower}/` — GLB files served directly from `public/` (zero JS bundle delta)
- **(assets)** `public/hdri/warm-evening-1k.hdr`, `public/luts/warm-evening.png`, `public/textures/floor-concrete/*.jpg` — HDRI, LUT, and PBR floor textures
- **(scripts)** `scripts/generate-lut.mjs` — Node script that bakes a warm-evening grade into a 32-slice 3D LUT PNG for `LookupTexture.from`

### Fixed

- **(landing)** Chair no longer intersects the desk volume — `ChairGltf` now derives its Z position from the chair model's scaled bounding box (`CHAIR_MIN_Z - worldMinZ`) so the back of the chair sits at world Z = 1.1 (0.3m clear of the desk front face at Z = 0.8) regardless of where the GLTF's authored pivot lives along the Z axis. Previously, a literal `position.z` placed the pivot — not the back edge — so an off-center pivot let the backrest poke up through the desk top
- **(landing)** Volumetric god-ray shafts no longer dominate the frame — key beam intensity halved (0.08 → 0.04) and ceiling beam reduced (0.04 → 0.025) so the additive cone reads as warm-evening atmosphere instead of a stage spotlight. The underlying `<spotLight>` illumination on the desk is untouched

### Changed

- **(landing)** Chair shifted off-center to the left (X = 0 → -0.6) so the desk's center frame stays open under the keyboard / mug / plant instead of being dominated by a chair backrest. The fallback `ChairPrimitive` gets the same offset so there's no flicker on Suspense swap
- **(landing)** Desktop DPR ceiling lowered 2.0 → 1.5 — single biggest perf win for retina full-fidelity (pixel-shaded work drops ≈ 64%) with near-invisible quality cost since geometry is still oversampled. Mobile and low-fidelity branches stay at 1.0
- **(landing)** Shadow map size 4096 → 2048 on both key + ceiling spotlights — saves ≈ 24 MB of GPU memory and halves texel sample cost; at the desk's scale and idle camera distance, the higher resolution wasn't perceptibly sharper
- **(landing)** SoftShadows sampling 12 → 8 (≈ 33% cheaper shadow shader) — penumbra still reads as soft PCSS
- **(landing)** ContactShadows recompute cadence 30 → 20 frames, resolution 512² → 384² — keeps the grounding shadow tight without re-rendering the scene to a high-res RT every frame
- **(landing)** Dust particle counts reduced — ambient `Dust` 180 → 40 with opacity 0.30 → 0.08, and `DustBeam` 320 → 160. The fewer-but-brighter ambient motes plus the more populated beam read the same at viewing distance for half the per-frame vec3 work
- **(landing)** Light intensities rebalanced — key spotlight 2.9 → 1.8, rim point 2.0 → 1.4, ceiling wash 1.3 → 0.75. The previous values were tuned before IBL + LUT were in the pipeline and overdrove the tonemapper; current values let the HDRI and LUT contribute to surface response instead of being saturated out
- **(landing)** Fog density 0.085 → 0.11 so the back wall and city-light specks fall off more gradually, deepening the room's perceived depth
- **(landing)** Postprocessing pipeline switched from `multisampling=4` (MSAA) to `multisampling=0` + `<SMAA>` — necessary for `<DepthOfField>` + `<Bloom>` to share the depth/stencil attachment without GL_INVALID_OPERATION on Chrome/ANGLE; SMAA gives cleaner bezel and window-mullion edges than the MSAA it replaces
- **(landing)** Reduced-motion users skip the idle camera B-roll drift entirely — the camera holds the idle pose instead of slowly orbiting

## [0.5.0] - 2026-05-11

### Added

- **(landing)** Detailed potted plant — Poly Haven CC0 `potted_plant_04` (1k diffuse + normal + ARM textures, ~2.1 MB) loaded via drei `useGLTF`, replacing the 12 extruded-teardrop primitives so leaf veins, translucency and specular highlights actually read. Primitive plant retained as `lowFidelity` fallback so reduced-motion / low-power viewers skip the asset hit
- **(landing)** Procedural ceramic mug — 1024 × 256 canvas-rendered "RANDY'S WORKSTATION" label tiles around the cylinder with accent-orange rim bands; switched body + handle to `meshPhysicalMaterial` with `clearcoat=1.0` / `clearcoatRoughness=0.06` for ceramic glaze; cylinder radial segments 18 → 32 so the silhouette rounds correctly under the spotlight
- **(assets)** `public/models/potted_plant_04/` — gltf + bin + 3 JPEG textures, served directly from `public/` (zero JS bundle delta)

### Changed

- **(landing)** Plant repositioned forward (z = -0.45 → 0.10) so it no longer occludes the SKILLS monitor stalk from the default landing pose
- **(landing)** Desk surface now reads as brushed aluminum — wood-grain `onBeforeCompile` shader replaced with anisotropic brush streaks along world-Z, low-amplitude roughness variation, and a worldspace edge mask that fakes AO grounding toward the desk perimeter; base material `#3a3531`, metalness 0.78, clearcoat 0.25
- **(landing)** IBL `environmentIntensity` 0.55 → 1.15 so the warm-evening HDRI actually drives reflections and PBR specular on metallic / ceramic surfaces
- **(landing)** CRT shader brightness multiplier 3.4 → 2.2 — the previous value pushed monitor pixels so far through ACES that surrounding desk/plant detail tone-mapped into mush; screens still read bright while the scene preserves dynamic range
- **(landing)** Monitor text resolution 4× — `MonitorContent.ts` now backs every screen canvas with a 4× DPR buffer (`TEXT_DPR = 4`) and bumps texture anisotropy 4 → 16; ABOUT / PROJECTS / SKILLS / BLOG / RESUME / CONTACT readouts no longer alias when the camera dollies in
- **(landing)** Sharper key + ceiling spotlight shadows — `shadow-mapSize` 2048 → 4096 on both lights (mobile / low-fidelity branch unchanged at 256²)
- **(landing)** Desktop DPR cap raised 1.5 → 2.0 so retina viewers get crisper edges; mobile + low-fidelity branches stay at 1.0
- **(landing)** MSAA enabled (`multisampling=4`) in `EffectComposer` and bloom tightened (`luminanceThreshold` 0.5 → 0.7, intensity 0.85 → 0.55, focused 1.05 → 0.7) so highlights bloom selectively instead of flooding the whole scene

## [0.4.0] - 2026-05-10

### Added

- **(landing)** Aspect-aware idle camera — on portrait viewports the camera pulls back to `[0.5, 2.0, 5.5]` and widens FOV from 42° to 52° so all 6 monitors fit on a phone in portrait orientation; resize / orientationchange swaps the pose live via `useViewportAspect()` and refs threaded through `CameraRig`
- **(landing)** Touch support for drag-orbit — single-finger drag rotates the camera (existing 4 px threshold + yaw/pitch clamps preserved); listeners now use `setPointerCapture` on the wrapper so a wandering finger keeps streaming events
- **(landing)** Two-finger pinch-to-dolly — pinch-zoom maps to camera orbit radius clamped to `0.6×–1.5×` of the idle distance; pinch→single transition re-arms the drag baseline so no snap, and a tap-after-pinch can't accidentally focus a monitor
- **(landing)** Desk-top photo frame — `FramedPhoto` moved off the back wall onto the desk surface (left of the keyboard, with a slight forward tilt and a small easel stand) so the GitHub avatar reads from the idle camera pose instead of floating awkwardly behind the workstation
- **(landing)** Wide ceiling spotlight that washes the whole desk surface — replaces the removed task lamp; intensity follows `tint.intensityScale` so it tracks the existing time-of-day grading and casts soft 2K shadows when fidelity allows
- **(landing)** HDRI environment lighting via drei `<Environment preset="apartment" environmentIntensity={0.35}>` for image-based ambient reflections on metallic surfaces (gated `!lowFidelity`)
- **(landing)** Volumetric dust beam — cone-shaped `<DustBeam>` particle field beneath the new ceiling spot gives a visible god-ray feel without paying for a `GodRays` postprocessing pass (gated `!lowFidelity`)
- **(landing)** Cinematic SSAO via `<N8AO>` and screen-space tilt-shift via `<TiltShift2>` — TiltShift2 fakes the depth-of-field look without re-introducing the Bloom + DOF `GL_INVALID_OPERATION` conflict on Chrome/ANGLE

### Fixed

- **(landing)** Mobile brightness regression — `Postprocessing` now mounts a minimal `<EffectComposer>` containing only `<ToneMapping mode={ACES_FILMIC}/>` on low-fidelity (mobile / reduced-motion); the CRT shader's `col *= 4.6` brightening compresses correctly into [0, 1] instead of being GPU-clamped, restoring the glowing-monitor look on phones
- **(landing)** Touch gestures consumed by browser default pan/scroll — added `touch-action: none` and `user-select: none` to `.landing-bleed` so the 3D scene receives pointer events directly (inner pages still pinch-zoom normally)

### Changed

- **(landing)** Removed the cursor-tracking desk lamp (`Lamp` component, `cursorWorldRef`, world-raycasting branch of `CursorTracker`) — the green status LED ring no longer occludes the right-side monitors; the new ceiling spotlight covers the same fill-light role
- **(landing)** Stronger Bloom — intensity 0.95 → 1.15, threshold 0.5 → 0.35, radius 0.82 → 1.0 so monitor emissives glow more visibly against the ACES tone-map
- **(landing)** Sharper soft shadows — Canvas now requests `shadows`, `gl.shadowMap.type = THREE.PCFSoftShadowMap`, output color space pinned to `THREE.SRGBColorSpace`, and key-light + ceiling-spot shadow map size raised 1024 → 2048 (mobile branch stays at 256²)
- **(landing)** `envMapIntensity={0.8}` set on 17 metallic surfaces (desk wood + legs, monitor stalks / base discs / bezels, mug, server tower, brushed-metal panel, server lid, rack panel, chair pedestal + wheels, photo frame + easel) so the new HDRI actually contributes to specular response
- **(styles)** Cap inner-page content width at 1100 px so wide monitors don't render terminal pages edge-to-edge — `.terminal-content > *` now centers with auto margins
- **(pages)** Resume page wrapper switched to a flex column layout so the embedded PDF viewer stretches to fill available terminal height instead of using a fixed `calc(100vh - 260px)` window
- **(assets)** Refreshed `resume.pdf` from the source `.tex`

## [0.3.0] - 2026-05-10

### Added

- **(landing)** Click-and-drag turntable orbit on the 3D workstation — yaw clamped to ±π/3, pitch clamped to ~14°–99° so the camera never tips above the ceiling or under the desk; layered on top of cursor parallax
- **(routing)** "← workstation" button in the title bar of every inner page, returning to the 3D landing in a single click (ESC also navigates home)

### Fixed

- **(landing)** Brightened monitor previews — softened the postprocessing vignette (darkness 0.78→0.42), raised the bloom threshold, flattened the CRT shader's internal scanline + vignette multiply-down, and lifted the canvas baseline so BLOG / RESUME / CONTACT screens render legibly instead of nearly black

### Changed

- **(routing)** Removed the inner-page tab strip and arrow-key tab navigation — the 3D monitors are now the sole entry point to each section, reinforcing the "monitor is the doorway" metaphor; `/projects` sub-navigation is preserved for drill-down between credit-memo / kyb-pipeline / fine-tuning

## [0.2.0] - 2026-03-08

### Added

- **(pages)** Resume page with embedded PDF viewer and download button
- **(pages)** Ecommerce project detail page for VietMala Eatery (VueJS)
- **(pages)** Holiday Booking project detail page (Flask, JavaScript, SQL)
- **(pages)** HRM System project detail page (React, Express, MongoDB, Docker)
- **(pages)** Multi-Agent RAG project detail page for Dating Plan AI Agents (LangGraph, FastAPI, Pinecone)
- **(pages)** Speech-to-Text project detail page (OpenAI Whisper, FastAPI, Docker)
- **(assets)** Resume PDF added to public directory for web access
- **(deps)** Added @testing-library/jest-dom and @testing-library/react dev dependencies

### Changed

- **(pages)** Refactored Projects page from expandable card grid to sub-tab navigation with nested routes
- **(pages)** Simplified main navigation — removed individual project tabs, consolidated all projects under single projects tab
- **(pages)** Removed redundant prompt-line headers and back buttons from CreditMemo, KybPipeline, and FineTuning pages
- **(routing)** Added wildcard route for projects and new resume tab in main navigation
- **(deps)** Downgraded react-router-dom from v7 to v6 for CRA compatibility
- **(docs)** Rewrote README.md with proper project documentation
- **(resume)** Updated resume content with Napshot Pte. Ltd. experience details
- **(test)** Updated App test to verify terminal app renders correctly

## [0.1.1] - 2026-03-08

### Added

- **(config)** Claude Code configuration with custom agents, skills, and commands
- **(docs)** Project documentation for coding standards, design philosophy, and project structure
- **(resume)** LaTeX resume source file

### Changed

- **(config)** Updated .gitignore with additional exclusions
- **(docs)** Updated CLAUDE.md with expanded project documentation
- **(resume)** Updated Resume.pdf

## [0.1.0] - 2026-03-07

### Added

- **(pages)** Terminal-themed portfolio with macOS window aesthetic, dark warm theme, and JetBrains Mono font
- **(pages)** Blog section with expandable post cards covering AI and Finance topics
- **(pages)** Credit Memo and KYB Pipeline project detail pages
- **(pages)** Full-viewport terminal with 2-column responsive layouts across all tabs
- **(deploy)** GitHub Actions workflow for automatic deployment to GitHub Pages
- **(scripts)** Launch script for dev server with auto-dependency installation
- **(docs)** CLAUDE.md with dev commands and architecture notes

### Fixed

- **(deploy)** GitHub Pages deployment switched to Actions-based deployment instead of branch-based
- **(deploy)** Added workflow_dispatch trigger and fixed Actions permissions
- **(scripts)** Launch script auto-installs dependencies if node_modules missing

### Changed

- **(pages)** Blog readability improvements with larger fonts, better contrast, and X source links
- **(pages)** Blog color contrast and visual hierarchy enhancements for accessibility
- **(pages)** Portfolio content updated with latest resume details and expanded tech stack
- **(resume)** Added resume to repository
