/** @format */

import React from "react";
import { useNavigate } from "react-router-dom";
import "./FineTuning.css";

const FineTuning: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="ft-wrap">
      <div className="prompt-line">
        <span className="prompt-path">~/portfolio/projects</span>
        <span className="prompt-sep"> $ </span>
        <span className="prompt-cmd">cat fine-tuning.md</span>
      </div>

      {/* Title row — full width */}
      <div className="ft-title-row">
        <span className="ft-num">03</span>
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
            <button className="terminal-btn" onClick={() => navigate("/projects")}>
              <span className="btn-prefix">←</span> back to projects
            </button>
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
            This project involved fine-tuning a BERT-based model, specifically designed for medical data,
            to perform <span className="hl-green">Named Entity Recognition (NER)</span>. The task focused on
            identifying medical entities such as{" "}
            <span className="hl-orange">diseases</span>,{" "}
            <span className="hl-orange">treatments</span>, and{" "}
            <span className="hl-orange">medications</span> within clinical notes. The fine-tuning process
            was carried out using <span className="hl-blue">FastAPI</span> as the backend and deployed
            within a <span className="hl-purple">Kedro pipeline</span>.
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
