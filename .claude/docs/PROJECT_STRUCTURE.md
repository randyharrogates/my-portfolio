# Project Structure

## Overview

React 19 + TypeScript single-page portfolio site styled as a terminal/CLI emulator, deployed to GitHub Pages.

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Routing**: React Router 7 (HashRouter for GitHub Pages)
- **Styling**: Bootstrap 5 + Bootstrap Icons (npm), JetBrains Mono (Google Fonts CDN)
- **Build**: Create React App (react-scripts)
- **Deployment**: GitHub Actions → GitHub Pages
- **Testing**: Jest + React Testing Library

## Directory Layout

```
my-portfolio/
├── public/                     # Static assets
│   ├── index.html              # Base href="/my-portfolio/"
│   ├── *.webp / *.png          # Project screenshots, images
│   └── manifest.json
├── src/
│   ├── App.tsx                 # Main shell: TABS array, Routes, terminal UI
│   ├── App.css                 # Global terminal styles
│   ├── App.test.tsx            # App-level tests
│   ├── pages/                  # Page components with co-located CSS
│   │   ├── AboutMe.tsx + .css  # Home (/) — GitHub profile fetch
│   │   ├── Projects.tsx + .css # Project showcase (/projects)
│   │   ├── Skills.tsx + .css   # Skills overview (/skills)
│   │   ├── Blog.tsx + .css     # Blog posts (/blog)
│   │   ├── Contact.tsx + .css  # Contact info (/contact)
│   │   ├── CreditMemo.tsx + .css
│   │   ├── KybPipeline.tsx + .css
│   │   └── FineTuning.tsx + .css
│   ├── index.tsx               # Entry point
│   └── index.css               # Base styles
├── .github/workflows/
│   └── deploy.yml              # GitHub Actions deployment
├── CLAUDE.md                   # Project conventions
└── package.json
```

## Key Patterns

### Adding a New Page

Two changes required in `src/App.tsx`:

1. Add entry to `TABS` array (controls tab order and labels)
2. Add corresponding `<Route>` inside `<Routes>`

### Asset References

Use `process.env.PUBLIC_URL` prefix for assets in `public/`:
```tsx
<img src={`${process.env.PUBLIC_URL}/screenshot.webp`} />
```

### Routing

HashRouter is required for GitHub Pages (no server-side routing). All routes are hash-based: `/#/`, `/#/projects`, `/#/blog`.
