/** @format */

import React from "react";
import "./Kestrel.css";

const Kestrel: React.FC = () => {
  return (
    <div className="kestrel-wrap">
      <div className="kestrel-title-row">
        <span className="kestrel-num">15</span>
        <h2 className="kestrel-title">
          Kestrel — <span className="hl-orange">MCP-Native</span> Compliance Tool for SG Financial
          Advisers
        </h2>
      </div>

      <hr className="terminal-divider" />

      {/* Tech stack */}
      <div className="code-block">
        <span className="cmt"># tech stack</span>
        <br />
        <span className="key">protocol</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"MCP-native — remote Streamable-HTTP MCP + OAuth 2.1"</span>
        <br />
        <span className="key">model</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"BYO-Claude (customer's Cowork / Claude Code) — near-zero inference COGS"</span>
        <br />
        <span className="key">backend</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"Python · FastAPI · Pydantic · Alembic — no-LLM system of record"</span>
        <br />
        <span className="key">pipeline</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"Azure DI OCR · 29-field canonical roster · confidence + citations"</span>
        <br />
        <span className="key">compliance</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"Mandatory human-confirm gate · immutable audit · anti-fabrication"</span>
      </div>

      {/* Architecture visual */}
      <div className="kestrel-arch-block">
        <span className="cmt">$ kestrel status</span>
        <br />
        <span className="hl-green">✓</span> <span>customer&apos;s own Claude reads the policy PDF + maps the field roster</span>
        <br />
        <span className="hl-green">✓</span> <span>drives Kestrel over a remote MCP server (OAuth 2.1 bearer)</span>
        <br />
        <span className="hl-green">✓</span> <span>backend: CRUD + write-time validator + immutable audit (no LLM)</span>
        <br />
        <span className="hl-green">✓</span> <span>mandatory licensed-human confirmation gate before anything is acted on</span>
        <br />
        <span className="hl-orange">i</span>{" "}
        <span style={{ color: "#5a5450" }}>Built for MAS/FAA accountability — repo private</span>
      </div>

      {/* Overview */}
      <p className="kestrel-body">
        Kestrel helps Singapore financial advisers review old insurance policies. An adviser uploads
        a policy document — a PDF, scan, or phone photo — and Kestrel maps a canonical{" "}
        <span className="hl-green">29-field roster</span> with per-field confidence and source
        citations, flags gaps, and drafts an advisory summary and customer report. The licensed
        adviser — <span className="hl-orange">not the AI</span> — stays accountable under MAS/FAA.
      </p>

      <h4 className="kestrel-subheading">MCP-Native Architecture</h4>
      <p className="kestrel-body">
        The backend is a <span className="hl-blue">no-LLM, compliance-grade system of record</span>{" "}
        — CRUD, a write-time validator, and an immutable audit trail. The intelligence runs in the{" "}
        <span className="hl-purple">customer&apos;s own Claude</span> (Cowork or Claude Code), which
        drives Kestrel through a remote MCP server over OAuth 2.1. BYO-Claude means near-zero
        inference cost and a high-margin, product-led SaaS.
      </p>

      <h4 className="kestrel-subheading">Compliance by Construction</h4>
      <p className="kestrel-body">
        Extraction is strictly <span className="hl-green">descriptive</span> — no invented values;
        every field carries a confidence score and a source citation, and every change is written to
        an immutable audit trail.
      </p>

      <h4 className="kestrel-subheading">Accountability Boundary</h4>
      <p className="kestrel-body">
        The AI drafts; a <span className="hl-orange">licensed adviser reviews, edits, and
        confirms</span> behind a mandatory human gate before any advice is acted on. The adviser
        remains the accountable party.
      </p>

      <div className="callout-box">
        <div className="callout-label">Regulatory Framing</div>
        <p>
          Designed for MAS/FAA accountability — AI drafts, a licensed human decides; every action is
          audited and reversible. (Distinct from the enterprise MCP-server project above: Kestrel is
          a standalone, owner-built fintech product.)
        </p>
      </div>

      <div className="kestrel-actions">
        <a href="mailto:randychan_92@outlook.com" className="terminal-btn primary">
          <span className="btn-prefix">$</span> request more information
        </a>
      </div>
    </div>
  );
};

export default Kestrel;
