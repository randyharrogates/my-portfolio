import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ARCHIVE, CAREER, P, TAP, THEMES } from "./data.ts";
import Thumb from "./Thumb.tsx";
import { Pill, Tags } from "./shared.tsx";
export default function WorkPage() {
  const [params, setParams] = useSearchParams();
  const theme = THEMES.some((t) => t.id === params.get("theme"))
    ? params.get("theme") || ""
    : "";
  const chips = [{ id: "", name: "All" }, ...THEMES];
  return (
    <div data-page="work">
      <section className="page enter">
        <div className="wrap">
          <div className="work-head">
            <h1>Projects</h1>
            <p id="workIntro">
              Every project I'd put my name to, grouped by what it shows. Each
              one opens a full case study.
            </p>
          </div>
          <div
            className="filters"
            role="group"
            aria-label="Filter by theme"
            id="filters"
          >
            {chips.map((t) => (
              <button
                className="chip"
                type="button"
                key={t.id}
                aria-pressed={theme === t.id}
                onClick={() => setParams(t.id ? { theme: t.id } : {})}
              >
                {t.name}
                <span className="n">
                  {t.id ? P.filter((p) => p.theme === t.id).length : P.length}
                </span>
              </button>
            ))}
          </div>
          <div id="themes">
            {THEMES.filter((t) => !theme || t.id === theme).map((t) => {
              const projects = P.filter((p) => p.theme === t.id);
              return (
                <section className="theme" key={t.id}>
                  <div className="theme-head">
                    <h2>{t.name}</h2>
                    <p>
                      {t.blurb}{" "}
                      <span className="mono">
                        {projects.length}
                        {projects.length === 1 ? " project" : " projects"}
                      </span>
                    </p>
                  </div>
                  {projects.map((p) => (
                    <Link className="prow" key={p.id} to={"/work/" + p.id}>
                      <Thumb project={p} />
                      <div>
                        <h3>{p.title}</h3>
                        <p className="one">{p.card}</p>
                        <Tags tags={p.tags.slice(0, 4)} />
                      </div>
                      <div className="meta">
                        <span>{p.org}</span>
                        <span>{p.year}</span>
                        <Pill>{p.status}</Pill>
                        <span className="arrow">Case study →</span>
                      </div>
                    </Link>
                  ))}
                  {t.id === "workflows" && (
                    <div className="prow">
                      <div className="thumb text">
                        <span>
                          {TAP.thumb[0]}
                          <br />
                          {TAP.thumb[1]}
                        </span>
                      </div>
                      <div>
                        <h3>{TAP.title}</h3>
                        <p className="one">{CAREER[0][3]}</p>
                      </div>
                      <div className="meta">
                        <span>{TAP.org}</span>
                        <span>{TAP.year}</span>
                        <Pill>{TAP.status}</Pill>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
            {!theme && (
              <section className="theme archive">
                <div className="theme-head">
                  <h2>Earlier builds</h2>
                  <p>Before AI was the product.</p>
                </div>
                {ARCHIVE.map((x) => (
                  <div className="arow" key={x[0]}>
                    <span>{x[0]}</span>
                    <span>
                      <b>{x[1]}</b>
                      {x[2]}
                    </span>
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
