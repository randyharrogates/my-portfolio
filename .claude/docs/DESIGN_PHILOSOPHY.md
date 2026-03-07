# Design Philosophy

## Terminal/CLI Aesthetic

The portfolio is styled as a terminal emulator with:
- **Title bar** with window controls
- **Tab navigation** mimicking terminal tabs
- **Status bar** at the bottom
- **JetBrains Mono** monospace font throughout
- **Dark theme** with green/amber accent colors
- **Prompt-style** content presentation (`$`, `>`, `//` prefixes)

All new pages and components must maintain this aesthetic.

## Component Simplicity

- Pages are mostly static content with minimal state
- Data is hardcoded or fetched from simple APIs (GitHub REST)
- No complex state management needed — useState is sufficient
- Prefer static data arrays over API calls where content doesn't change

## UI Patterns

Reuse existing patterns across pages:
- `callout-box` — highlighted content sections
- `prompt-line` — terminal prompt-style labels
- `section-header` — consistent section headings
- Bootstrap grid for responsive layouts
- Card-based project showcases

## GitHub Pages Constraints

- HashRouter required (no server-side routing)
- Base href `/my-portfolio/` in index.html
- `process.env.PUBLIC_URL` for asset paths
- Static site only — no server-side rendering or API routes
- Deploy via GitHub Actions on push to master

## Responsive Design

- Mobile-first approach
- Bootstrap breakpoints for layout shifts
- Terminal aesthetic preserved on all screen sizes
- Touch-friendly navigation (tabs scrollable on mobile)

## Accessibility

- Semantic HTML as foundation
- ARIA attributes supplement where needed
- Keyboard navigation between tabs (arrow keys in App.tsx)
- Sufficient color contrast for readability
- Screen reader-friendly content structure
