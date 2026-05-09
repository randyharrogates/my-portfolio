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

## Ambient 3D Background

A subtle full-viewport 3D canvas sits behind every page in `App.tsx`, lazy-loaded so it doesn't block first paint. Three scene options + an off switch are exposed via a small inline radio toggle in the bottom status bar (`AmbientToggle`).

| ID | Scene |
|---|---|
| `graph` (default) | Slow-drifting agent graph — ~38 abstract nodes, ~12% accented orange, edges ~32% opacity. Self-referential to multi-agent orchestration. |
| `phosphor` | CRT phosphor texture — sparse glowing dots on a fullscreen plane, slow shimmer. Most on-brand for terminal aesthetic. |
| `grid` | Vanishing wireframe grid — receding tile floor with distance fade, pans toward camera. |
| `off` | No canvas mounted. Static gradient background only. |

### Resolution order

1. URL query — `http://localhost:3000/#/?ambient=phosphor` (HashRouter — parsed from the hash)
2. `localStorage.getItem('ambient3d.scene')` — clicking the toggle persists here
3. Default: `graph`

### Performance

- `AmbientCanvas` is lazy-loaded: main bundle stays at ~82KB; the R3F core (`~224KB`) ships as a separate chunk that loads after first paint
- DPR clamped to `[1, 1.25]` (and `[1, 1]` on low-power devices: `navigator.hardwareConcurrency < 4` or `max-width: 800px`)
- `frameloop="never"` when the tab is hidden (Visibility API) or `prefers-reduced-motion: reduce` is set
- All scenes use simple geometries (lines, cheap planes, low-segment spheres). No post-processing, no shadows, no bloom
- `pointer-events: none` on the canvas so it doesn't intercept clicks

### Adding a new ambient scene

1. Create `src/components/ambient-3d/scenes/MyScene.tsx` with the signature `(props: { lowPerf: boolean; reducedMotion: boolean }) => JSX`. Keep it light — this scene paints behind every page, on every visit.
2. Extend `AmbientSceneId` and `AMBIENT_SCENES` in `src/components/ambient-3d/types.ts`.
3. Add a `lazy()` import + render branch in `AmbientCanvas.tsx`.
