import React, { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ORDER, P, Project, THEMES } from "./data.ts";
import Visual from "./Visual.tsx";
import { jump, Pill, Tags } from "./shared.tsx";
function Cover({ project: p }: { project: Project }) {
  const [failed, setFailed] = useState(false);
  if (p.shots)
    return (
      <figure className={"cover shots" + (p.phones ? " phones" : "")}>
        {p.shots.map((s) => (
          <img
            key={s}
            src={s}
            alt={"Screenshot of " + p.title.split(",")[0]}
            loading="lazy"
          />
        ))}
      </figure>
    );
  return p.img && !failed ? (
    <figure className="cover">
      <img
        src={p.img}
        alt={"Screenshot of " + p.title.split(",")[0]}
        loading="lazy"
        onError={() => setFailed(true)}
      />
      <figcaption>Screenshot</figcaption>
    </figure>
  ) : null;
}
export default function CasePage() {
  const { id } = useParams();
  const p = P.find((p) => p.id === id);
  if (!p) return <Navigate to="/work" replace />;
  const t = THEMES.find((t) => t.id === p.theme)!;
  const i = ORDER.indexOf(p),
    prev = ORDER[(i - 1 + ORDER.length) % ORDER.length],
    next = ORDER[(i + 1) % ORDER.length];
  const sections = [
    ["overview", "Overview"],
    ["role", "My role"],
    ["problem", "The problem"],
    ["how", "How it works"],
    ["built", "What I built"],
    ["decisions", "Key decisions"],
    ["stack", "Stack and links"],
  ];
  return (
    <div data-page="case">
      <section className="page enter">
        <div className="wrap" id="caseRoot">
          <div className="case-top">
            <div>
              <span className="eyebrow">{t.name}</span>
              <h1>{p.title}</h1>
              <p className="lede">{p.lede}</p>
              <div className="case-meta">
                <Pill>{p.status}</Pill>
                <span className="pill">{p.org}</span>
                <span className="pill">{p.year}</span>
              </div>
            </div>
            <div className="stagebox" id="caseVis">
              <Visual project={p} />
            </div>
          </div>
          <Cover key={p.id} project={p} />
          <div className="glance" id="c-overview">
            {p.results.map((x) => (
              <div key={x[1]}>
                <b>{x[0]}</b>
                <span>{x[1]}</span>
              </div>
            ))}
          </div>
          <div className="case-body">
            <nav className="toc" aria-label="On this page">
              {sections.map((s) => (
                <button
                  key={s[0]}
                  type="button"
                  onClick={() => jump("c-" + s[0])}
                >
                  {s[1]}
                </button>
              ))}
            </nav>
            <div className="blocks">
              <div className="block" id="c-role">
                <h2>My role</h2>
                <div className="role">
                  <p>{p.role}</p>
                </div>
              </div>
              <div className="block" id="c-problem">
                <h2>The problem</h2>
                <p>{p.problem}</p>
              </div>
              <div className="block" id="c-how">
                <h2>How it works</h2>
                <div className="flow">
                  {p.flow.map((f, k) => (
                    <React.Fragment key={f[0]}>
                      {k > 0 && (
                        <span className="farrow" aria-hidden="true">
                          →
                        </span>
                      )}
                      <div className="fstep">
                        <span className="k">
                          {String(k + 1).padStart(2, "0")}
                        </span>
                        <b>{f[0]}</b>
                        <span>{f[1]}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div className="block" id="c-built">
                <h2>What I built</h2>
                <ul>
                  {p.system.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div className="block" id="c-decisions">
                <h2>Key decisions</h2>
                <div className="decisions">
                  {p.decisions.map((x) => (
                    <div className="decision" key={x}>
                      {x}
                    </div>
                  ))}
                </div>
              </div>
              <div className="block" id="c-stack">
                <h2>Stack and links</h2>
                <Tags tags={p.tags} />
                {p.links.length ? (
                  <div className="links-row" style={{ marginTop: "var(--s4)" }}>
                    {p.links.map((l) => (
                      <a
                        key={l[1]}
                        href={l[1]}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {l[0]} ↗
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="note" style={{ marginTop: "var(--s3)" }}>
                    {p.status === "Employer"
                      ? "Employer work: described at résumé level, no code or internals."
                      : "Private repository."}
                  </p>
                )}
              </div>
            </div>
          </div>
          <nav className="case-nav" aria-label="More projects">
            <Link to={"/work/" + prev.id}>
              <span>← Previous</span>
              <b>{prev.title.split(",")[0]}</b>
            </Link>
            <Link to={"/work/" + next.id}>
              <span>Next →</span>
              <b>{next.title.split(",")[0]}</b>
            </Link>
          </nav>
        </div>
      </section>
    </div>
  );
}
