# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
