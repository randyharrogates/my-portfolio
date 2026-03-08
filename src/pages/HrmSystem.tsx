/** @format */

import React from "react";
import "./HrmSystem.css";

const HrmSystem: React.FC = () => {
  return (
    <div className="hrm-wrap">
      <div className="hrm-title-row">
        <span className="hrm-num">08</span>
        <h2 className="hrm-title">
          <span className="hl-orange">HR Management</span> System
        </h2>
      </div>

      <hr className="terminal-divider" />

      <div className="hrm-layout">
        <div className="hrm-left">
          <img
            src={`${process.env.PUBLIC_URL}/hrm.webp`}
            alt="HR Management System"
            className="hrm-hero-img"
          />
          <div className="hrm-actions">
            <a
              href="https://github.com/randyharrogates/hrm"
              target="_blank"
              rel="noopener noreferrer"
              className="terminal-btn primary"
            >
              <span className="btn-prefix">$</span> view on github
            </a>
          </div>
        </div>

        <div className="hrm-right">
          <div className="code-block">
            <span className="cmt"># tech stack</span>
            <br />
            <span className="key">frontend</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"React · TypeScript"</span>
            <br />
            <span className="key">backend</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Express · NodeJS"</span>
            <br />
            <span className="key">database</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"MongoDB"</span>
            <br />
            <span className="key">infra</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Docker (containerized)"</span>
          </div>

          <p className="hrm-body">
            A full-stack <span className="hl-green">HR Management System</span> for handling
            employee records and HR workflows. Built with{" "}
            <span className="hl-orange">React</span> and <span className="hl-blue">Express</span>,
            backed by <span className="hl-purple">MongoDB</span> for flexible document storage.
          </p>

          <h4 className="hrm-subheading">Features</h4>
          <p className="hrm-body">
            The system supports <span className="hl-green">employee record management</span> with
            CRUD operations, Excel import/export functionality for bulk data handling, and a
            responsive dashboard for HR administrators. The application is fully containerized
            with <span className="hl-blue">Docker</span> for easy deployment.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HrmSystem;
