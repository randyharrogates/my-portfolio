/** @format */

import React from "react";
import "./KybPipeline.css";

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
