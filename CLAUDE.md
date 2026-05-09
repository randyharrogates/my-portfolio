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

A subtle slow-drifting agent graph sits behind every page (`AmbientCanvas` mounted in `App.tsx`). Lazy-loaded via `React.lazy` so the R3F core ships as a separate chunk and doesn't block first paint. The graph is `pointer-events: none` and decorative only — it doesn't intercept clicks and isn't interactive. On mobile the terminal window covers most of the viewport, so the canvas is largely hidden behind it; that is accepted.

- DPR clamped to `[1, 1.25]` (and `[1, 1]` on low-power devices: `navigator.hardwareConcurrency < 4` or `max-width: 800px`)
- `frameloop="never"` when the tab is hidden (Visibility API) or `prefers-reduced-motion: reduce` is set
- No post-processing, no shadows, no bloom — cheap geometry only

## Architecture Diagrams

The project detail pages with non-trivial systems — `KybPipeline.tsx` and `CreditMemo.tsx` — embed inline SVG architecture diagrams via the `<ArchitectureDiagram>` wrapper at `src/components/ArchitectureDiagram.tsx`. The wrapper provides a bordered figure with horizontal-scroll on mobile and `aria-label` for screen readers. Diagrams are hand-authored SVG (no Mermaid runtime) using the terminal palette: `#1d1b19` node fill, `#3a3532` baseline border, `#e8632a` accent for the primary flow, `#5a5450` for arrows. Other project pages don't have one because their architectures are too sparse to justify one.
