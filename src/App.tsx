/** @format */

import React from "react";
import { HashRouter as Router, Route, Routes, NavLink, useLocation, useNavigate } from "react-router-dom";
import "./App.css";

import AboutMe from "./pages/AboutMe.tsx";
import Projects from "./pages/Projects.tsx";
import Skills from "./pages/Skills.tsx";
import FineTuning from "./pages/FineTuning.tsx";
import Contact from "./pages/Contact.tsx";

const TABS = [
  { path: "/",            label: "intro",       exact: true  },
  { path: "/projects",    label: "projects",    num: 1       },
  { path: "/skills",      label: "skills",      num: 2       },
  { path: "/fine-tuning", label: "fine-tuning", num: 3       },
  { path: "/contact",     label: "contact",     num: 4       },
];

const TerminalApp: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Keyboard arrow-key navigation between tabs
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const idx = TABS.findIndex((t) =>
        t.exact ? location.pathname === t.path : location.pathname === t.path
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

  const isTabActive = (tab: typeof TABS[0]) =>
    tab.exact ? location.pathname === tab.path : location.pathname === tab.path;

  return (
    <div className="page-bg">
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
            terminal — <span className="title-name">Randy Chan</span> · Portfolio
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
            <Route path="/"            element={<AboutMe />}    />
            <Route path="/projects"    element={<Projects />}   />
            <Route path="/skills"      element={<Skills />}     />
            <Route path="/fine-tuning" element={<FineTuning />} />
            <Route path="/contact"     element={<Contact />}    />
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
            <span>senior ai software engineer · 6 yoe</span>
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
