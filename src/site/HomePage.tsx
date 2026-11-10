import React from "react";
import { Link } from "react-router-dom";
import { PILLARS } from "./data.ts";
import { destination } from "./shared.tsx";
import { SOFTWARE_YEARS, WORKING_YEARS } from "./years.ts";
export default function HomePage() {
  return (
    <div data-page="home">
      <section className="hero">
        <div className="wrap">
          <div>
            <span className="status">
              <span className="dot"></span>Open to AI and full-stack roles ·
              Singapore
            </span>
            <h1>
              AI software engineer building <em>AI-native</em> products and
              multi-agent systems.
            </h1>
            <p className="lede">
              I design AI-driven workflows end to end, from the first workshop
              to production and on-call, and I build them with coding agents
              every day. Now Head of Technology and AI at The Assembly Place.
            </p>
            <div className="cta">
              <Link className="btn primary" to="/work">
                See all projects
              </Link>
              <Link className="btn" to="/resume">
                Résumé
              </Link>
              <a
                className="btn"
                href="https://github.com/randyharrogates"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub ↗
              </a>
            </div>
          </div>
          <div className="portrait">
            <figure>
              <img src="site/randy.webp" alt="Portrait of Randy Chan" />
            </figure>
            <div className="facts">
              <div className="fact">
                <b>{SOFTWARE_YEARS}+ years</b>in software, since 2019
              </div>
              <div className="fact">
                <b>{WORKING_YEARS} years</b>total working experience
              </div>
              <div className="fact wide">
                <b>Claude Code + Codex</b>in parallel, every day
              </div>
            </div>
          </div>
        </div>
        <div className="wrap">
          <div className="pillars" id="pillars">
            {PILLARS.map((x) => (
              <Link className="pillar" key={x[0]} to={destination(x[3])}>
                <span className="mono">{x[0]}</span>
                <h3>{x[1]}</h3>
                <p>{x[2]}</p>
                <span className="go">{x[4]}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <div className="strip">
        <div className="wrap">
          <span className="eyebrow">Worked at</span>
          <span>The Assembly Place</span>
          <span>TrustPlus AI</span>
          <span>BGC Group</span>
          <span>AI Singapore</span>
          <span>NCS</span>
          <span>Bitopia Technology</span>
          <span>Napshot</span>
          <span>Singapore Army</span>
        </div>
      </div>
    </div>
  );
}
