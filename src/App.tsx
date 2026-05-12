/** @format */

import React, { Suspense } from "react";
import {
  HashRouter as Router,
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
// Eager-loaded loader (not lazy) — it's the Suspense fallback for the
// lazy HallLanding chunk so it must already be present in the main bundle.
// CSS module weight is ~1 KB gzipped, so this trade-off is essentially
// free relative to the 3D bundle weight that the loader is bridging.
import HallLoader from "./landing/Hall/HallLoader.tsx";

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

const TerminalApp: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isHallPath = location.pathname === "/hall" || location.pathname.startsWith("/hall/");

  // Global ESC → home. Inner pages have no internal nav; the 3D workstation
  // is the only entry point to sections. The Hall manages its own ESC
  // handler (close map → fly to hub → leave Hall), so opt out there.
  React.useEffect(() => {
    if (isHallPath) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && location.pathname !== "/") {
        navigate("/");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isHallPath, location.pathname, navigate]);

  // Landing route: render the 3D Workstation full-bleed without terminal chrome.
  if (location.pathname === "/") {
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
          <button
            type="button"
            className="titlebar-back"
            onClick={() => navigate("/")}
            aria-label="back to workstation"
            title="back to workstation (esc)"
          >
            ← workstation
          </button>
        </div>

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
