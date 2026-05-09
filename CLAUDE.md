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

## 3D Landing Page

`AboutMe.tsx` includes an interactive 3D hero band powered by **React Three Fiber**. The same `portfolioData` (in `src/components/landing-3d/data.ts`) drives both the DOM (tech chips, system-info rows, certs) and the 3D scene — so updating content there propagates to every theme + the 2D layout in lockstep.

### Themes

Four themes are shipped, each lazy-loaded as a separate chunk:

| ID | What it shows |
|---|---|
| `terminal-workstation` (default) | Virtual desk + CRT monitor (typed name on screen); books per cert; mug; status LED. |
| `mission-control` | Orbital rings of tech-stack satellites; live telemetry HUD overlay (uptime, location, status, interests). |
| `constellation` | 3D graph of tech-stack nodes; edges thickened by project co-occurrence; transitive-fade on hover. |
| `topographic` | Career terrain: pin-towers per role, X-axis is time, height encodes tenure × scope. |

**When to use which:** `terminal-workstation` is the personal/quirky default. Use `mission-control` for a high-signal recruiter view. Use `constellation` for tech-heavy audiences who want to see how skills connect. Use `topographic` to emphasize the career arc.

### Feature flag

The active theme is resolved in this order (first non-empty wins):
1. URL query — `http://localhost:3000/#/?theme=mission-control` (parsed from the hash, since this app uses `HashRouter`)
2. `localStorage.getItem('landing3d.theme')` — clicking the in-page switcher persists here
3. `process.env.REACT_APP_LANDING_3D_THEME` (set in `.env.local` for build-time default)
4. Fallback: `terminal-workstation`

The visible theme switcher in the top-right corner of the 3D hero writes to localStorage on click.

**Demo URLs:**
- `http://localhost:3000/#/` — default
- `http://localhost:3000/#/?theme=mission-control`
- `http://localhost:3000/#/?theme=constellation`
- `http://localhost:3000/#/?theme=topographic`

### Mobile / accessibility

Same 3D on every device — no 2D fallback. `Landing3D` detects low-power devices (`navigator.hardwareConcurrency < 4` or `max-width: 800px`) and disables bloom, drops DPR, and downsamples nodes (e.g. constellation falls back to top-15 by proficiency). `prefers-reduced-motion: reduce` halts all auto-rotation. The canvas pauses (`frameloop="never"`) when the tab is hidden or scrolled off-screen.

### Adding a new theme

Three steps:
1. Extend the `LandingThemeId` union in `src/components/landing-3d/types.ts`.
2. Create `src/components/landing-3d/themes/MyTheme.tsx` — a component with the signature `(props: ThemeComponentProps) => JSX`. Read everything from `props.data` — never hardcode content.
3. Register it in `src/components/landing-3d/themes/registry.ts` with a label, description, and `defaultCameraPos`. Use `lazy(() => import("./MyTheme.tsx"))` so it ships as its own chunk.

### Verifying data/design separation

Edit `portfolioData.techStack` in `data.ts` (e.g., add a new tech). Without touching any theme file, you should see:
- A new chip in the DOM "Core Stack" callout
- A new satellite in `mission-control`
- A new node + auto-wired edges in `constellation`
- (Terminal-workstation and topographic don't render the tech list — by design.)
