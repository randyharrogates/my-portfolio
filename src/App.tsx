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
  useParams,
} from "react-router-dom";
import "./App.css";
import SiteLayout from "./site/SiteLayout.tsx";
import HomePage from "./site/HomePage.tsx";
import WorkPage from "./site/WorkPage.tsx";
import CasePage from "./site/CasePage.tsx";
import AboutPage from "./site/AboutPage.tsx";
import ResumePage from "./site/ResumePage.tsx";

import Blog from "./pages/Blog.tsx";
// Eager-loaded loader (not lazy) — it's the Suspense fallback for the
// lazy HallLanding chunk so it must already be present in the main bundle.
// CSS module weight is ~1 KB gzipped, so this trade-off is essentially
// free relative to the 3D bundle weight that the loader is bridging.
import HallLoader from "./landing/Hall/HallLoader.tsx";
import { isMobileViewport } from "./landing/use-low-power.ts";

// Lazy-load the canvases so R3F doesn't bloat the main bundle.
const AmbientCanvas = React.lazy(
  () => import("./components/ambient-3d/AmbientCanvas.tsx"),
);
const HallLanding = React.lazy(() => import("./landing/Hall/HallLanding.tsx"));

const TABS = [
  { path: "/about", label: "about", exact: true },
  { path: "/projects", label: "projects", num: 1 },
  { path: "/skills", label: "skills", num: 2 },
  { path: "/blog", label: "blog", num: 3 },
  { path: "/resume", label: "resume", num: 4 },
  { path: "/contact", label: "contact", num: 5 },
];

const TerminalApp: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = React.useMemo(() => isMobileViewport(), []);

  const isHallPath =
    location.pathname === "/hall" || location.pathname.startsWith("/hall/");

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
            location.pathname.startsWith(t.path + "/"),
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
            terminal — <span className="title-name">Randy Chan</span> · GenAI
            Solutions Portfolio
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
          <Blog />
        </main>

        {/* Status Bar */}
        <div className="terminal-statusbar">
          <div className="status-left">
            <span className="status-dot" />
            available for work
          </div>
          <div className="status-right">
            <footer className="terminal-footer">
              <a href="mailto:randychan_92@outlook.com">
                randychan_92@outlook.com
              </a>
              {" · "}
              <a
                href="https://github.com/randyharrogates"
                target="_blank"
                rel="noopener noreferrer"
              >
                github
              </a>
              {" · "}
              <a
                href="https://www.linkedin.com/in/randychan112"
                target="_blank"
                rel="noopener noreferrer"
              >
                linkedin
              </a>
            </footer>
            <span>ai software engineer · 8+ yoe</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const LEGACY: Record<string, string> = {
  "credit-memo": "credit-memo",
  "kyb-pipeline": "credit-memo",
  jarvis: "jarvis",
  kestrel: "kestrel",
  twc: "twc",
  leeseidon: "leeseidon",
  verona: "verona",
  "speech-to-text": "speech",
  "multi-agent-rag": "agent-pilot",
  "mcp-server": "mcp-pack",
  "resume-builder": "resume-builder",
};
function LegacyProject() {
  const { slug } = useParams();
  return (
    <Navigate
      to={slug && LEGACY[slug] ? "/work/" + LEGACY[slug] : "/work"}
      replace
    />
  );
}
const App: React.FC = () => (
  <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes>
      <Route path="/hall/*" element={<TerminalApp />} />
      <Route path="/blog" element={<TerminalApp />} />
      <Route path="/projects" element={<Navigate to="/work" replace />} />
      <Route path="/projects/:slug" element={<LegacyProject />} />
      <Route path="/skills" element={<Navigate to="/about" replace />} />
      <Route path="/contact" element={<Navigate to="/about" replace />} />
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/work" element={<WorkPage />} />
        <Route path="/work/:id" element={<CasePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/resume" element={<ResumePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </Router>
);
export default App;
