/** @format */

import React from "react";
import "./KybPipeline.css";
import ArchitectureDiagram from "../components/ArchitectureDiagram.tsx";

const KybPipeline: React.FC = () => {
  return (
    <div className="kyb-wrap">
      {/* Title row — full width */}
      <div className="kyb-title-row">
        <span className="kyb-num">02</span>
        <h2 className="kyb-title">
          KYB <span className="hl-orange">Brand Risk Management</span> Suite
        </h2>
      </div>

      <hr className="terminal-divider" />

      {/* Two-column body */}
      <div className="kyb-layout">
        {/* ── Left: image + actions ── */}
        <div className="kyb-left">
          <img
            src={`${process.env.PUBLIC_URL}/kyb-pipeline.webp`}
            alt="KYB Brand Risk Management Suite"
            className="kyb-hero-img"
          />

          <div className="kyb-actions">
            <a href="mailto:randychan_92@outlook.com" className="terminal-btn primary">
              <span className="btn-prefix">$</span> request more information
            </a>
          </div>
        </div>

        {/* ── Right: text content ── */}
        <div className="kyb-right">
          {/* Tech stack */}
          <div className="code-block">
            <span className="cmt"># tech stack</span>
            <br />
            <span className="key">pipeline</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Python · AsyncIO · FAISS"</span>
            <br />
            <span className="key">search</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Oxylabs · Perplexity"</span>
            <br />
            <span className="key">agents</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Browser Use · OpenAI"</span>
            <br />
            <span className="key">output</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Structured JSON Reports"</span>
            <br />
            <span className="key">infra</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Docker (containerized)"</span>
          </div>

          {/* Overview */}
          <p className="kyb-body">
            An agentic <span className="hl-green">Know Your Business (KYB)</span> pipeline designed
            for merchant brand risk assessment, built to meet regulatory compliance requirements
            with stakeholder-approved risk scoring frameworks. The system orchestrates{" "}
            <span className="hl-orange">14+ concurrent processing nodes</span> to discover merchant
            URLs, scrape product catalogs, extract and classify content, verify checkout flows, and
            synthesize comprehensive risk reports as customer-deliverable artifacts — all with high
            concurrency and fault tolerance.
          </p>

          {/* Pipeline */}
          <h4 className="kyb-subheading">4-Phase Pipeline Architecture</h4>
          <p className="kyb-body">
            The pipeline executes across four phases:{" "}
            <span className="hl-blue">URL Discovery</span> identifies merchant websites,{" "}
            <span className="hl-orange">Parallel Branching</span> concurrently runs MCC indexing,
            web reconnaissance (scraping → extraction → service mapping → checkout verification),
            and independent analyses (regulations, adult content, reviews, merchant verification).{" "}
            <span className="hl-purple">Dependent Analysis</span> performs MCC retrieval, URL
            redirection checking, and IP infringement detection. Finally,{" "}
            <span className="hl-green">Report Synthesis</span> generates modular risk assessments
            with evidence-indexed sections.
          </p>

          <ArchitectureDiagram
            ariaLabel="KYB pipeline architecture: four phases from URL discovery to report synthesis"
            caption="4-phase pipeline · 14+ concurrent nodes · 50 parallel extractions (semaphore-controlled)"
          >
            <svg viewBox="0 0 920 360" role="img" aria-hidden="false">
              <title>KYB Pipeline Architecture</title>
              <desc>
                Four sequential phases. Phase 1 URL Discovery feeds Phase 2 which fans out to three
                parallel branches: MCC Indexing, Web Reconnaissance, and Independent Analyses. Phase 3
                merges into MCC Retrieval, URL Redirection checking, and IP Infringement detection.
                Phase 4 produces the Report Synthesis with red/yellow/green risk scoring.
              </desc>

              <defs>
                <marker id="kyb-arrow" viewBox="0 0 10 10" refX="9" refY="5"
                        markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#5a5450" />
                </marker>
                <marker id="kyb-arrow-accent" viewBox="0 0 10 10" refX="9" refY="5"
                        markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#e8632a" />
                </marker>
              </defs>

              {/* Phase column labels */}
              <text className="ad-phase" x="100" y="28" textAnchor="middle">PHASE 1</text>
              <text className="ad-phase" x="340" y="28" textAnchor="middle">PHASE 2 — PARALLEL</text>
              <text className="ad-phase" x="600" y="28" textAnchor="middle">PHASE 3 — DEPENDENT</text>
              <text className="ad-phase" x="820" y="28" textAnchor="middle">PHASE 4</text>

              {/* Phase 1: URL Discovery (single node, vertically centered) */}
              <g>
                <rect className="ad-node-active" x="20" y="155" width="160" height="50" rx="4" />
                <text className="ad-label" x="100" y="175" textAnchor="middle">URL Discovery</text>
                <text className="ad-label-mute" x="100" y="192" textAnchor="middle">merchant websites</text>
              </g>

              {/* Phase 2: three parallel branches */}
              <g>
                <rect className="ad-node" x="240" y="60" width="200" height="60" rx="4" />
                <text className="ad-label" x="340" y="82" textAnchor="middle">MCC Indexing</text>
                <text className="ad-label-mute" x="340" y="100" textAnchor="middle">FAISS vector index</text>
              </g>
              <g>
                <rect className="ad-node" x="240" y="155" width="200" height="50" rx="4" />
                <text className="ad-label" x="340" y="175" textAnchor="middle">Web Reconnaissance</text>
                <text className="ad-label-mute" x="340" y="192" textAnchor="middle">scrape → extract → map → verify</text>
              </g>
              <g>
                <rect className="ad-node" x="240" y="240" width="200" height="60" rx="4" />
                <text className="ad-label" x="340" y="262" textAnchor="middle">Independent Analyses</text>
                <text className="ad-label-mute" x="340" y="280" textAnchor="middle">regs · adult · reviews · merchant</text>
              </g>

              {/* Phase 3: dependent analyses */}
              <g>
                <rect className="ad-node" x="500" y="60" width="200" height="50" rx="4" />
                <text className="ad-label" x="600" y="80" textAnchor="middle">MCC Retrieval</text>
                <text className="ad-label-mute" x="600" y="97" textAnchor="middle">classify by code</text>
              </g>
              <g>
                <rect className="ad-node" x="500" y="155" width="200" height="50" rx="4" />
                <text className="ad-label" x="600" y="175" textAnchor="middle">URL Redirection</text>
                <text className="ad-label-mute" x="600" y="192" textAnchor="middle">resolve final hosts</text>
              </g>
              <g>
                <rect className="ad-node" x="500" y="250" width="200" height="50" rx="4" />
                <text className="ad-label" x="600" y="270" textAnchor="middle">IP Infringement</text>
                <text className="ad-label-mute" x="600" y="287" textAnchor="middle">image · trademark</text>
              </g>

              {/* Phase 4: Report Synthesis */}
              <g>
                <rect className="ad-node-spine" x="740" y="155" width="160" height="50" rx="4" />
                <text className="ad-label" x="820" y="175" textAnchor="middle">Report Synthesis</text>
                <text className="ad-label-mute" x="820" y="192" textAnchor="middle">evidence-indexed</text>
              </g>

              {/* Edges: P1 → P2 (fan-out) */}
              <path className="ad-edge-accent" d="M 180 180 C 210 180, 210 90, 240 90" markerEnd="url(#kyb-arrow-accent)" />
              <path className="ad-edge-accent" d="M 180 180 L 240 180" markerEnd="url(#kyb-arrow-accent)" />
              <path className="ad-edge-accent" d="M 180 180 C 210 180, 210 270, 240 270" markerEnd="url(#kyb-arrow-accent)" />

              {/* Edges: P2 → P3 (parallel pass-through) */}
              <path className="ad-edge" d="M 440 90 L 500 85" markerEnd="url(#kyb-arrow)" />
              <path className="ad-edge" d="M 440 180 L 500 180" markerEnd="url(#kyb-arrow)" />
              <path className="ad-edge" d="M 440 270 L 500 275" markerEnd="url(#kyb-arrow)" />

              {/* Edges: P3 → P4 (fan-in) */}
              <path className="ad-edge-accent" d="M 700 85 C 720 85, 720 180, 740 180" markerEnd="url(#kyb-arrow-accent)" />
              <path className="ad-edge-accent" d="M 700 180 L 740 180" markerEnd="url(#kyb-arrow-accent)" />
              <path className="ad-edge-accent" d="M 700 275 C 720 275, 720 180, 740 180" markerEnd="url(#kyb-arrow-accent)" />

              {/* Risk-score legend (bottom-left) */}
              <g transform="translate(20, 325)">
                <text className="ad-label-mute" x="0" y="10">risk score:</text>
                <circle cx="80" cy="6" r="5" fill="#ef4444" />
                <text className="ad-label-mute" x="90" y="10">red</text>
                <circle cx="125" cy="6" r="5" fill="#eab308" />
                <text className="ad-label-mute" x="135" y="10">yellow</text>
                <circle cx="185" cy="6" r="5" fill="#4ade80" />
                <text className="ad-label-mute" x="195" y="10">green</text>
              </g>
            </svg>
          </ArchitectureDiagram>

          {/* Capabilities */}
          <h4 className="kyb-subheading">Key Capabilities</h4>
          <p className="kyb-body">
            Features <span className="hl-green">browser-use agents</span> for automated checkout
            verification, <span className="hl-blue">FAISS vector indexing</span> for MCC code
            classification, concurrent product scraping with semaphore control (50 parallel
            extractions), AUP compliance checking with image verification, and{" "}
            <span className="hl-purple">structured report generation</span> with sequential evidence
            indexing and Red/Yellow/Green risk scoring.
          </p>

          {/* Solution Impact */}
          <div className="callout-box">
            <div className="callout-label">Solution Impact</div>
            <p>
              Enables compliance teams to assess merchant brand risk at scale, replacing manual review
              workflows with automated, evidence-indexed risk reports. The 4-phase architecture supports
              concurrent processing of multiple merchant assessments with built-in fault tolerance and
              stakeholder-approved Red/Yellow/Green risk scoring.
            </p>
          </div>

          {/* Privacy callout */}
          <div className="callout-box">
            <div className="callout-label">Confidentiality Notice</div>
            <p>
              Due to privacy and data confidentiality concerns, this project cannot be publicly demonstrated.
              However, a detailed explanation including pipeline architecture, node design, and risk
              assessment methodology can be shared upon request.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KybPipeline;
