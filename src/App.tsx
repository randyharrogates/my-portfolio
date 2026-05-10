/** @format */

import React, { Suspense } from "react";
import {
  HashRouter as Router,
  Route,
  Routes,
  NavLink,
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

// Lazy-load the canvases so R3F doesn't bloat the main bundle.
const AmbientCanvas = React.lazy(
  () => import("./components/ambient-3d/AmbientCanvas.tsx")
);
const WorkstationLanding = React.lazy(
  () => import("./landing/WorkstationLanding.tsx")
);

const TABS = [
  { path: "/about",      label: "about",      exact: true  },
  { path: "/projects",   label: "projects",   num: 1       },
  { path: "/skills",     label: "skills",     num: 2       },
  { path: "/blog",       label: "blog",       num: 3       },
  { path: "/resume",     label: "resume",     num: 4       },
  { path: "/contact",    label: "contact",    num: 5       },
];

const TerminalApp: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Keyboard arrow-key navigation between tabs + global ESC → home
  React.useEffect(() => {
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
      if (e.key === "ArrowRight" && idx < TABS.length - 1) {
        navigate(TABS[idx + 1].path);
      } else if (e.key === "ArrowLeft" && idx > 0) {
        navigate(TABS[idx - 1].path);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [location.pathname, navigate]);

  const isTabActive = (tab: (typeof TABS)[0]) =>
    tab.exact
      ? location.pathname === tab.path
      : location.pathname === tab.path ||
        location.pathname.startsWith(tab.path + "/");

  // Landing route: render the 3D Workstation full-bleed without terminal chrome.
  if (location.pathname === "/") {
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
          <div className="titlebar-spacer" />
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
