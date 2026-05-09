# landing-3d

Interactive 3D hero for the portfolio landing page. Built on **React Three Fiber + drei**, with four swappable themes behind a feature flag.

For user-facing docs (theme catalog, demo URLs, "when to use which"), see the **3D Landing Page** section in the project root `CLAUDE.md`.

## Architecture

```
landing-3d/
├── data.ts                    # SINGLE SOURCE OF TRUTH for content
├── types.ts                   # PortfolioData, TechItem, Role, Cert, ThemeComponentProps
├── colors.ts                  # Terminal theme tokens (ported from wireframe THEMES)
├── drill.ts                   # Body-class side-channel for DOM↔3D drilling
├── useLandingTheme.ts         # Feature-flag resolver (URL > localStorage > env > default)
├── useTypingName.ts           # Shared typing-animation state (DOM + terminal screen)
├── Landing3D.tsx              # Orchestrator: reads flag, mounts active theme
├── CanvasShell.tsx            # <Canvas> wrapper with perf monitor + visibility pause
├── primitives/
│   ├── HoverHalo.tsx          # Damped scale-up on hover
│   ├── FloatingLabel.tsx      # drei <Html> label, terminal-styled
│   └── TerminalScreen.tsx     # Procedural CRT screen rendering typed name
└── themes/
    ├── registry.ts            # Theme catalog (lazy-imported components)
    ├── TerminalWorkstation.tsx
    ├── MissionControl.tsx
    ├── Constellation.tsx
    └── Topographic.tsx
```

## Data / design separation

**Themes are pure renderers of `data.ts`.** Every theme component receives `props.data: PortfolioData` and iterates — no theme hardcodes content strings, tech names, role years, or counts.

Edits to `data.ts` propagate to:
- The DOM in `pages/AboutMe.tsx` (tech chips, system-info rows, cert list)
- All four 3D themes (where applicable to that theme's metaphor)

To verify the contract: append a new tech to `portfolioData.techStack`. Without touching any theme file, the DOM callout gets a new chip, mission-control gets a new satellite, constellation gets a new node + auto-wired edges.

## DOM ↔ 3D drilling bridge

When a 3D element is hovered, the theme calls `setHoverDrill(id)` (see `drill.ts`), which adds `landing3d-hover-{id}` to `<body>`. CSS rules in `pages/AboutMe.css` match `body.landing3d-hover-foo [data-tech-id="foo"]` and apply an outline + glow.

The same `id`s are used on both sides — they come from `data.ts`. Hovering the constellation `langgraph` node lights up the DOM `<span data-tech-id="langgraph">` and vice versa is possible (DOM-side hover handlers can call `setHoverDrill`; not currently wired).

## Performance budget

- Lazy-loaded as separate chunks (`React.lazy`) so the Projects/Resume/Blog tabs aren't penalized
- DPR clamped to `[1, 1.5]`; `<AdaptiveDpr pixelated />` drops it under load
- `<PerformanceMonitor>` from drei flips `lowPerf` on sustained decline; themes use this to disable bloom and downsample geometry
- Mobile heuristic: `navigator.hardwareConcurrency < 4 || max-width: 800px` → starts in `lowPerf` mode
- `prefers-reduced-motion: reduce` → all auto-rotation halts
- Canvas `frameloop="never"` when tab is hidden (Visibility API) or scrolled off-screen (IntersectionObserver)

## Why R3F over vanilla three.js

The reference wireframes (`wireframe/` repo) are vanilla three.js + importmap. We adapted the **patterns** (3D scaffold + DOM panel, theme tokens, hover-driven drilling), but the implementation is React Three Fiber because:
- The portfolio is React 19; R3F integrates with HMR, Suspense, lazy
- The four-theme registry pattern is naturally JSX-composable
- R3F handles the rAF loop, raycaster, and disposal — patterns we'd otherwise port from `wireframe/shared/`

## Adding a new theme

1. Extend `LandingThemeId` in `types.ts`
2. Create `themes/MyTheme.tsx` with signature `(props: ThemeComponentProps) => JSX`. Read content from `props.data`.
3. Register in `themes/registry.ts` — give it a label, description, and `defaultCameraPos`. Use `lazy(() => import('./MyTheme.tsx'))`.
