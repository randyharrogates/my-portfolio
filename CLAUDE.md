# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Start dev server at http://localhost:3000
npm test           # Run tests (interactive watch mode)
npm run build      # Production build (outputs to build/)
npm run deploy     # Build and deploy to GitHub Pages (runs predeploy first)
```

## Deployment

This site is deployed to GitHub Pages at https://randyharrogates.github.io/my-portfolio.

- Deployment branch: `master` (GitHub Pages reads from this branch)
- Deploy command: `npm run deploy` (uses gh-pages package to push build/ to gh-pages branch)

## Architecture

A single-page React 19 + TypeScript portfolio site, bootstrapped with Create React App.

**Routing:** Uses `HashRouter` (not `BrowserRouter`) — required for GitHub Pages compatibility, since there's no server-side routing. All routes are hash-based (`/#/`, `/#/fine-tuning`).

**Pages** (`src/pages/`):
- `AboutMe.tsx` — Home/landing page. Fetches the GitHub user profile via the GitHub REST API to display profile info dynamically.
- `FineTuning.tsx` — Detail page for a specific ML project.

**Styling:** Bootstrap 5 + Bootstrap Icons loaded via CDN/npm. Each page has a co-located `.css` file.

**Static assets** (images, screenshots) live in `public/` and are referenced with relative paths.

**Base href:** `public/index.html` sets `<base href="/my-portfolio/">` for correct asset resolution on GitHub Pages.
