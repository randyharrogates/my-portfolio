# Coding Standards

Rules here supplement the critical rules in root CLAUDE.md. Only non-obvious, project-specific rules are listed.

## Component Patterns

- **CS-1**: Use functional components with hooks — no class components
- **CS-2**: Define TypeScript interfaces at top of file for props and data types
- **CS-3**: Use `useState` for local state, derive values where possible instead of storing
- **CS-4**: `useEffect` must have correct dependency arrays — no missing deps
- **CS-5**: Event handlers typed properly (e.g., `React.MouseEvent<HTMLButtonElement>`)

## TypeScript

- **TS-1**: No `any` types — use proper interfaces or `unknown` with type guards
- **TS-2**: Export shared interfaces; keep component-specific ones local
- **TS-3**: Use `interface` for object shapes, `type` for unions/intersections

## Styling

- **ST-1**: Co-locate CSS with component (`ComponentName.css` next to `ComponentName.tsx`)
- **ST-2**: Use Bootstrap utility classes for spacing, grid, and common patterns
- **ST-3**: Terminal aesthetic colors: dark backgrounds, green/amber accents, monospace font
- **ST-4**: Mobile-first responsive design — test at 320px minimum
- **ST-5**: No inline styles unless values are dynamic

## Routing

- **RT-1**: HashRouter only (GitHub Pages requirement — no server-side routing)
- **RT-2**: New pages require both TABS array entry and Route in `App.tsx`
- **RT-3**: Use `NavLink` with active class for tab navigation

## Assets

- **AS-1**: Use `process.env.PUBLIC_URL` prefix for all `public/` assets
- **AS-2**: Prefer WebP format for images
- **AS-3**: Static assets go in `public/`, not `src/`

## Testing

- **TE-1**: Jest + React Testing Library for component tests
- **TE-2**: Use `screen` queries: prefer `getByRole` > `getByText` > `getByTestId`
- **TE-3**: Test user interactions with `@testing-library/user-event`
- **TE-4**: Use `waitFor` / `findBy` for async operations

## Accessibility

- **A11Y-1**: Semantic HTML elements (nav, main, section, article, header)
- **A11Y-2**: ARIA attributes where semantic HTML is insufficient
- **A11Y-3**: All interactive elements keyboard-accessible
- **A11Y-4**: Color contrast WCAG AA minimum (4.5:1 for text)

## General

- **GN-1**: No TODOs — all code must be production-ready
- **GN-2**: Imports grouped: React/libraries first, then local modules, then CSS
- **GN-3**: Remove unused code — don't comment it out
