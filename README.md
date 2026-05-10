# My Portfolio

A terminal-themed personal portfolio built with React 19 and TypeScript. The
landing route (`/`) is a 3D **Workstation** scene rendered with React Three
Fiber — a tech-noir cockpit with six clickable monitors that cinematically
dolly into each terminal section. The terminal pages (`/about`, `/projects`,
`/skills`, …) preserve the existing macOS-terminal aesthetic.

**Live site:** [randyharrogates.github.io/my-portfolio](https://randyharrogates.github.io/my-portfolio)

## Features

- 3D Workstation landing (`/`) — six bespoke CRT-styled monitors over a
  procedurally textured desk, with cinematic camera dolly handover, ambient
  audio toggle, idle B-roll camera, time-of-day lighting, and a Konami-code
  easter egg. Lazy-loaded; falls back to terminal via the HUD link if needed.
- macOS-terminal pages (`/about`, `/projects`, …) with traffic lights, title
  bar, status bar, and arrow-key tab navigation
- Global ESC: from any inner page returns you to `/` (the 3D lobby)
- Auto fidelity: rolling FPS sampler flips to a low-fidelity GL profile if
  performance dips below 30 fps
- GitHub profile integration via REST API (avatar, profile URL)

## Routes

| Route | Description |
|-------|-------------|
| `/` | 3D Workstation landing (six interactive monitors) |
| `/about` | Bio, core tech stack, and terminal sysinfo panel |
| `/projects` | Expandable project cards with tech stack details |
| `/skills` | Interactive JSON viewer and proficiency bar chart |
| `/projects/credit-memo` | Multi-Agent Credit Memo Research Suite detail page |
| `/projects/kyb-pipeline` | KYB Brand Risk Management Suite detail page |
| `/projects/fine-tuning` | LLM fine-tuning project detail page |
| `/blog` | Expandable blog posts on AI and Finance |
| `/resume` | Embedded resume PDF viewer |
| `/contact` | Contact info with copy-to-clipboard email |

## Tech Stack

- **Framework:** React 19, TypeScript, React Router 6 (HashRouter)
- **3D:** Three.js, @react-three/fiber, @react-three/drei, @react-three/postprocessing
- **Styling:** Bootstrap 5, Bootstrap Icons, JetBrains Mono
- **Build:** Create React App
- **Deployment:** GitHub Actions → GitHub Pages

## Getting Started

```bash
npm install
npm start          # Dev server at http://localhost:3000
```

## Scripts

```bash
npm start          # Start dev server
npm test           # Run tests (watch mode)
npm run build      # Production build
npm run deploy     # Build and deploy to GitHub Pages
```
