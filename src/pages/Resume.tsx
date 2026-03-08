/** @format */

import React from "react";
import "./Resume.css";

const Resume: React.FC = () => {
  const pdfUrl = process.env.PUBLIC_URL + "/Resume.pdf";

  return (
    <div className="resume-wrap">
      <div className="prompt-line">
        <span className="prompt-path">~/portfolio</span>
        <span className="prompt-sep"> $ </span>
        <span className="prompt-cmd">cat resume.pdf</span>
      </div>

      <div className="resume-actions">
        <a href={pdfUrl} download="Randy_Chan_Resume.pdf" className="terminal-btn">
          <i className="bi bi-download" /> Download Resume
        </a>
      </div>

      <iframe
        className="resume-viewer"
        src={pdfUrl}
        title="Resume"
      />
    </div>
  );
};

export default Resume;
