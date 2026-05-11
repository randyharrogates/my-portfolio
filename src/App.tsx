/** @format */

import React, { Suspense } from "react";
import {
  HashRouter as Router,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import "./App.css";

import AboutMe from "./pages/AboutMe.tsx";
import Projects from "./pages/Projects.tsx";
import Skills from "./pages/Skills.tsx";
import Blog from "./pages/Blog.tsx";
import Contact from "./pages/Contact.tsx";
import Resume from "./pages/Resume.tsx";
import { SECTIONS } from "./landing/sections.ts";
import { useIsMobileViewport } from "./landing/use-low-power.ts";

// Lazy-load the canvases so R3F doesn't bloat the main bundle.
const AmbientCanvas = React.lazy(
  () => import("./components/ambient-3d/AmbientCanvas.tsx")
);
const WorkstationLanding = React.lazy(
  () => import("./landing/WorkstationLanding.tsx")
);

const TABS: { label: string; path: string }[] = SECTIONS.map((s) => ({
  label: s.label,
  path: s.route,
}));

const TerminalApp: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobileViewport();

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (location.pathname === "/") return;

      if (e.key === "Escape") {
        if (!isMobile) navigate("/");
        return;
      }

      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      const currentIdx = TABS.findIndex(
        (t) =>
          location.pathname === t.path ||
          (t.path === "/projects" && location.pathname.startsWith("/projects/"))
      );
      if (currentIdx === -1) return;
      const delta = e.key === "ArrowRight" ? 1 : -1;
      const next = (currentIdx + delta + TABS.length) % TABS.length;
      navigate(TABS[next].path);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [location.pathname, navigate, isMobile]);

  if (location.pathname === "/") {
    if (isMobile) return <Navigate to="/about" replace />;
    return (
      <Suspense fallback={<div style={{ background: "#0c0b0a", height: "100vh" }} />}>
        <WorkstationLanding />
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
          {!isMobile ? (
            <button
              type="button"
              className="titlebar-back"
              onClick={() => navigate("/")}
              aria-label="back to workstation"
              title="back to workstation (esc)"
            >
              ← workstation
            </button>
          ) : (
            <span />
          )}
        </div>

        <nav className="terminal-tabs" aria-label="sections">
          {TABS.map((t, i) => {
            const active =
              location.pathname === t.path ||
              (t.path === "/projects" &&
                location.pathname.startsWith("/projects/"));
            return (
              <Link
                key={t.path}
                to={t.path}
                className={`tab-item${active ? " tab-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="tab-num">{i + 1}</span>
                <span>{t.label}</span>
                {active && <span className="tab-indicator">●</span>}
              </Link>
            );
          })}
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
