/** @format */

import React, { Suspense, lazy } from "react";
import "./Resume.css";

const ResumeMobileViewer = lazy(() => import("./ResumeMobileViewer.tsx"));

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

      <div className="resume-desktop">
        <iframe
          className="resume-viewer"
          src={pdfUrl}
          title="Resume"
        />
      </div>

      <div className="resume-mobile">
        <Suspense fallback={<div className="resume-mobile-loading">$ loading resume.pdf…</div>}>
          <ResumeMobileViewer pdfUrl={pdfUrl} />
        </Suspense>
      </div>
    </div>
  );
};

export default Resume;
