/** @format */

import React from "react";
import "./CreditMemo.css";

const CreditMemo: React.FC = () => {
  return (
    <div className="cm-wrap">
      {/* Title row — full width */}
      <div className="cm-title-row">
        <span className="cm-num">01</span>
        <h2 className="cm-title">
          Multi Agent <span className="hl-orange">Credit Memo</span> Research Suite
        </h2>
      </div>

      <hr className="terminal-divider" />

      {/* Two-column body */}
      <div className="cm-layout">
        {/* ── Left: image + actions ── */}
        <div className="cm-left">
          <img
            src={`${process.env.PUBLIC_URL}/credit-memo.webp`}
            alt="Credit Memo Research Suite"
            className="cm-hero-img"
          />

          <div className="cm-actions">
            <a href="mailto:randychan_92@outlook.com" className="terminal-btn primary">
              <span className="btn-prefix">$</span> request more information
            </a>
          </div>
        </div>

        {/* ── Right: text content ── */}
        <div className="cm-right">
          {/* Tech stack */}
          <div className="code-block">
            <span className="cmt"># tech stack</span>
            <br />
            <span className="key">orchestration</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"LangGraph + Azure Service Bus"</span>
            <br />
            <span className="key">backend</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Python · FastAPI · Pydantic V2"</span>
            <br />
            <span className="key">database</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"MongoDB · NFS · Azure Blob Storage"</span>
            <br />
            <span className="key">config</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Hydra · LangFuse"</span>
            <br />
            <span className="key">infra</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Docker (containerized)"</span>
          </div>

          {/* Overview */}
          <p className="cm-body">
            A sophisticated <span className="hl-green">event-driven RAG system</span> built for
            automated credit memo analysis, designed in close partnership with credit risk analysts
            to define assessment workflows and validation criteria. The system orchestrates{" "}
            <span className="hl-orange">11 specialized LangGraph components</span> across 8
            analysis domains — including business, financial, news, management, industry, ESG,
            competition, and customer/supplier assessment — alongside 2 foundation pipelines and
            an agentic chatbot interface.
          </p>

          {/* Architecture */}
          <h4 className="cm-subheading">Event-Driven Multi-Agent Architecture</h4>
          <p className="cm-body">
            Each component follows a <span className="hl-orange">two-phase Processing → Retrieving</span>{" "}
            pattern, coordinated through <span className="hl-blue">Azure Service Bus</span> with 14 active
            worker consumers. The system leverages <span className="hl-purple">27 reusable pipeline modules</span>{" "}
            for LLM operations, multi-source search, vector retrieval, content processing, and quality assessment
            — achieving 85% latency reduction and 80%+ memory savings over the previous architecture.
          </p>

          {/* Capabilities */}
          <h4 className="cm-subheading">Key Capabilities</h4>
          <p className="cm-body">
            Features include <span className="hl-green">multi-LLM processing</span> (OpenAI, Anthropic, Google),
            advanced reranking with reciprocal rank fusion,{" "}
            <span className="hl-blue">intelligent vector caching</span> across NFS and Azure Blob Storage,
            and comprehensive <span className="hl-purple">LangFuse observability</span> with hierarchical
            tracing. Incorporates <span className="hl-orange">agentic governance controls</span> including
            Human-in-the-Loop review gates for high-risk credit decisions and configurable approval
            workflows. Supports multi-language processing across 8 languages with neural model compatibility.
          </p>

          {/* Solution Impact */}
          <div className="callout-box">
            <div className="callout-label">Solution Impact</div>
            <p>
              Reduced analyst research time by automating 8 parallel analysis domains, enabling credit
              teams to process memos in a fraction of the manual timeline. The event-driven architecture
              ensures horizontal scalability for enterprise workloads while agentic governance controls
              maintain compliance accountability.
            </p>
          </div>

          {/* Privacy callout */}
          <div className="callout-box">
            <div className="callout-label">Confidentiality Notice</div>
            <p>
              Due to privacy and data confidentiality concerns, this project cannot be publicly demonstrated.
              However, a detailed explanation including architecture, methodology, and system design
              can be shared upon request.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditMemo;
