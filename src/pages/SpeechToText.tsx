/** @format */

import React from "react";
import "./SpeechToText.css";

const SpeechToText: React.FC = () => {
  return (
    <div className="stt-wrap">
      <div className="stt-title-row">
        <span className="stt-num">05</span>
        <h2 className="stt-title">
          <span className="hl-orange">Speech-to-Text</span> Application
        </h2>
      </div>

      <hr className="terminal-divider" />

      <div className="stt-layout">
        <div className="stt-left">
          <img
            src={`${process.env.PUBLIC_URL}/speech-to-text.webp`}
            alt="Speech-to-Text Application"
            className="stt-hero-img"
          />
          <div className="stt-actions">
            <a
              href="https://github.com/randyharrogates/speech"
              target="_blank"
              rel="noopener noreferrer"
              className="terminal-btn primary"
            >
              <span className="btn-prefix">$</span> view on github
            </a>
          </div>
        </div>

        <div className="stt-right">
          <div className="code-block">
            <span className="cmt"># tech stack</span>
            <br />
            <span className="key">backend</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Python · FastAPI"</span>
            <br />
            <span className="key">frontend</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"React"</span>
            <br />
            <span className="key">ai</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"OpenAI Whisper"</span>
            <br />
            <span className="key">database</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"SQLite"</span>
            <br />
            <span className="key">infra</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Docker (containerized)"</span>
          </div>

          <p className="stt-body">
            An audio transcription application powered by{" "}
            <span className="hl-green">OpenAI's Whisper model</span>. Users can upload audio files
            and receive accurate text transcriptions, supporting multiple languages and audio formats.
          </p>

          <h4 className="stt-subheading">Architecture</h4>
          <p className="stt-body">
            The backend is built with <span className="hl-blue">FastAPI</span> serving the Whisper
            model for inference, with <span className="hl-orange">SQLite</span> for storing
            transcription history. The <span className="hl-purple">React</span> frontend provides
            a clean interface for uploading audio and viewing transcription results.
          </p>

          <h4 className="stt-subheading">Containerized Deployment</h4>
          <p className="stt-body">
            The entire application is containerized with <span className="hl-green">Docker</span>,
            demonstrating end-to-end model serving patterns: API gateway, inference pipeline, result
            persistence, and containerized deployment with consistent behavior across development
            and production.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SpeechToText;
