/** @format */

import React from "react";
import "./CreditMemo.css";
import ArchitectureDiagram from "../components/ArchitectureDiagram.tsx";

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

          <ArchitectureDiagram
            ariaLabel="Credit memo architecture: 11 LangGraph components emit to Azure Service Bus, which 14 workers consume to feed 8 retrieving domains"
            caption="11 LangGraph components · Azure Service Bus · 14 worker consumers · 8 analysis domains"
          >
            <svg viewBox="0 0 940 420" role="img" aria-hidden="false">
              <title>Credit Memo Architecture</title>
              <desc>
                A central Azure Service Bus orchestrates 11 LangGraph components. Each component runs
                a Processing then Retrieving phase. 14 worker consumers pull from the bus. Eight
                analysis domains (business, financial, news, management, industry, ESG, competition,
                customer/supplier) are produced. A multi-LLM layer (OpenAI, Anthropic, Google) feeds
                processing; a shared vector cache (NFS + Azure Blob) supports retrieval; human-in-the-loop
                gates provide governance.
              </desc>

              <defs>
                <marker id="cm-arrow" viewBox="0 0 10 10" refX="9" refY="5"
                        markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#5a5450" />
                </marker>
                <marker id="cm-arrow-accent" viewBox="0 0 10 10" refX="9" refY="5"
                        markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#e8632a" />
                </marker>
              </defs>

              {/* Top peripherals */}
              <g>
                <rect className="ad-node" x="20" y="14" width="300" height="32" rx="16" />
                <text className="ad-label" x="170" y="34" textAnchor="middle">
                  Multi-LLM · OpenAI · Anthropic · Google
                </text>
              </g>
              <g>
                <rect className="ad-node-active" x="620" y="14" width="300" height="32" rx="16" />
                <text className="ad-label" x="770" y="34" textAnchor="middle">
                  HITL · Human-in-the-Loop review gates
                </text>
              </g>

              {/* Phase 1: 11 LangGraph components (two rows: 6 + 5) */}
              <text className="ad-phase" x="20" y="74">PHASE 1 — PROCESSING (11 LANGGRAPH COMPONENTS)</text>
              {/* Row 1: 6 pills */}
              <g>
                <rect className="ad-node" x="20" y="84" width="140" height="34" rx="4" />
                <text className="ad-label" x="90" y="106" textAnchor="middle">business</text>
              </g>
              <g>
                <rect className="ad-node" x="170" y="84" width="140" height="34" rx="4" />
                <text className="ad-label" x="240" y="106" textAnchor="middle">financial</text>
              </g>
              <g>
                <rect className="ad-node" x="320" y="84" width="140" height="34" rx="4" />
                <text className="ad-label" x="390" y="106" textAnchor="middle">news</text>
              </g>
              <g>
                <rect className="ad-node" x="470" y="84" width="140" height="34" rx="4" />
                <text className="ad-label" x="540" y="106" textAnchor="middle">management</text>
              </g>
              <g>
                <rect className="ad-node" x="620" y="84" width="140" height="34" rx="4" />
                <text className="ad-label" x="690" y="106" textAnchor="middle">industry</text>
              </g>
              <g>
                <rect className="ad-node" x="770" y="84" width="150" height="34" rx="4" />
                <text className="ad-label" x="845" y="106" textAnchor="middle">esg</text>
              </g>
              {/* Row 2: 5 pills (centered) */}
              <g>
                <rect className="ad-node" x="95" y="126" width="140" height="34" rx="4" />
                <text className="ad-label" x="165" y="148" textAnchor="middle">competition</text>
              </g>
              <g>
                <rect className="ad-node" x="245" y="126" width="180" height="34" rx="4" />
                <text className="ad-label" x="335" y="148" textAnchor="middle">customer/supplier</text>
              </g>
              <g>
                <rect className="ad-node" x="435" y="126" width="160" height="34" rx="4" />
                <text className="ad-label" x="515" y="148" textAnchor="middle">foundation pipeline ×2</text>
              </g>
              <g>
                <rect className="ad-node" x="605" y="126" width="160" height="34" rx="4" />
                <text className="ad-label" x="685" y="148" textAnchor="middle">agentic chatbot</text>
              </g>
              <g>
                <rect className="ad-node" x="775" y="126" width="145" height="34" rx="4" />
                <text className="ad-label-mute" x="847" y="148" textAnchor="middle">+ 27 modules</text>
              </g>

              {/* Service Bus spine */}
              <g>
                <rect className="ad-node-spine" x="20" y="190" width="900" height="44" rx="22" />
                <text className="ad-label" x="470" y="217" textAnchor="middle">
                  Azure Service Bus · event-driven orchestration
                </text>
              </g>

              {/* 14 worker ticks */}
              <g>
                <text className="ad-label-mute" x="20" y="258">14 worker consumers ↓</text>
                {Array.from({ length: 14 }).map((_, i) => {
                  const x = 200 + i * 36;
                  return (
                    <line
                      key={i}
                      x1={x}
                      y1={246}
                      x2={x}
                      y2={262}
                      stroke="#e8632a"
                      strokeWidth="2"
                    />
                  );
                })}
              </g>

              {/* Phase 2: 8 analysis domains, color-coded */}
              <text className="ad-phase" x="20" y="288">PHASE 2 — RETRIEVING (8 ANALYSIS DOMAINS)</text>
              {[
                { x: 20, name: "business", color: "#e8632a" },
                { x: 130, name: "financial", color: "#4ade80" },
                { x: 240, name: "news", color: "#60a5fa" },
                { x: 350, name: "management", color: "#c084fc" },
                { x: 460, name: "industry", color: "#e8632a" },
                { x: 570, name: "esg", color: "#4ade80" },
                { x: 680, name: "competition", color: "#60a5fa" },
                { x: 790, name: "customer/supplier", color: "#c084fc" },
              ].map((d, i) => (
                <g key={i}>
                  <rect
                    x={d.x}
                    y={300}
                    width="105"
                    height="34"
                    rx="4"
                    fill="#1d1b19"
                    stroke={d.color}
                    strokeOpacity="0.55"
                    strokeWidth="1.25"
                  />
                  <text className="ad-label" x={d.x + 52} y={322} textAnchor="middle">
                    {d.name}
                  </text>
                </g>
              ))}

              {/* Vector cache lozenge (bottom-left) */}
              <g>
                <rect className="ad-node" x="20" y="370" width="320" height="34" rx="16" />
                <text className="ad-label" x="180" y="391" textAnchor="middle">
                  Vector cache · NFS + Azure Blob
                </text>
              </g>
              {/* Output lozenge (bottom-right) */}
              <g>
                <rect className="ad-node-active" x="600" y="370" width="320" height="34" rx="16" />
                <text className="ad-label" x="760" y="391" textAnchor="middle">
                  Synthesized credit memo · evidence-indexed
                </text>
              </g>

              {/* Edges */}
              {/* Multi-LLM → Processing (down) */}
              <path className="ad-edge" d="M 170 46 L 170 84" markerEnd="url(#cm-arrow)" />
              {/* Processing rows → Service Bus */}
              <path className="ad-edge-accent" d="M 470 160 L 470 190" markerEnd="url(#cm-arrow-accent)" />
              <path className="ad-edge" d="M 90 118 L 90 190" markerEnd="url(#cm-arrow)" />
              <path className="ad-edge" d="M 845 118 L 845 190" markerEnd="url(#cm-arrow)" />
              {/* Service Bus → Retrieving (via worker ticks already shown) */}
              <path className="ad-edge-accent" d="M 470 234 L 470 300" markerEnd="url(#cm-arrow-accent)" />
              {/* Retrieving → Output */}
              <path className="ad-edge-accent" d="M 760 334 L 760 370" markerEnd="url(#cm-arrow-accent)" />
              {/* Vector cache ↔ Service Bus */}
              <path className="ad-edge" d="M 180 370 L 180 234" markerEnd="url(#cm-arrow)" />
              <path className="ad-edge" d="M 200 234 L 200 370" markerEnd="url(#cm-arrow)" />
              {/* HITL → Output */}
              <path className="ad-edge" d="M 770 46 C 770 70, 920 200, 920 370" markerEnd="url(#cm-arrow)" fill="none" />
            </svg>
          </ArchitectureDiagram>

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
