/** @format */

import React, { Suspense } from "react";
import {
  HashRouter as Router,
  Route,
  Routes,
  NavLink,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";
import "./App.css";

import AboutMe from "./pages/AboutMe.tsx";
import Projects from "./pages/Projects.tsx";
import Skills from "./pages/Skills.tsx";
import Blog from "./pages/Blog.tsx";
import Contact from "./pages/Contact.tsx";
import Resume from "./pages/Resume.tsx";
// Eager-loaded loader (not lazy) — it's the Suspense fallback for the
// lazy HallLanding chunk so it must already be present in the main bundle.
// CSS module weight is ~1 KB gzipped, so this trade-off is essentially
// free relative to the 3D bundle weight that the loader is bridging.
import HallLoader from "./landing/Hall/HallLoader.tsx";
import { isMobileViewport } from "./landing/use-low-power.ts";

// Lazy-load the canvases so R3F doesn't bloat the main bundle.
const AmbientCanvas = React.lazy(
  () => import("./components/ambient-3d/AmbientCanvas.tsx")
);
const WorkstationLanding = React.lazy(
  () => import("./landing/WorkstationLanding.tsx")
);
const HallLanding = React.lazy(
  () => import("./landing/Hall/HallLanding.tsx")
);

const TABS = [
  { path: "/about",    label: "about",    exact: true },
  { path: "/projects", label: "projects", num: 1 },
  { path: "/skills",   label: "skills",   num: 2 },
  { path: "/blog",     label: "blog",     num: 3 },
  { path: "/resume",   label: "resume",   num: 4 },
  { path: "/contact",  label: "contact",  num: 5 },
];

const TerminalApp: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = React.useMemo(() => isMobileViewport(), []);

  const isHallPath = location.pathname === "/hall" || location.pathname.startsWith("/hall/");

  // Keyboard arrow-key navigation between tabs + global ESC → home.
  // The Hall manages its own ESC handler (close map → fly to hub → leave
  // Hall), so opt out there.
  React.useEffect(() => {
    if (isHallPath) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && location.pathname !== "/") {
        navigate("/");
        return;
      }
      const idx = TABS.findIndex((t) =>
        t.exact
          ? location.pathname === t.path
          : location.pathname === t.path ||
            location.pathname.startsWith(t.path + "/")
      );
      if (idx === -1) return;
      if (e.key === "ArrowRight" && idx < TABS.length - 1) {
        navigate(TABS[idx + 1].path);
      } else if (e.key === "ArrowLeft" && idx > 0) {
        navigate(TABS[idx - 1].path);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isHallPath, location.pathname, navigate]);

  const isTabActive = (tab: (typeof TABS)[0]) =>
    tab.exact
      ? location.pathname === tab.path
      : location.pathname === tab.path ||
        location.pathname.startsWith(tab.path + "/");

  // Landing route: render the 3D Workstation full-bleed without terminal chrome.
  // On mobile (≤ 800px), redirect straight to the terminal AboutMe page — the
  // workstation UI is uncomfortable to operate on touch + small viewports.
  if (location.pathname === "/") {
    if (isMobile) return <Navigate to="/about" replace />;
    return (
      <Suspense fallback={<div style={{ background: "#0c0b0a", height: "100vh" }} />}>
        <WorkstationLanding />
      </Suspense>
    );
  }

  // Hall (experimental, opt-in via /#/hall) — also full-bleed, no terminal chrome.
  // Matches /hall and any deep-linked /hall/<alcove>. URL-flag-gated through
  // Phase 7; becomes the default landing at Phase 8.
  if (isHallPath) {
    return (
      <Suspense fallback={<HallLoader />}>
        <HallLanding />
      </Suspense>
    );
  }

  return (
    <div className="page-bg">
      {/* Ambient 3D background — lazy-loaded; sits behind the terminal window */}
      <Suspense fallback={null}>
        <AmbientCanvas />
      </Suspense>

      {/* ── Terminal Window ── */}
      <div className="terminal-window">

        {/* Title Bar */}
        <div className="terminal-titlebar">
          <div className="traffic-lights">
            <span className="light red" />
            <span className="light yellow" />
            <span className="light green" />
          </div>
          <span className="terminal-title">
            terminal — <span className="title-name">Randy Chan</span> · GenAI Solutions Portfolio
          </span>
          {!isMobile && (
            <button
              type="button"
              className="titlebar-back"
              onClick={() => navigate("/")}
              aria-label="back to workstation"
              title="back to workstation (esc)"
            >
              ← workstation
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <nav className="terminal-tabs" aria-label="Portfolio sections">
          {TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.exact}
              className={`tab-item${isTabActive(tab) ? " tab-active" : ""}`}
            >
              {tab.num ? (
                <span className="tab-num">{tab.num}</span>
              ) : (
                <span className="tab-indicator">→</span>
              )}
              {tab.label}
            </NavLink>
          ))}
        </nav>

        {/* Page Content */}
        <main className="terminal-content">
          <Routes>
            <Route path="/about"         element={<AboutMe />}     />
            <Route path="/projects/*"    element={<Projects />}    />
            <Route path="/skills"        element={<Skills />}      />
            <Route path="/blog"          element={<Blog />}        />
            <Route path="/resume"        element={<Resume />}      />
            <Route path="/contact"       element={<Contact />}     />
          </Routes>
        </main>

        {/* Status Bar */}
        <div className="terminal-statusbar">
          <div className="status-left">
            <span className="status-dot" />
            available for work
          </div>
          <div className="status-right">
            <footer className="terminal-footer">
              <a href="mailto:randychan_92@outlook.com">randychan_92@outlook.com</a>
              {" · "}
              <a href="https://github.com/randyharrogates" target="_blank" rel="noopener noreferrer">github</a>
              {" · "}
              <a href="https://www.linkedin.com/in/randychan112" target="_blank" rel="noopener noreferrer">linkedin</a>
            </footer>
            <span>genai solutions engineer · 7 yoe</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <Router>
    <TerminalApp />
  </Router>
);

export default App;
