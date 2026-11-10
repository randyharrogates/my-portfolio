import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
export default function ContactBand() {
  const email = useRef<HTMLElement>(null);
  const [note, setNote] = useState("Email is fastest.");
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email.current?.textContent || "");
      setNote("Copied. Email is fastest.");
    } catch {
      if (email.current) {
        const r = document.createRange();
        r.selectNodeContents(email.current);
        const s = window.getSelection();
        s?.removeAllRanges();
        s?.addRange(r);
      }
      setNote("Selected. Press ⌘C to copy.");
    }
  }
  return (
    <>
      <section className="contact">
        <div className="wrap">
          <div>
            <h2>Building something with agents? Let's talk.</h2>
            <div className="email">
              <code id="emailText" ref={email}>
                randychan_92@outlook.com
              </code>
              <button
                className="btn"
                id="copyBtn"
                onClick={copyEmail}
                type="button"
              >
                Copy email
              </button>
              <a
                className="btn"
                href="https://www.linkedin.com/in/randychan112"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn ↗
              </a>
            </div>
            <p
              className="note"
              style={{ marginTop: "var(--s3)" }}
              id="copyNote"
              aria-live="polite"
            >
              {note}
            </p>
          </div>
          <Link
            className="hall"
            to="/hall"
            aria-label="Explore the 3D Hall, the interactive version of this site"
          >
            <img
              src="site/hall.webp"
              alt=""
              loading="lazy"
              width="1600"
              height="1041"
            />
            <span>
              Explore the 3D Hall
              <small>the interactive version · opt-in, heavier</small>
            </span>
          </Link>
        </div>
      </section>
      <footer>
        <div className="wrap">
          <span>© 2026 Randy Chan · Singapore</span>
          <span>
            Built with Claude Code and Codex. Every claim here is on my CV.
          </span>
        </div>
      </footer>
    </>
  );
}
