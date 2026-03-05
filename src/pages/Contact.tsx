/** @format */

import React, { useState } from "react";
import "./Contact.css";

const Contact: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText("randychan_92@outlook.com").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="contact-wrap">
      <div className="prompt-line">
        <span className="prompt-path">~/portfolio</span>
        <span className="prompt-sep"> $ </span>
        <span className="prompt-cmd">contact --list</span>
      </div>

      <div className="contact-layout">
        {/* ── Left: contact list ── */}
        <div className="contact-left">
          <div className="contact-output">
            <div className="contact-line">
              <span className="contact-num">01</span>
              <span className="contact-label hl-orange">email</span>
              <span className="contact-sep">→</span>
              <div className="contact-value-row">
                <a href="mailto:randychan_92@outlook.com" className="contact-link">
                  randychan_92@outlook.com
                </a>
                <button className="copy-btn" onClick={copyEmail} title="Copy to clipboard">
                  {copied ? <span className="hl-green">✓ copied</span> : "copy"}
                </button>
              </div>
            </div>

            <div className="contact-divider" />

            <div className="contact-line">
              <span className="contact-num">02</span>
              <span className="contact-label hl-blue">github</span>
              <span className="contact-sep">→</span>
              <a
                href="https://github.com/randyharrogates"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link"
              >
                github.com/randyharrogates
              </a>
            </div>

            <div className="contact-divider" />

            <div className="contact-line">
              <span className="contact-num">03</span>
              <span className="contact-label hl-purple">linkedin</span>
              <span className="contact-sep">→</span>
              <a
                href="https://www.linkedin.com/in/randychan112"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link"
              >
                linkedin.com/in/randychan112
              </a>
            </div>
          </div>
        </div>

        {/* ── Right: availability + curl block ── */}
        <div className="contact-right">
          <div className="callout-box">
            <div className="callout-label">Currently</div>
            <p>
              Open to full-time roles and interesting collaborations in <span className="hl-orange">AI / ML engineering</span>,{" "}
              <span className="hl-blue">full-stack development</span>, and{" "}
              <span className="hl-green">LLM-powered systems</span>. Based in Singapore.
            </p>
          </div>

          <div className="code-block">
            <span className="cmt">$ curl -X POST https://randychan.dev/api/hire</span>
            <br />
            <span className="cmd">  --data</span>
            <span className="str"> '&#123;"message": "Let&apos;s work together!"&#125;'</span>
            <br />
            <span className="cmt"># → reach out via email or LinkedIn</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
