# Portfolio redesign: port the approved prototype into the React app

The approved design is `docs/redesign/prototype.html`, a single self-contained HTML page (CSS in a
`<style>` block, visual `<template>`s, one `<script>` with all data and rendering). Port it **faithfully**
into this CRA + React 19 + TypeScript app. Copy and behaviour come from the prototype verbatim: do not
reword, add or drop any project, claim, number or link.

## Constraints
- No new npm dependencies. React Router v6 `HashRouter` stays (GitHub Pages).
- CI builds with `CI=true`, so **any ESLint warning fails the deploy**. Zero warnings.
- Do not touch: `CLAUDE.md`, `reap-answers.md`, `src/landing/**`, `src/world/**`, `blender/**`,
  `src/components/ambient-3d/**`, `.github/**`, `public/models|textures|hdri|basis|luts|audio|data/**`.
- Assets are already in `public/site/*.webp`; the new CV is already `public/Resume.pdf`.
  Reference them as `site/<name>.webp` and `Resume.pdf` (relative; `<base href="/my-portfolio/">`).

## Structure (new code under `src/site/`)
- `data.ts`: typed port of the prototype's `THEMES`, `P` (projects, 17 including `tide-tally`),
  `CAREER`, `LOOP`, `PILLARS`, `QA`, the archive rows and the TAP row text. Image paths become
  `site/...`. **Drop the `gen` illustration logic** (`P.forEach(... "img/gen/" ...)`): projects without
  `img` simply have no image; they use their recreated visual (template `vis-*`) or the `term` sample.
- `site.css`: the prototype CSS. Keep the `:root` token blocks (light, dark media query, `[data-theme]`)
  as they are. Scope every element/global selector (`*`, `body`, `a`, `h1..h4`, `p`, `[hidden]`,
  `:focus-visible`, `body[data-mode]`, `body::before`) under a `.rc-site` wrapper so the old pages
  (`/blog`, `/hall`) are unaffected. The wrapper gets the background, colour and font that `body` had.
  Project mode = `.rc-site[data-mode="work"] main` instead of `body[data-mode]`.
- `Visual.tsx`: the seven `<template id="vis-*">` blocks as JSX components (keep markup and classes),
  plus the `term` renderer (browser frame + terminal lines). `Thumb.tsx`: image if `img`, else Visual.
- `SiteLayout.tsx`: nav (brand, Work/About/Résumé links with `aria-current`, Ask button, theme toggle),
  the sticky breadcrumb bar on Work and case routes, `<main>`, the contact band (copy-email button,
  LinkedIn, the 3D Hall card linking to `/hall`), footer, and the Ask palette (⌘K / Ctrl+K, arrow keys,
  Enter, Esc, focus return, open/close animation, curated `QA` answers, same footer text).
  Theme toggle persists to `localStorage` key `rc-theme` (wrapped in try/catch) and sets
  `document.documentElement.dataset.theme`.
- Pages: `HomePage.tsx`, `WorkPage.tsx`, `CasePage.tsx`, `AboutPage.tsx`, `ResumePage.tsx`, matching the
  prototype's `data-page` sections and render functions (`renderWork`, `renderCase`, crumbs, prev/next,
  the case TOC and About sub-nav that scroll with `scrollIntoView`, honouring reduced motion).
  Case cover: `shots` (with the `phones` variant) or a single screenshot with the "Screenshot" caption.
- Page-enter animation and every `prefers-reduced-motion` rule carry over.

## Routing (`src/App.tsx`)
- `/` → Home; `/work` → Work (all); `/work?theme=<id>` → Work filtered (chips update the query);
  `/work/:id` → Case study (unknown id → redirect `/work`); `/about` → About; `/resume` → Résumé.
  All five render inside `SiteLayout`. Prototype `#hash` links become router `<Link>`s.
- Scroll to top on route change, except when only the Work `theme` query changes.
- Keep `/hall` exactly as it is. Keep `/blog` with its current page and chrome; the About "Writing"
  rows link to `/blog`.
- Redirects: `/projects` → `/work`; `/projects/:slug` → `/work/<mapped>` where
  credit-memo→credit-memo, kyb-pipeline→credit-memo, jarvis→jarvis, kestrel→kestrel, twc→twc,
  leeseidon→leeseidon, verona→verona, speech-to-text→speech, multi-agent-rag→agent-pilot,
  mcp-server→mcp-pack, resume-builder→resume-builder, anything else → `/work`.
  `/skills` and `/contact` → `/about`.
- Remove the old terminal shell from everything except `/blog`. Remove now-unused imports (the
  Workstation landing lazy import, old page imports) so lint stays clean, but **do not delete** old page
  or landing files.

## Head
- `public/index.html`: title "Randy Chan · AI Software Engineer", meta description "AI software engineer
  in Singapore building AI-native products, AI-driven workflows and multi-agent systems.", and add the
  Google Fonts families from the prototype (Bricolage Grotesque, Inter) to the existing font link.

## Verify
- `CI=true npx react-scripts build` passes with zero warnings.
- `CI=true npm test -- --watchAll=false` passes; add tests: Home renders the headline; `/work` lists 17
  case-study links; `/work/tide-tally` renders "Tide Tally"; `/projects/kyb-pipeline` lands on the
  credit-memo case; `/skills` lands on About.
- Do not commit. Leave the working tree for review.
