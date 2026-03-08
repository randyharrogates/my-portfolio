# My Portfolio

A terminal-themed personal portfolio built with React 19 and TypeScript, styled as a macOS terminal emulator.

**Live site:** [randyharrogates.github.io/my-portfolio](https://randyharrogates.github.io/my-portfolio)

## Features

- macOS terminal window aesthetic with traffic lights, title bar, and status bar
- Tab navigation with arrow-key keyboard support
- Dark warm theme with JetBrains Mono monospace font
- Responsive 2-column layouts that stack on mobile
- GitHub profile integration via REST API

## Pages

| Tab | Description |
|-----|-------------|
| intro | Bio, core tech stack, and terminal sysinfo panel |
| projects | Expandable project cards with tech stack details |
| skills | Interactive JSON viewer and proficiency bar chart |
| credit-memo | Multi-Agent Credit Memo Research Suite detail page |
| kyb-pipeline | KYB Brand Risk Management Suite detail page |
| fine-tuning | LLM fine-tuning project detail page |
| blog | Expandable blog posts on AI and Finance |
| contact | Contact info with copy-to-clipboard email |

## Tech Stack

- **Framework:** React 19, TypeScript, React Router 6 (HashRouter)
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
