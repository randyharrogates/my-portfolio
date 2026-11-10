import React from "react";
export default function ResumePage() {
  return (
    <div data-page="resume">
      <section className="page enter">
        <div className="wrap">
          <div className="cv-head">
            <div>
              <h1>Résumé</h1>
              <p className="note" style={{ marginTop: "var(--s2)" }}>
                Updated 10 Nov 2026 · two pages · generated from my career notes
              </p>
            </div>
            <a
              className="btn primary"
              href="Resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open the PDF ↗
            </a>
          </div>
          <div className="cv">
            <div className="sheet">
              <img
                src="site/cv-1.webp"
                alt="Résumé page 1 of 2"
                loading="lazy"
                width="1241"
                height="1754"
              />
            </div>
            <div className="sheet">
              <img
                src="site/cv-2.webp"
                alt="Résumé page 2 of 2"
                loading="lazy"
                width="1241"
                height="1754"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
