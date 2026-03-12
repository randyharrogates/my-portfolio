/** @format */

import React from "react";
import "./FineTuning.css";

const FineTuning: React.FC = () => {
  return (
    <div className="ft-wrap">
      {/* Title row — full width */}
      <div className="ft-title-row">
        <span className="ft-num">04</span>
        <h2 className="ft-title">
          Fine-Tuning of a <span className="hl-orange">BERT-based Model</span> for NER on Medical Data
        </h2>
      </div>

      <hr className="terminal-divider" />

      {/* Two-column body */}
      <div className="ft-layout">
        {/* ── Left: image + actions ── */}
        <div className="ft-left">
          <img
            src={`${process.env.PUBLIC_URL}/fine-tuning.png`}
            alt="Fine-Tuning Project"
            className="ft-hero-img"
          />

          <div className="ft-actions">
            <a href="mailto:randychan_92@outlook.com" className="terminal-btn primary">
              <span className="btn-prefix">$</span> request more information
            </a>
          </div>
        </div>

        {/* ── Right: text content ── */}
        <div className="ft-right">
          {/* Tech stack */}
          <div className="code-block">
            <span className="cmt"># tech stack</span>
            <br />
            <span className="key">model</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"BERT (HuggingFace)"</span>
            <br />
            <span className="key">backend</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"FastAPI + Kedro Pipeline"</span>
            <br />
            <span className="key">task</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Named Entity Recognition (NER)"</span>
            <br />
            <span className="key">infra</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Docker (containerized)"</span>
          </div>

          {/* Overview */}
          <p className="ft-body">
            Designed and deployed a domain-specific <span className="hl-green">NER pipeline</span> for
            healthcare, fine-tuning a BERT-based model on clinical data to extract medical entities —{" "}
            <span className="hl-orange">diseases</span>,{" "}
            <span className="hl-orange">treatments</span>, and{" "}
            <span className="hl-orange">medications</span> — from unstructured clinical notes. The
            inference pipeline is served via <span className="hl-blue">FastAPI</span> and orchestrated
            through a <span className="hl-purple">Kedro pipeline</span> for reproducible model training
            and evaluation workflows.
          </p>

          {/* RAG section */}
          <h4 className="ft-subheading">Enhanced with Retrieval-Augmented Generation (RAG)</h4>
          <p className="ft-body">
            In addition to fine-tuning the BERT-based model, we employed{" "}
            <span className="hl-orange">Retrieval-Augmented Generation (RAG)</span> to improve the model's
            performance in identifying and understanding more complex medical terms. RAG, when combined with
            LLMs, allows the system to leverage external knowledge sources (such as clinical literature)
            during the inference process. This combination has significantly enhanced the accuracy and
            efficiency of NER within medical texts.
          </p>

          {/* Solution Impact */}
          <div className="callout-box">
            <div className="callout-label">Solution Impact</div>
            <p>
              Delivered production-grade medical NER accuracy by combining fine-tuned BERT with RAG-enhanced
              entity disambiguation, enabling clinical decision support workflows. The Kedro pipeline ensures
              reproducible training runs and model versioning for regulatory audit trails.
            </p>
          </div>

          {/* Privacy callout */}
          <div className="callout-box">
            <div className="callout-label">Confidentiality Notice</div>
            <p>
              Due to privacy and data confidentiality concerns, this project cannot be publicly demonstrated.
              However, a detailed explanation including methodology, challenges encountered, and results
              obtained can be shared upon request.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FineTuning;
