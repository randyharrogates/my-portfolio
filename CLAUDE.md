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

## /hall landmark authoring — Cycles bake workflow (committed 2026-05-13)

**Rule — no exceptions:** every mesh that ships in a `/hall` landmark GLB carries baked shading and shadows. Walls, roofs, windows, doors, chimneys, shutters, eave brackets, ridge caps, cornices, awnings, posts, rocks, plants, ground, props, trees, grass — **everything**. The only meshes allowed to ship without a bake are emissive light sources (lantern bulbs, chimney embers, pond glow rings) which are supposed to read as uniform glow. If you add a new piece of architecture mid-session, it MUST be added to a bake group before the GLB is re-exported — do not let it ship as flat-colour Principled BSDF.

The `/hall` archipelago landmarks (house, satellite, waterfall, tree, garden, entrance, plus all environment assets — rocks, plants, ponds, ground patches, etc.) are authored in Blender via MCP and **every asset is finished with a full Cycles bake before export**. Reason: WebGPU's `MeshStandardNodeMaterial` pipeline doesn't deliver real-time shadows or per-vertex variation correctly in our setup, so we bake lighting + shadows + AO + colour variation directly into a diffuse texture per asset. That texture ships in the GLB and the React side just samples it.

**Workflow per landmark:**
1. Author geometry in Blender via MCP, **showing the work in the open Blender GUI** (see `feedback_blender_workflow.md` in user memory — never headless during authoring).
2. Set up a Cycles bake scene that matches the runtime lighting direction:
   - Sun lamp from the same angle as the `Lighting.tsx` magenta directional (currently `[40, 50, 20]`, colour `#ff5fa8`).
   - A cooler fill matching the cyan rim (`[-45, 28, -35]`, `#5feaff`).
   - World/environment background tinted to the skybox horizon so indirect light has the right magenta-cyan colour shift.
3. UV-unwrap every asset (Smart UV Project or Cube projection — whichever produces fewer seam artifacts for the geometry).
4. Bake `COMBINED` pass (direct + indirect + AO + cast shadows) at 1024×1024 or 2048×2048 per asset, with 16-pixel UV island margin to avoid seam bleed.
5. Save baked PNG to `public/models/hall/landmarks/<asset>-baked.png`.
6. Rewire the asset's material so the BSDF base colour reads from the baked image texture.
7. Export GLB with `export_image_format='AUTO'` so the baked PNG is packed into the GLB.
8. On the React side, `AboutLandmark.tsx`'s material conversion preserves the texture map (`src.map`) when converting to `MeshStandardNodeMaterial` and pipes it through the texture-based emission branch so the bake survives even without scene lights reaching the material.

**Bake group strategy:** assets are baked in groups (ground+boulders together, all foliage together, etc.) so the inter-shadowing reads correctly — e.g. the house casts a shadow onto the ground, the tree casts a shadow onto bushes. The shadow caster objects stay in the scene during the bake but their pixels aren't the target.

**The pragmatic shortcut for stylised landmarks:** if a single asset doesn't need cast shadows from neighbours (e.g. a pond ring, a beacon finial), it can be baked alone in a neutral hemisphere — much faster and the result still has surface AO + colour variation baked in.

**Never ship a `/hall` landmark with primitive-shape Principled BSDF flat colour materials again.** That's been the visual ceiling we kept hitting; Cycles bake is the floor going forward.

**Pre-export checklist (run mentally before every GLB export):**
1. List every non-emissive mesh added since the last bake.
2. For each, confirm it is part of a bake group (its material reads from a baked image texture, not a flat colour or procedural shader).
3. If any new mesh lacks a bake, group it with peers (or bake it alone in a neutral hemisphere) before exporting. Do not export with flat-colour holes in the scene.

## /hall quality bar — Witcher 2-tier for every asset (HARD RULE, locked 2026-05-14)

**Rule:** every `/hall` asset must target **stylized-photoreal "Witcher 2-tier" quality** within WebGPU's browser ceiling. This applies to water (river, waterfall, pond), rocks, trees, foliage, soil, landmark assets, lighting, atmosphere. No stylised shortcuts that ship faster.

**The browser-imposed ceiling is honest:** WebGPU + Mac + Chrome can't reach Witcher 3 PS5-tier (no real volumetric fog, no SSR, no tessellation, no PCSS soft shadows, ~500 MB total texture budget). The realistic ceiling is **Witcher 2 max-settings on PC, circa 2011.** That's the bar. Anything less is wrong.

User explicitly authorised 4-6 months of work for this ambition on 2026-05-14. Do not propose "stylised approximations" or "cheap variants" as primary options — they were rejected.

## /hall aesthetic — Wakandan-vibranium (locked 2026-05-14)

The aesthetic is **photoreal-natural ground + neon-magenta-cyan dusk sky + vibranium emissive accents on landmarks**. This is the Wakandan-futuristic frame from the original Hall pitch (`project_hall_redesign.md` in user memory), course-correcting from the recent drift into pure synthwave.

- **Sky stays neon** — magenta `#ff5fa8` directional + cyan `#5feaff` rim + magenta-purple horizon gradient (the current Lighting.tsx + Skybox.tsx). Don't touch this.
- **Ground becomes photoreal-natural** — rocks ship with full PBR texture sets (basecolor + normal + roughness + AO from Polyhaven or equivalent), water is real FLIP-baked geometry via VAT, trees use branch geometry + bark + leaf cards (not stylised cones), soil/moss reads as real surfaces.
- **Vibranium accents** — cyan/magenta emissive veins, runes, glowing minerals, animated emissive scrolling on the landmarks (forge has cyan-glowing seams, mecha has magenta terminal screens, etc.). The neon palette becomes accent lighting on otherwise-photoreal materials, not the surface treatment itself.

Reference frames that hold visual coherence: Wakanda Forever Talokan kingdom, Avatar Pandora, Annihilation's shimmer zone. NOT Cyberpunk 2077 (which is fully neon) and NOT Witcher 3 (which has no neon at all).

## /hall water pipeline — VAT, not TSL displacement (REVISED 2026-05-14 evening)

**The earlier TSL-only direction is partially reversed.** I told you 2026-05-14 morning that TSL displacement + procedural flow was 90% as good as VAT. User pushed back honestly when shown the gap to the Witcher 3 reference — the TSL placeholder (commit `188fb04`) delivers ~15% of the target quality.

**Updated rule:** animated water surfaces (waterfall, river, pond ripples, fountains) use **VAT (vertex animation texture) from real FLIP fluid bakes**. TSL is reserved for non-fluid effects (wind on trees, scrolling emissive on lava, fresnel rim on vibranium accents).

**The VAT pipeline (custom tooling — we are building this):**
1. Author a high-tessellation base mesh in Blender (5-15k verts, the static topology that VAT animates).
2. Run a real FLIP fluid simulation at resolution 96-128 over a 3-6s loop. This is the motion source-of-truth.
3. Mesh-remap each FLIP frame's variable-topology surface to the fixed base mesh. Options: ray-projection (cast each base vertex along normal to hit the FLIP surface), shrinkwrap modifier per-frame, or grid-aligned mesh from `mesh_smoothen_pos`.
4. Bake per-frame vertex positions to an RGBA16F texture. Width = padded vertex count, Height = frame count. Format = relative-to-origin positions. Final ~5-15 MB per asset.
5. Export the static base mesh + position-texture as a GLB with a custom vertex-index attribute.
6. TSL VAT shader on the runtime mesh: sample the position texture at `(vertexIndex/width, frame/height)`, displace, then layer foam mask + fresnel + wet shader on top.

Houdini Labs `SOP_VertexAnimationTextures` is the AAA standard reference for the pipeline shape. Blender doesn't have this built-in — we are building the equivalent in Python.

**Adjacent assets per water feature** (Witcher 2-tier requires more than just the VAT mesh):
- TSL-instanced particle droplets in the splash zone
- A planar mist mesh for haze/spray volume
- Wet-rock shader applied to nearby static rocks (darker basecolor + lower roughness in the splash zone)
- Multi-layered scrolling normal maps for surface micro-detail

**The current TSL waterfall (commit `188fb04`) stays as a visible placeholder while the VAT pipeline is built.** It will be replaced.

## /hall master Blender file + connections.glb architecture (locked 2026-05-14)

Cross-landmark assets — currently the river-of-life (skills → projects → about), bridges and paths in future — live in **`blender/hall-master.blend`** + **`connections.glb`**, separate from per-landmark assets.

- **`blender/hall-master.blend`** is the planning + cross-landmark authoring source. Imports all per-landmark GLBs at their world POI positions (`HALL_POI_POSITIONS` in `src/landing/sections.ts`) so cross-landmark features can be authored against the actual geometry of all neighbouring landmarks.
- **Per-landmark GLBs** (`landmark-{about,projects,skills}.glb`) stay self-contained for features that are visually local to one landmark. They are NOT edited inside the master file — they live in their own `.blend` files and the master imports them read-only.
- **`connections.glb`** is the new shared asset. Holds the cross-landmark river (riverbed + water surface mesh + baked flow + foam textures) and any future spanning features. Mounted at world origin in `Scene.tsx`, not at any POI offset.

When adding visually-local features, edit the per-landmark `.blend` + re-export its GLB; the master re-imports it. When adding cross-landmark features, edit `hall-master.blend`, author against the world geometry, export only the new asset selection to `connections.glb`.

## /hall river-of-life (locked 2026-05-14)

Single winding river (Philosophy B), chevron path through the 3 built landmarks:

- **Source:** Skills cliff pool at POI[2] = (-30, _, -6). The existing Cycles-baked plunge pool is the headwater.
- **First leg:** Arcs NE to Projects POI[1] = (+32, _, +18). ~50m.
- **Projects detour (split-rejoin):** River SPLITS approaching the mecha — one branch loops north (behind wreck from camera POV), one loops south (in front). Branches REJOIN on the far side. The wreck + pedestal sit on a true island. The convergence point on the far side is where the two streams collide; this is the natural target for FLIP-baked foam-mask intensity. Wreck stays on dry ground — crashed-satellite-in-a-lake reads as too aquarium-like.
- **Return leg:** Arcs SW down to About POI[0] = (4, _, -8). ~50m.
- **Terminus:** About's existing static decorative pond becomes the river basin. Pond stops being a separate water feature.

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
