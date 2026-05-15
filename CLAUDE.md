# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Start dev server at http://localhost:3000
npm test           # Run tests (interactive watch mode)
npm test -- --testPathPattern=App  # Run a single test file
npm run build      # Production build (outputs to build/)
npm run deploy     # Build and deploy to GitHub Pages (runs predeploy first)
```

## Deployment

This site is deployed to GitHub Pages at https://randyharrogates.github.io/my-portfolio.

- Primary deployment: GitHub Actions workflow (`.github/workflows/deploy.yml`) triggers on push to `master`, builds the app, and deploys via `actions/deploy-pages`
- Manual deployment: `npm run deploy` uses `gh-pages` package to push `build/` to the `gh-pages` branch

## Architecture

A single-page React 19 + TypeScript portfolio site, bootstrapped with Create React App. The UI is styled as a **terminal/CLI emulator** with a title bar, tab navigation, and status bar.

**Routing:** Uses `HashRouter` (not `BrowserRouter`) — required for GitHub Pages compatibility, since there's no server-side routing. All routes are hash-based (`/#/`, `/#/fine-tuning`).

**Adding a new page:** Requires two changes in `src/App.tsx`:
1. Add an entry to the `TABS` array (controls tab navigation order and labels)
2. Add a corresponding `<Route>` inside `<Routes>`

**Pages** (`src/pages/`):
- `AboutMe.tsx` — Home/landing (`/`). Fetches GitHub user profile via REST API.
- `Projects.tsx` — Project showcase (`/projects`)
- `Skills.tsx` — Skills overview (`/skills`)
- `CreditMemo.tsx`, `KybPipeline.tsx`, `FineTuning.tsx` — Individual project detail pages
- `Resume.tsx` — Resume page (`/resume`). Displays `public/Resume.pdf`. Resume content is authored in `resume.tex`. After any `.tex` edit, recompile and replace the PDF: `tectonic resume.tex && cp resume.pdf public/Resume.pdf`.
- `Blog.tsx` — Blog posts (`/blog`)
- `Contact.tsx` — Contact info (`/contact`)

**Navigation:** Arrow-key keyboard navigation between tabs is implemented in `App.tsx` via a `keydown` event listener.

**Styling:** Bootstrap 5 + Bootstrap Icons via npm. JetBrains Mono font via Google Fonts CDN. Each page has a co-located `.css` file.

**Static assets** (images, screenshots) live in `public/` and are referenced with relative paths.

**Base href:** `public/index.html` sets `<base href="/my-portfolio/">` for correct asset resolution on GitHub Pages.

## Portfolio Data Source

`src/data/portfolio.ts` is the single source of truth for personal content (identity, tech stack, roles, certifications, education, interests, social links). `AboutMe.tsx` consumes it directly; the ambient 3D layer also reads from it. Editing `portfolioData` here propagates everywhere — never duplicate content into a component.

## /hall landmark authoring — Cycles bake workflow for Genshin hand-painted look (REVISED 2026-05-15)

**Rule — no exceptions:** every mesh that ships in a `/hall` landmark GLB carries a baked **hand-painted** diffuse texture. Walls, roofs, windows, doors, chimneys, shutters, rocks, plants, ground, props, trees, grass — **everything**. The only meshes allowed to ship without a bake are emissive accents (lantern wicks, crystal cores, foam glints) that read as uniform glow. If you add a new piece mid-session, it MUST be added to a bake group before re-export — do not let it ship as flat-colour Principled BSDF.

The `/hall` archipelago landmarks + every environment asset (rocks, plants, ponds, ground patches, grass, signs, etc.) are authored in Blender via MCP and **every asset is finished with a Cycles bake that targets a Genshin-style hand-painted look** — NOT photoreal AO + GI. The texture ships in the GLB. The React side just samples it.

**What the new bake target looks like:**
- **Flat, even lighting** (no harsh directional shadows baked in). Slight overhead key + soft fill — closer to "flat-lit reference paint" than "golden hour photoreal."
- **Saturated, painterly colour blocks** — grass reads as a single saturated mid-green with hand-painted lighter-green highlight strokes + darker-green shadow strokes, NOT a continuous photoreal gradient. Rocks read as faceted grey/blue blocks with painted highlight + shadow strokes along edges, NOT a continuous PBR normal map.
- **Painted edge lighting** baked in as light strokes where light would catch — top edge of a rock, leeward leaves of a bush, ridge of a roof tile. This is the Genshin "stylised rim" effect, baked rather than runtime-shader.
- **No photoreal AO darkening in crevices.** Genshin scenes avoid heavy AO; they replace it with deliberate painted shadow strokes only where they help readability.
- **Saturated palette anchored to the Genshin Inazuma sakura-dusk OR Sumeru cyan-magic family** (see the aesthetic section below). Browns are warm and saturated, NOT muddy photoreal earth tones. Greens are vivid saturated mid-greens, NOT desaturated naturalistic greens.

**Workflow per landmark:**
1. Author geometry in Blender via MCP, **showing the work in the open Blender GUI** (see `feedback_blender_workflow.md` — never headless during authoring).
2. Set up a Cycles bake scene tuned for hand-painted look:
   - Single soft area light from above (Genshin-style "painted sun") — soft, broad, gentle falloff. Colour: warm magenta-pink (`#ffb0d8`) if Inazuma palette, cool cyan-white (`#c8e8ff`) if Sumeru palette.
   - Soft fill from the opposite side at ~30% key intensity — keeps shadow side from going dark.
   - Environment background set to a flat painterly tint matching the chosen palette (NOT an HDR — flat colour or a 2-stop gradient).
   - World ambient lifted so there are **no near-black shadows** anywhere on the asset.
3. UV-unwrap every asset (Smart UV Project; Cube projection only if Smart UV produces bad seams).
4. Bake `COMBINED` pass at **1024×1024** per asset (NOT 2048² — that was for photoreal AO detail we no longer need; 1024² keeps bundle size in line with the <30 MB target). 16-pixel UV island margin to avoid seam bleed.
5. **Texture-paint pass (optional but encouraged) in Blender's Texture Paint mode:** add hand-painted highlight strokes on the top edges + hand-painted shadow strokes on the bottom edges of the baked texture, then re-save. This is what bridges "flat-lit bake" → "Genshin-style painted asset." Skip only when batch-baking dozens of identical small props.
6. Save baked PNG to `public/models/hall/landmarks/<asset>-baked.png`.
7. Rewire the asset's material so the BSDF base colour reads from the baked image texture.
8. Export GLB with `export_image_format='AUTO'` so the baked PNG is packed in.
9. React side: the landmark component's material conversion preserves the texture map (`src.map`) when converting to `MeshStandardNodeMaterial` and pipes it through the texture-based emission branch so the bake survives even without scene lights reaching the material.

**Bake group strategy:** assets are still baked in groups so per-asset palettes harmonise (ground + foliage together so the grass colour reads as paired with the soil colour). Cast-shadow inter-bakes matter less under the new flat-lit target — keep groups for palette coherence, not shadow accuracy.

**Never ship a `/hall` landmark with primitive-shape Principled BSDF flat colour materials.** Cycles bake (now hand-painted, not photoreal) remains the floor.

**Pre-export checklist (run mentally before every GLB export):**
1. List every non-emissive mesh added since the last bake.
2. For each, confirm it reads from a baked hand-painted image texture, not a flat colour or procedural shader.
3. Confirm the asset's palette is in the locked Inazuma sakura-dusk OR Sumeru cyan-magic family (not earthy photoreal browns/greys).
4. If any mesh lacks a bake, group it with peers (or bake alone in a neutral painted hemisphere) before exporting. Do not export with flat-colour holes.

## /hall quality bar — Genshin-inspired stylized (LOCKED 2026-05-15, REPLACES Witcher-2-tier photoreal)

**Rule:** every `/hall` asset targets **Genshin Impact-inspired stylized quality** within WebGPU's browser ceiling — specifically the Inazuma sakura-dusk and Sumeru cyan-magic palette range (Genshin's own dusk/magenta moods, NOT the bright-daytime Liyue/Mondstadt look). Hand-painted faceted cliffs, hand-painted trees with brown trunks + rounded saturated foliage clusters, hand-painted grass blades, hand-painted faceted rocks, cartoon-stylized cyan water with foam edges, painterly sky with painted clouds.

**The honest ceiling:** ~60-70% of Genshin's visual impact, executed at "Genshin-inspired stylized" tier — NOT "Genshin-tier" (miHoYo had hundreds of artists + $200M+ + 5 years; we are one person + Claude Code + 5-7 months + GitHub Pages + 30 MB bundle). The aim is "this clearly references Genshin's art language" not "this is mistaken for Genshin."

**User commit 2026-05-15:** 5-7 months focused solo work, scope = hub + 6 satellite islands. Replaces the earlier 4-6 month commit to Witcher-2-tier photoreal (that target killed for being unachievable under the substrate + bundle constraints).

**Why the photoreal target died:**
- 4 days + 53 commits chasing "Witcher 2-tier photoreal" produced: river that reads as a black void, waterfall that reads as a featureless white tube, hub disc that still reads as low-poly despite procedural Perlin noise, 181 MB bundle (6× over budget), and a style clash between photoreal-ambition terrain + cartoon buildings + Tron-grid backdrop + Vegas-neon signs + Pixar-orange lava cracks.
- The substrate (R3F + WebGPU + Mac + Chrome) cannot ship the missing AAA ingredients — no real volumetric fog, no SSR, no tessellation, no PCSS soft shadows, no real-time GI. Every "AAA stack" attempt was a workaround for a missing primitive.
- A stylized target plays to the substrate's actual strengths: flat-lit baked textures, painterly post, cheap geometry, low texture budget.

**How to apply:**
- Default mental model: when proposing any /hall asset, ask **"is this clearly in the Genshin Inazuma-sakura-dusk OR Sumeru-cyan-magic art language?"** If no, propose a more painterly version.
- Reject "photoreal" as a primary option for water, terrain, rocks, foliage, sky. The locked target is hand-painted-stylized.
- "Realism" exists only in proportion, scale, and silhouette — surfaces, lighting, and colour are all painterly.
- Will-it-read-from-orbit (~80m camera) still matters — but the test changes: at 80m a Genshin scene reads as **coherent colour blocks with painted edge lighting**, not as photoreal microdetail. Scale features for orbital readability accordingly (saturated palette, bold silhouettes, visible foam edges).

**Specific consequences (replaces all prior asset-tier rules):**
- Water (waterfall, river, pond) — cartoon shader: UV-scroll cyan base + soft caustic noise + foam edges + fresnel rim. NO planar reflector, NO multi-layer photoreal normal stack, NO GPU-instanced particle spray, NO wet-rock shader. See water pipeline section below.
- Rocks — faceted grey/blue blocks with painted highlight + shadow strokes baked in. NO photoreal PBR normal/roughness/AO stack.
- Trees — Genshin-style brown trunks + rounded foliage clusters (sakura-pink, saturated-green, or autumn-red variants). NO real branch geometry + bark normals + leaf-card-alpha + wind shader.
- Grass — painted grass-blade clusters + scattered painted flowers. NO 3D crossed-plane volumes.
- Foam — painted foam-edge strokes baked into the water texture, OR a soft painted ring decal at impact zones. NO foam-crown ring meshes with TSL vertex churn.
- Sky — Genshin-style painted sky with painted cumulus clouds in Inazuma sakura-dusk OR Sumeru cyan-magic palette. NO photoreal HDRI, NO procedural atmospheric scattering.

**Acknowledged style-clash carve-out:**
- The existing pink-tiered pagoda house at /aboutme is kept AS-IS — its hand-cartoon style is different from the surrounding Genshin terrain. User pre-acknowledged this. Do NOT re-author the pagoda to "match" — it stays as the playful style-clash element.
- The grey mecha-wreck at /projects is kept (silhouette only). Its orange vibranium cracks are **recolored to cyan crystal veins** to align with the Genshin energy palette. This reads as "Khaenri'ah ruin in a fantasy world" — sci-fi crash in Genshin's universe — which Genshin's own canon supports.

## /hall aesthetic — Genshin Inazuma-sakura-dusk + Sumeru-cyan-magic palettes (LOCKED 2026-05-15, REPLACES brightened-photoreal-AAA + Wakandan-dusk + Path-A)

**The locked aesthetic — Genshin's own dusk/magenta range, NOT bright daytime, NOT photoreal:**

Two palette families to pull from. Pick one as the dominant tone per landmark scene; both are valid for the archipelago overall:

- **Inazuma sakura-dusk:** soft magenta-pink sky + saturated cherry-blossom-pink foliage accents + warm-rose stone + cyan-teal water + painted clouds with rose underbelly. Magenta-pink-warm dominant.
- **Sumeru cyan-magic-night:** cool cyan-magic sky + luminous teal-cyan foliage accents + cool-blue stone + cyan water with magic glint + painted clouds with cyan underbelly + bioluminescent mushroom dots for accent points. Cyan-cool-magic dominant.

**Lighting frame:**
- Single soft warm key light (magenta-pink if Inazuma) OR cool key light (cyan-white if Sumeru). NOT a sharp directional sun. Soft, broad, gentle falloff — painted-sun, not photoreal-sun.
- Soft fill at ~30% key intensity from the opposite side — keeps shadow side painterly, never near-black.
- Painted ambient — flat saturated tint matching the palette. NOT HDRI-driven indirect light.
- No real-time shadows (we are bake-only for shading). No bloom-heavy synthwave post; light bloom OK for crystal/mushroom emissives only.

**KEEP / EDIT / KILL element table (locked):**

| Element | Decision | Notes |
|---|---|---|
| Tron grid backdrop | **KILL** | Replaced with painterly Genshin sky |
| Magenta-cyan dusk skybox | **REWRITE** | As Genshin painted sky (Inazuma OR Sumeru) with painted clouds |
| Brown earthy hub disc | **REBUILD** | Multi-tier terraced Liyue-style cliff platform — grass top + faceted grey/blue cliff rim |
| Cracked-clay upper floating island | **KILL** | Remove entirely (water source moves to the Liyue-cliff cascade) |
| White-tube waterfall | **KILL** | Genshin-style multi-stream painted cyan-white waterfall (cartoon shader) |
| Black-ribbon river | **KILL** | Genshin-style stylized cyan painted water + foam edges |
| Pond at /aboutme | **EDIT** | Genshin-style cyan pond with painted ripples + foam edges + caustic glints |
| Splash foam ring | **EDIT** | Painted foam-burst decal (no particle system) |
| Pink-tiered pagoda house | **KEEP AS-IS** | Style-clash carve-out (user-acknowledged) |
| Mecha wreck blocks | **KEEP, RECOLOR** | Orange vibranium cracks → cyan crystal veins (Khaenri'ah-ruin-in-Genshin read) |
| Vegas neon signboards | **KILL** | Hand-painted wooden directional signs (Liyue/Mondstadt style) |
| Cyan/green cone "trees" | **KILL** | Genshin painted trees (brown trunks + rounded foliage clusters) |
| Purple geodesic-sphere rocks | **KILL** | Genshin faceted grey/blue rocks with painted highlight + shadow strokes |
| Green grass tufts | **KILL** | Painted grass-blade clusters + scattered painted flowers |
| Floating orbs + terminal pedestals | **EDIT** | Pedestals → Genshin stone-pillar lanterns; orb stays as click-target with re-styled shader |
| Skills landmark / forge cave | **REBUILD** | Genshin cliff outcrop + painted moss + cyan crystal accents |

**Reference frames:**
- Genshin Impact Inazuma sakura-dusk scenes (Kannazuka coast at dusk, Narukami Shrine path at dusk)
- Genshin Impact Sumeru cyan-magic-night scenes (Apam Woods at night, Dharma Forest crystal areas)
- NOT: bright Liyue/Mondstadt daytime, NOT photoreal AAA games, NOT Wakandan-vibranium dusk, NOT synthwave-Tron, NOT Witcher 2/3

**For implementers:**
- `src/landing/Hall/Lighting.tsx` — re-author for Genshin lighting: one soft warm-or-cool key + soft fill + painted ambient. Drop the Path-A brightening hacks (they were tuned for photoreal terrain, not for hand-painted assets).
- `src/landing/Hall/Skybox.tsx` + `SkyEnvMap.ts` — re-author as Genshin painted sky + painted cloud layer (procedural OR baked image; baked is easier).
- `src/landing/Hall/Island.tsx` — rebuild around new Liyue multi-tier terraced cliff GLB. Drop procedural Perlin noise. Material reads from baked hand-painted texture.
- `src/landing/Hall/stylizedWater.ts` (renamed from `photorealWater.ts`) — cartoon water shader (see water pipeline section).
- All `landmark-*.glb` — re-bake under the new hand-painted Cycles config.
- All neon-Vegas signboards → wooden directional signs.

## /hall water pipeline — Genshin stylized cartoon water (LOCKED 2026-05-15, REPLACES full-AAA-stack)

**Locked rule:** all water surfaces (waterfall, river, pond, fountain, basin) ship as a single **cartoon stylized water shader** — Genshin Impact's water language, NOT photoreal PBR.

**The cartoon water shader (single layer, ~80% LOC reduction from the AAA stack):**

1. **Authored static mesh** in Blender at 2-4k verts (not 5-15k — we don't need photoreal sheet displacement). Shape matches the average flow path.
2. **TSL shader** with these layers only:
   - UV-scrolling cyan-painted base colour (a hand-painted cyan-and-foam tile texture, scrolled along flow direction at slow speed)
   - Soft caustic noise overlay (low-frequency perlin tinted brighter cyan)
   - **Painted foam edges** — a soft white band where the water mesh intersects bank geometry, computed from depth-to-bank distance OR baked into a foam mask painted in Blender Texture Paint
   - Fresnel rim brightening (subtle, painted-style)
   - Optional sakura-petal particles drifting on the surface (Inazuma palette) OR fairy-light glints (Sumeru palette) — sparse, billboard quads, decorative
3. **Multi-stream painted waterfall** (for /skills cascade): 2-3 painted ribbon meshes side-by-side, each UV-scrolling at slightly different speeds. NO particle spray, NO mist plane, NO wet-rock shader.

**What's KILLED from the prior AAA stack:**
- ~~3-4 scrolling photoreal normal maps at different scales~~ — replaced by single painted tile texture
- ~~Flow-direction RG texture~~ — replaced by uniform-direction scroll along mesh UV
- ~~Gerstner wave perturbation~~ — Genshin water doesn't displace, it's a painted surface
- ~~Beckmann specular~~ — replaced by painted highlight strokes baked into the texture
- ~~GPU-instanced particle spray (2000-5000 droplets)~~ — DELETE `WaterfallSpray.tsx`
- ~~Planar mist mesh~~ — DELETE
- ~~Wet-rock shader on neighbouring stones~~ — DELETE
- ~~Planar reflector~~ — DELETE
- ~~FLIP-baked or hand-painted RG flow textures~~ — replaced by uniform UV scroll
- ~~Custom-shaped multi-stream cliff geometry that channels flow naturally~~ — replaced by 2-3 simple painted ribbons

**Why cartoon, not photoreal:**
- The AAA-stack pipeline shipped a black-void river and a featureless white-tube waterfall after 4 days. The substrate cannot deliver photoreal water without the missing AAA primitives (real volumetric fog, SSR, tessellation).
- Genshin water on Switch hardware (weaker than browser WebGPU in some respects) reads as gorgeous water — proof that cartoon-stylized water is achievable on tighter constraints than ours.
- Cartoon water plays to the substrate's strengths (flat baked textures, cheap UV scroll, cheap blend) and avoids the photoreal trap entirely.

**Iteration history (for context, do not re-litigate):**
- 2026-05-13: pre-rendered Cycles → video billboard → flat in 3D
- 2026-05-14 AM: TSL-displaced mesh + procedural flow → 15% quality
- 2026-05-14 PM: proposed VAT → wrong tool
- 2026-05-14 PM: full AAA stack → shipped a black void
- **2026-05-15 (current): cartoon-stylized Genshin water — locked**

**Files affected (Phase 1 of the Genshin pivot):**
- `src/landing/Hall/photorealWater.ts` → rename to `stylizedWater.ts`, gut + rewrite as cartoon shader. ~80% LOC reduction.
- `src/landing/Hall/WaterfallSpray.tsx` → DELETE
- `src/landing/Hall/WaterfallDroplets.tsx` → DELETE
- `src/landing/Hall/PlanarReflector.tsx` → DELETE
- `src/landing/Hall/WaterfallTSL.tsx` → rewrite as multi-stream painted ribbon, OR fold into stylizedWater
- `src/landing/Hall/Connections.tsx` → drop AAA-stack mesh routing (river_bank, river_grass, river_pebble, river_bedrock, river_bush, river_boulder), simplify to cartoon-water + foam-edge routing.

## /hall master Blender file + connections.glb architecture (locked 2026-05-14, content target revised 2026-05-15)

Cross-landmark assets — currently the river-of-life (skills → projects → about), bridges and paths in future — live in **`blender/hall-master.blend`** + **`connections.glb`**, separate from per-landmark assets. **The architecture survives the 2026-05-15 Genshin pivot; only the water content inside `connections.glb` changes from photoreal AAA-stack meshes to Genshin cartoon-water meshes.**

- **`blender/hall-master.blend`** is the planning + cross-landmark authoring source. Imports all per-landmark GLBs at their world POI positions (`HALL_POI_POSITIONS` in `src/landing/sections.ts`) so cross-landmark features can be authored against the actual geometry of all neighbouring landmarks.
- **Per-landmark GLBs** (`landmark-{about,projects,skills}.glb`) stay self-contained for features that are visually local to one landmark. They are NOT edited inside the master file — they live in their own `.blend` files and the master imports them read-only.
- **`connections.glb`** is the shared cross-landmark asset. Holds the Genshin-style cartoon-water river (water surface mesh + painted foam masks + sakura-petal-or-fairy-light particle anchors). Mounted at world origin in `Scene.tsx`, not at any POI offset.

When adding visually-local features, edit the per-landmark `.blend` + re-export its GLB; the master re-imports it. When adding cross-landmark features, edit `hall-master.blend`, author against the world geometry, export only the new asset selection to `connections.glb`.

## /hall river-of-life (locked 2026-05-14, water language revised 2026-05-15)

Single winding river (Philosophy B), chevron path through the 3 built landmarks. **The chevron path survives the Genshin pivot; the water language changes from photoreal to cartoon-stylized.**

- **Source:** Skills cliff pool at POI[2] = (-30, _, -6). After Phase 6 rebuild, the source is a Genshin Liyue-style multi-stream painted cascade plunge pool.
- **First leg:** Arcs NE to Projects POI[1] = (+32, _, +18). ~50m. Cartoon cyan painted water + foam edges.
- **Projects detour (split-rejoin):** River SPLITS approaching the mecha — one branch loops north (behind wreck from camera POV), one loops south (in front). Branches REJOIN on the far side. The wreck + pedestal sit on a true island. Convergence point on the far side gets painted foam-edge intensity (no FLIP bake — hand-painted in Blender Texture Paint). Wreck stays on dry ground.
- **Return leg:** Arcs SW down to About POI[0] = (4, _, -8). ~50m.
- **Terminus:** About's existing pond becomes the river basin (cartoon cyan painted pond with painted ripples).

**Water language:** all river segments use the cartoon water shader from the water-pipeline section above — UV-scroll cyan base + painted foam edges + soft caustics + fresnel rim. Sakura-petal particles drift on the surface (Inazuma palette) OR fairy-light glints (Sumeru palette). NO photoreal normal maps, NO Gerstner waves, NO particle spray, NO planar mist, NO wet-rock shader.

Blog, Resume, Contact landmarks (POI 3-5) do NOT get river touchpoints — only the 3 currently-built scenes are connected.

Wherever the river meets a landmark with an existing pedestal, **pedestal becomes an island in the river**; the hovering orb above stays at its current world position.

## Ambient 3D Background

A subtle slow-drifting agent graph sits behind every page (`AmbientCanvas` mounted in `App.tsx`). Lazy-loaded via `React.lazy` so the R3F core ships as a separate chunk and doesn't block first paint. The graph is `pointer-events: none` and decorative only — it doesn't intercept clicks and isn't interactive. On mobile the terminal window covers most of the viewport, so the canvas is largely hidden behind it; that is accepted.

- DPR clamped to `[1, 1.25]` (and `[1, 1]` on low-power devices: `navigator.hardwareConcurrency < 4` or `max-width: 800px`)
- `frameloop="never"` when the tab is hidden (Visibility API) or `prefers-reduced-motion: reduce` is set
- No post-processing, no shadows, no bloom — cheap geometry only

## Architecture Diagrams (gated)

`KybPipeline.tsx` and `CreditMemo.tsx` reference architecture diagrams that are **gated behind a password**. The encrypted SVG markup ships in `src/data/encrypted-diagrams.json`; the plaintext SVG lives only in `secrets/` (gitignored, never committed). Without the password, visitors see a `<LockedDiagram>` panel with an unlock prompt and a "request access" mailto button. Unlocking is per-session (no localStorage persistence). One password unlocks both diagrams; entering it once on either page unlocks the other for the session.

### How it works

- Crypto: PBKDF2-SHA256 (600k iterations) → AES-256-GCM. Random salt + IV per diagram.
- Browser-side: `src/components/diagram-unlock.ts` derives the key via `crypto.subtle` and decrypts in-memory. GCM tag verification means a wrong password just throws.
- Component: `src/components/LockedDiagram.tsx` shows a locked panel by default; on successful unlock it renders the decrypted SVG inside the `<ArchitectureDiagram>` wrapper.

### Setting / rotating the password

```bash
# Locally — replace 'your-strong-key' with the real password (never commit it).
PORTFOLIO_DIAGRAM_PASSWORD='your-strong-key' npm run encrypt-diagrams
git add src/data/encrypted-diagrams.json
git commit -m "rotate gated-diagram password"
git push  # triggers redeploy
```

The script reads the plaintext SVG files from `/secrets/`, encrypts each with the supplied password, and writes a new `src/data/encrypted-diagrams.json`. The repo only ever contains opaque ciphertext + per-entry salt + per-entry IV. Choose a password with reasonable entropy (12+ random characters) — this is GitHub Pages, so the bundle is publicly readable but the SVG content is not recoverable without the password.

### Adding a new gated diagram

1. Drop the plaintext SVG into `secrets/your-id-svg.html`.
2. Add `{ id: "your-id", source: "secrets/your-id-svg.html" }` to the `ENTRIES` array in `scripts/encrypt-diagrams.mjs`.
3. Extend the `DiagramId` union in `src/components/diagram-unlock.ts`.
4. Re-run `npm run encrypt-diagrams` and commit the regenerated JSON.
5. Render `<LockedDiagram diagramId="your-id" ariaLabel="…" requestEmail="…" />` from the page that needs it.

Other project detail pages don't have diagrams because their architectures are too sparse to justify one.
