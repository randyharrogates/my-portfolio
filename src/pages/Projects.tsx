/** @format */

import React from "react";
import { Routes, Route, NavLink, Navigate, useLocation } from "react-router-dom";
import "./Projects.css";

import Twc from "./Twc.tsx";
import Leeseidon from "./Leeseidon.tsx";
import CreditMemo from "./CreditMemo.tsx";
import KybPipeline from "./KybPipeline.tsx";
import MultiAgentRag from "./MultiAgentRag.tsx";
import SpeechToText from "./SpeechToText.tsx";
import FineTuning from "./FineTuning.tsx";
import HolidayBooking from "./HolidayBooking.tsx";
import Ecommerce from "./Ecommerce.tsx";
import HrmSystem from "./HrmSystem.tsx";
import McpServer from "./McpServer.tsx";
import ResumeBuilder from "./ResumeBuilder.tsx";
import Verona from "./Verona.tsx";
import Jarvis from "./Jarvis.tsx";
import Kestrel from "./Kestrel.tsx";

const SUB_TABS = [
  { slug: "twc",             label: "twc",             featured: true },
  { slug: "leeseidon",       label: "leeseidon",       featured: true },
  { slug: "credit-memo",     label: "credit-memo",     featured: true },
  { slug: "kyb-pipeline",    label: "kyb-pipeline",    featured: true },
  { slug: "multi-agent-rag", label: "multi-agent-rag", featured: true },
  { slug: "fine-tuning",     label: "fine-tuning"      },
  { slug: "speech-to-text",  label: "speech-to-text"   },
  { slug: "holiday-booking", label: "holiday-booking"  },
  { slug: "ecommerce",       label: "ecommerce"        },
  { slug: "hrm-system",      label: "hrm-system"       },
  { slug: "mcp-server",      label: "mcp-server",      featured: true },
  { slug: "resume-builder",  label: "resume-builder",  featured: true },
  { slug: "verona",          label: "verona",          featured: true },
  { slug: "jarvis",          label: "jarvis",          featured: true },
  { slug: "kestrel",         label: "kestrel",         featured: true },
];

const Projects: React.FC = () => {
  const location = useLocation();

  return (
    <div className="projects-wrap">
      <div className="prompt-line">
        <span className="prompt-path">~/portfolio</span>
        <span className="prompt-sep"> $ </span>
        <span className="prompt-cmd">ls -la projects/</span>
      </div>

      {/* Sub-tab navigation */}
      <nav className="projects-subnav" aria-label="Project list">
        {SUB_TABS.map((tab, i) => (
          <NavLink
            key={tab.slug}
            to={tab.slug}
            className={({ isActive }) =>
              `subnav-item${isActive || location.pathname.endsWith("/" + tab.slug) ? " subnav-active" : ""}`
            }
          >
            <span className="subnav-num">{String(i + 1).padStart(2, "0")}</span>
            {tab.label}
            {tab.featured && <span className="subnav-badge">★</span>}
          </NavLink>
        ))}
      </nav>

      {/* Nested project routes */}
      <div className="projects-content">
        <Routes>
          <Route index element={<Navigate to="twc" replace />} />
          <Route path="twc"             element={<Twc />} />
          <Route path="leeseidon"       element={<Leeseidon />} />
          <Route path="credit-memo"     element={<CreditMemo />} />
          <Route path="kyb-pipeline"    element={<KybPipeline />} />
          <Route path="multi-agent-rag" element={<MultiAgentRag />} />
          <Route path="fine-tuning"     element={<FineTuning />} />
          <Route path="speech-to-text"  element={<SpeechToText />} />
          <Route path="holiday-booking" element={<HolidayBooking />} />
          <Route path="ecommerce"       element={<Ecommerce />} />
          <Route path="hrm-system"      element={<HrmSystem />} />
          <Route path="mcp-server"      element={<McpServer />} />
          <Route path="resume-builder"  element={<ResumeBuilder />} />
          <Route path="verona"          element={<Verona />} />
          <Route path="jarvis"          element={<Jarvis />} />
          <Route path="kestrel"         element={<Kestrel />} />
        </Routes>
      </div>
    </div>
  );
};

export default Projects;
