import React from "react";
import { Link } from "react-router-dom";
import { LOOP, CAREER } from "./data.ts";
import { jump } from "./shared.tsx";
import { SOFTWARE_YEARS, WORKING_YEARS } from "./years.ts";
export default function AboutPage() {
  return (
    <div data-page="about">
      <section className="page enter">
        <div className="wrap">
          <div className="about-top">
            <figure>
              <img
                src="site/randy.webp"
                alt="Portrait of Randy Chan"
                loading="lazy"
              />
            </figure>
            <div className="prose">
              <h1>About</h1>
              <p>
                <strong>I'm an AI software engineer in Singapore.</strong> I
                build AI-native products, AI-driven workflows and multi-agent
                systems, and I build them with coding agents. I care about the
                parts that make AI trustworthy in production: citations, judges,
                approvals and audit trails.
              </p>
              <p>
                Before software I spent seven years as a regular in the
                Singapore Army, leading and training teams. Since 2019 I have
                built platforms for small businesses, logistics systems, a
                nation-wide public healthcare application at NCS, clinical NLP
                at AI Singapore, and AI products in fintech. I now lead
                technology and AI at The Assembly Place.
              </p>
              <p>
                <strong>Under the agents is machine learning I have trained and
                shipped.</strong> At AI Singapore I fine-tuned BioClinicalBERT
                in PyTorch for named-entity recognition on clinical notes,
                compared it against other BERT baselines, and fed the extracted
                entities into a classifier that predicts clinical interventions,
                with Explainable Boosting Machines so clinicians can see why each
                prediction was made. Every model was evaluated on held-out data
                (precision, recall, F1) and tracked in MLflow. At TrustPlus I
                cleaned and explored customer data, trained PyTorch
                image-classification models that run in production, and served
                fine-tuned models on Amazon SageMaker.
              </p>
              <div className="subnav">
                <button
                  className="chip"
                  type="button"
                  onClick={() => jump("sec-how")}
                >
                  How I work
                </button>
                <button
                  className="chip"
                  type="button"
                  onClick={() => jump("sec-career")}
                >
                  Career
                </button>
                <button
                  className="chip"
                  type="button"
                  onClick={() => jump("sec-writing")}
                >
                  Writing
                </button>
              </div>
            </div>
          </div>

          <section className="asec" id="sec-how">
            <div className="asec-head">
              <h2>How I work</h2>
              <p>
                AI-native from the first commit: coding agents do most of the
                typing; I do the planning, the reviewing and the owning.
              </p>
            </div>
            <div className="loop" id="loop">
              <div className="pulse" aria-hidden="true">
                <i />
              </div>
              {LOOP.map((x) => (
                <div className="step" key={x[1]}>
                  <span className="who">{x[0]}</span>
                  <h3>{x[1]}</h3>
                  <p>{x[2]}</p>
                </div>
              ))}
            </div>
            <div className="principles">
              <div>
                <h3>Plan before code</h3>
                <p>
                  Claude reads the codebase and writes a plan with concrete
                  steps before any agent touches a file. The plan is what I
                  review first.
                </p>
              </div>
              <div>
                <h3>Loops until green</h3>
                <p>
                  Codex implements in its own git worktree and keeps going until
                  the tests and checks pass. Reviewer agents send gaps back.
                </p>
              </div>
              <div>
                <h3>People own the merge</h3>
                <p>
                  Nothing ships without me reading the diff. Shared standards,
                  skills and hooks steer every agent the same way.
                </p>
              </div>
            </div>
            <div className="bigstat">
              <b>~4 → ~20</b>
              <span>
                releases a month after I moved a team onto this way of working.
              </span>
            </div>
          </section>

          <section className="asec" id="sec-career">
            <div className="asec-head">
              <h2>Career</h2>
              <p>
                {SOFTWARE_YEARS}+ years in software, {WORKING_YEARS} years working in
                total.
              </p>
            </div>
            <div className="two">
              <div className="rows" id="careerRows">
                {CAREER.map((c) => (
                  <div className="row" key={c[1]}>
                    <span className="yr">{c[0]}</span>
                    <span>
                      <b>{c[1]}</b> · {c[2]}
                      <span className="sub">{c[3]}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div>
                <h3>Education and certifications</h3>
                <div className="rows">
                  <div className="row">
                    <span className="yr">B.Sc.</span>
                    <span>
                      <b>Singapore University of Social Sciences</b>
                      <span className="sub">
                        ICT, Minor in Data Science · GPA 4.2/5
                      </span>
                    </span>
                  </div>
                  <div className="row">
                    <span className="yr">Cert</span>
                    <span>
                      <b>Certified Associate AI Engineer</b>
                      <span className="sub">AI Professionals Singapore</span>
                    </span>
                  </div>
                  <div className="row">
                    <span className="yr">Cert</span>
                    <span>
                      <b>ECBA</b>
                      <span className="sub">IIBA, business analysis</span>
                    </span>
                  </div>
                  <div className="row">
                    <span className="yr">Speaks</span>
                    <span>
                      <b>English · Mandarin</b>
                      <span className="sub">Mandarin conversational</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="asec" id="sec-writing">
            <div className="asec-head">
              <h2>Writing</h2>
              <p>Notes from running agents in production.</p>
            </div>
            <div className="rows">
              <Link className="post" to="/blog">
                <span className="mono">19 May 2026</span>
                <span>
                  <b>LLM-as-a-judge in the hot path</b>
                  <span>
                    Production lessons, and when a schema is the better judge.
                  </span>
                </span>
                <span className="arrow">↗</span>
              </Link>
              <Link className="post" to="/blog">
                <span className="mono">14 Apr 2026</span>
                <span>
                  <b>Building an MCP server for a production app</b>
                  <span>
                    Acting-user sign-in, token refresh, and a small tool list.
                  </span>
                </span>
                <span className="arrow">↗</span>
              </Link>
              <Link className="post" to="/blog">
                <span className="mono">12 Mar 2026</span>
                <span>
                  <b>Multi-agent orchestration patterns in production</b>
                  <span>
                    Routers, specialists, judges, and where each breaks.
                  </span>
                </span>
                <span className="arrow">↗</span>
              </Link>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
