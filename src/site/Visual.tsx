import React from "react";
import { Project } from "./data.ts";
const visuals: Record<string, React.ReactElement> = {
  "vis-memo": (
    <div
      className="browser ui"
      role="img"
      aria-label="Recreated credit memo screen with cited sections and a judge check"
    >
      <div className="bar">
        <i></i>
        <i></i>
        <i></i>
        <span className="url">
          app · credit memo · Acme Trading Pte Ltd (sample)
        </span>
      </div>
      <div className="memo">
        <aside>
          <div className="on">
            Executive summary <span className="cite">✓</span>
          </div>
          <div>
            Financial analysis <span className="cite">✓</span>
          </div>
          <div>
            Industry outlook <span className="cite">✓</span>
          </div>
          <div>
            KYB checks <span className="cite">✓</span>
          </div>
          <div>
            Risk rating <span className="cite">review</span>
          </div>
        </aside>
        <main>
          <h4>Executive summary</h4>
          <p>
            Revenue grew 18% year on year to S$4.2m{" "}
            <span className="cite">[FS 2025 p.3]</span>, while the current ratio
            fell to 1.1 <span className="cite">[FS 2025 p.7]</span>. Directors
            match the registry record <span className="cite">[KYB]</span>.
          </p>
          <div className="check">
            ✓ Judge model: every figure traced to a source
          </div>
          <div className="approval">
            HIGH-RISK DECISION · needs analyst approval
            <div className="act">
              <span>Approve</span>
              <span>Send back</span>
            </div>
          </div>
          <p className="note">
            Sample company and figures. Recreated screen, no client data.
          </p>
        </main>
      </div>
    </div>
  ),
  "vis-jarvis": (
    <div className="phone">
      <div
        className="screen ui"
        role="img"
        aria-label="Recreated chat with Jarvis showing a morning brief and an approval request"
      >
        <div className="chat-head">
          <span className="av">J</span>
          <span>
            Jarvis
            <br />
            <small>long-running agent · online</small>
          </span>
        </div>
        <div className="thread">
          <div className="msg">
            <span className="who">
              Jarvis <small>08:45</small>
            </span>
            <div className="card-mini">
              Morning brief: 3 meetings, 2 replies owed, run club at 19:00. Air
              quality is fine to run.
            </div>
          </div>
          <div className="msg">
            <span className="who">
              Randy <small>09:02</small>
            </span>
            <div className="voice" aria-hidden="true">
              <i style={{ height: "8px" }}></i>
              <i style={{ height: "16px" }}></i>
              <i style={{ height: "22px" }}></i>
              <i style={{ height: "12px" }}></i>
              <i style={{ height: "18px" }}></i>
              <i style={{ height: "9px" }}></i>
              <i style={{ height: "20px" }}></i>
              <i style={{ height: "14px" }}></i>
              <i style={{ height: "7px" }}></i>
              <span className="mono" style={{ marginLeft: "8px" }}>
                0:06 voice note
              </span>
            </div>
          </div>
          <div className="msg">
            <span className="who">
              Jarvis <small>09:02</small>
            </span>
            <div className="approval">
              APPROVAL · send reply to recruiter
              <div className="act">
                <span>yes a1f3</span>
                <span>no</span>
              </div>
            </div>
          </div>
          <div className="msg">
            <span className="who">
              Jarvis <small>23:30</small>
            </span>
            <div className="card-mini">
              Filed 6 facts from today into your notes.
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
  "vis-kestrel": (
    <div
      className="browser ui"
      role="img"
      aria-label="Recreated Kestrel screen showing extracted fields with confidence and citations"
    >
      <div className="bar">
        <i></i>
        <i></i>
        <i></i>
        <span className="url">kestrel · policy review (sample)</span>
      </div>
      <div
        style={{
          padding: "var(--s4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s3)",
        }}
      >
        <div className="bars">
          <div className="fieldrow">
            <span>
              Sum assured · S$500,000 <span className="cite">p.2</span>
            </span>
            <span className="meter">
              <i style={{ width: "96%" }}></i>
            </span>
            <span className="pct">0.96</span>
          </div>
          <div className="fieldrow">
            <span>
              Premium term · 20 years <span className="cite">p.3</span>
            </span>
            <span className="meter">
              <i style={{ width: "91%" }}></i>
            </span>
            <span className="pct">0.91</span>
          </div>
          <div className="fieldrow">
            <span>
              Riders · critical illness <span className="cite">p.5</span>
            </span>
            <span className="meter">
              <i style={{ width: "74%" }}></i>
            </span>
            <span className="pct">0.74</span>
          </div>
        </div>
        <div className="approval">
          ADVISER CONFIRMATION REQUIRED · 1 field below 0.80
          <div className="act">
            <span>Confirm</span>
            <span>Edit</span>
          </div>
        </div>
      </div>
    </div>
  ),
  "vis-nlp": (
    <div
      className="browser ui"
      role="img"
      aria-label="Recreated clinical NLP view with highlighted entities"
    >
      <div className="bar">
        <i></i>
        <i></i>
        <i></i>
        <span className="url">clinical notes · entity view (sample)</span>
      </div>
      <div
        style={{
          padding: "var(--s4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s3)",
        }}
      >
        <p style={{ fontSize: "14px", lineHeight: "1.9" }}>
          Patient with{" "}
          <span className="ent cond">
            type 2 diabetes<small>COND</small>
          </span>{" "}
          started on{" "}
          <span className="ent drug">
            metformin<small>DRUG</small>
          </span>{" "}
          <span className="ent dose">
            500 mg twice daily<small>DOSE</small>
          </span>
          ; review in two weeks.
        </p>
        <div className="check">
          → intervention predicted · explained by contributing entities
        </div>
        <p className="note">Invented sample sentence. No patient data.</p>
      </div>
    </div>
  ),
  "vis-leeseidon": (
    <div className="browser">
      <div className="bar">
        <i></i>
        <i></i>
        <i></i>
        <span className="url">leeseidon.com</span>
      </div>
      <img
        src="site/leeseidon.webp"
        alt="Leeseidon sign-in screen"
        loading="lazy"
        width="1280"
        height="800"
      />
    </div>
  ),
  "vis-twc": (
    <div className="browser">
      <div className="bar">
        <i></i>
        <i></i>
        <i></i>
        <span className="url">randyharrogates.github.io/twc</span>
      </div>
      <img
        src="site/twc.webp"
        alt="TWC landing page: split, settle, done"
        loading="lazy"
        width="1280"
        height="800"
      />
    </div>
  ),
  "vis-verona": (
    <div className="browser">
      <div className="bar">
        <i></i>
        <i></i>
        <i></i>
        <span className="url">verona.leeseidon.com</span>
      </div>
      <img
        src="site/verona.webp"
        alt="Verona wedding planner landing page"
        loading="lazy"
        width="1280"
        height="900"
      />
    </div>
  ),
};
export default function Visual({ project: p }: { project: Project }) {
  if (!p.term) return visuals[p.vis || ""] || null;
  return (
    <div
      className="browser ui"
      role="img"
      aria-label={"Sample run of " + p.title}
    >
      <div className="bar">
        <i />
        <i />
        <i />
        <span className="url">{p.url}</span>
      </div>
      <div className="term">
        {p.term.map((x, i) =>
          x === null ? (
            <br key={i} />
          ) : Array.isArray(x) ? (
            <span key={i} className={x[0] || undefined}>
              {x[1]}
            </span>
          ) : (
            <React.Fragment key={i}>{x}</React.Fragment>
          ),
        )}
      </div>
    </div>
  );
}
