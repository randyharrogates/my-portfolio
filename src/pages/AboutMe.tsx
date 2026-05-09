/** @format */

import React, { Suspense, useEffect, useState } from "react";
import "./AboutMe.css";
import { portfolioData } from "../components/landing-3d/data.ts";
import { useTypingName } from "../components/landing-3d/useTypingName.ts";
import type { ChipColor, TechItem } from "../components/landing-3d/types.ts";

const Landing3D = React.lazy(() => import("../components/landing-3d/Landing3D.tsx"));

const CHIP_CLASS: Record<ChipColor, string> = {
  orange: "hl-orange",
  blue: "hl-blue",
  green: "hl-green",
  purple: "hl-purple",
};

const STATUS_LABEL: Record<string, string> = {
  available: "available for work",
  open: "open to opportunities",
  employed: "currently engaged",
};
const STATUS_CLASS: Record<string, string> = {
  available: "hl-green",
  open: "hl-orange",
  employed: "hl-blue",
};

const TechChip: React.FC<{ tech: TechItem; isLast: boolean }> = ({ tech, isLast }) => (
  <>
    <span className={CHIP_CLASS[tech.color]} data-tech-id={tech.id}>
      {tech.name}
    </span>
    {!isLast && " · "}
  </>
);

const AboutMe: React.FC = () => {
  const data = portfolioData;
  const { typed, showCursor } = useTypingName(data.identity.name);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [githubUrl, setGithubUrl] = useState<string>(data.socials.github);

  useEffect(() => {
    const username = data.socials.github.split("/").pop();
    if (!username) return;
    fetch(`https://api.github.com/users/${username}`)
      .then((r) => r.json())
      .then((profile) => {
        setAvatarUrl(profile.avatar_url || "");
        setGithubUrl(profile.html_url || data.socials.github);
      })
      .catch(() => {});
  }, [data.socials.github]);

  const status = data.identity.status;

  return (
    <div className="intro-wrap">
      {/* Prompt */}
      <div className="prompt-line">
        <span className="prompt-path">~/portfolio</span>
        <span className="prompt-sep"> $ </span>
        <span className="prompt-cmd">whoami</span>
      </div>

      {/* 3D centerpiece */}
      <div className="landing-3d-hero">
        <Suspense fallback={<div className="landing-3d-skeleton" aria-hidden="true" />}>
          <Landing3D typedName={typed} showCursor={showCursor} />
        </Suspense>
      </div>

      <div className="intro-layout">
        {/* ── Left column ── */}
        <div className="intro-left">
          {/* Identity */}
          <div className="intro-identity">
            {avatarUrl && (
              <img src={avatarUrl} alt={data.identity.name} className="intro-avatar" />
            )}
            <div className="intro-identity-text">
              <h1 className="intro-name">
                <span className="intro-name-typed">{typed}</span>
                <span
                  className={`intro-cursor${showCursor ? "" : " intro-cursor-hidden"}`}
                >
                  _
                </span>
              </h1>
              <div className="intro-badge">
                <span className="badge-prompt">&gt;</span> {data.identity.badge}
              </div>
              <p className="intro-belief">{data.identity.belief}</p>
              <p className="intro-role">
                {data.identity.role} · {data.identity.yoe} YOE ·{" "}
                {data.interests.join(" · ")}
              </p>
            </div>
          </div>

          <hr className="terminal-divider" />

          {/* Bio */}
          <div className="intro-bio">
            <p data-role-id="role-genai-se">
              {data.identity.role} with {data.identity.yoe}+ years of experience designing,
              deploying, and operating production AI systems across financial services and
              healthcare. Expert in{" "}
              <span className="hl-orange">Multi-Agent Orchestration</span> (LangGraph),{" "}
              <span className="hl-orange">Enterprise RAG</span>,{" "}
              <span className="hl-orange">Agentic Governance</span>, and{" "}
              <span className="hl-orange">Model Serving Optimization</span>. Proven ability
              to partner with customer stakeholders to convert AI ambition into scalable,
              production-ready systems — bridging deep technical depth (
              <span className="hl-orange">AWS</span>,{" "}
              <span className="hl-orange">Azure</span>,{" "}
              <span className="hl-orange">K8s</span>,{" "}
              <span className="hl-orange">Terraform</span>) with customer-facing
              communication. Passionate advocate for{" "}
              <span className="hl-orange">AI-assisted development</span> — leveraging{" "}
              {data.aiTools.map((t, i) => (
                <React.Fragment key={t}>
                  <span className="hl-orange">{t}</span>
                  {i < data.aiTools.length - 1 ? " and " : ""}
                </React.Fragment>
              ))}{" "}
              daily to architect enterprise-grade AI coding workflows that accelerate
              delivery and code quality.
            </p>
            <p className="intro-bio-cta">
              Explore my{" "}
              <a href="#/projects" className="hl-green">
                solution architectures and case studies
              </a>
              .
            </p>
          </div>

          {/* Links */}
          <div className="intro-links">
            <a href={`mailto:${data.socials.email}`} className="terminal-btn">
              <span className="btn-prefix">$</span> email
            </a>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="terminal-btn"
            >
              <span className="btn-prefix">$</span> github
            </a>
            <a
              href={data.socials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="terminal-btn primary"
            >
              <span className="btn-prefix">$</span> linkedin
            </a>
          </div>

          {/* Nav hint */}
          <div className="nav-hint">
            <span className="nav-hint-main">Click the tabs above to explore →</span>
            <span className="nav-hint-sub">or use ← → arrow keys</span>
          </div>

          <blockquote className="intro-quote">"{data.identity.quote}"</blockquote>
        </div>

        {/* ── Right column ── */}
        <div className="intro-right">
          {/* Core stack */}
          <div className="callout-box">
            <div className="callout-label">Core Stack</div>
            <p>
              {data.techStack.map((tech, idx) => (
                <TechChip
                  key={tech.id}
                  tech={tech}
                  isLast={idx === data.techStack.length - 1}
                />
              ))}
            </p>
          </div>

          {/* System info panel */}
          <div className="intro-sysinfo">
            <div className="sysinfo-row">
              <span className="sysinfo-cmd">$ uptime</span>
              <span className="sysinfo-val">
                <span className="hl-orange">{data.identity.yoe} yrs</span> · AI solution
                architecture & engineering
              </span>
            </div>
            <div className="sysinfo-divider" />
            <div className="sysinfo-row">
              <span className="sysinfo-cmd">$ whoami --location</span>
              <span className="sysinfo-val">
                <span className="hl-blue">{data.identity.location}</span>
              </span>
            </div>
            <div className="sysinfo-divider" />
            <div className="sysinfo-row">
              <span className="sysinfo-cmd">$ cat status.txt</span>
              <span className="sysinfo-val">
                <span className={STATUS_CLASS[status]}>● {STATUS_LABEL[status]}</span>
              </span>
            </div>
            <div className="sysinfo-divider" />
            <div className="sysinfo-row">
              <span className="sysinfo-cmd">$ cat interests.txt</span>
              <span className="sysinfo-val">
                {data.interests.map((i, idx) => (
                  <React.Fragment key={i}>
                    <span
                      className={
                        ["hl-purple", "hl-orange", "hl-blue"][idx % 3]
                      }
                    >
                      {i}
                    </span>
                    {idx < data.interests.length - 1 && (
                      <span className="sysinfo-sep"> · </span>
                    )}
                  </React.Fragment>
                ))}
              </span>
            </div>
            <div className="sysinfo-divider" />
            <div className="sysinfo-row">
              <span className="sysinfo-cmd">$ cat ai-tools.txt</span>
              <span className="sysinfo-val">
                {data.aiTools.map((t, idx) => (
                  <React.Fragment key={t}>
                    <span
                      className={
                        ["hl-purple", "hl-orange", "hl-blue"][idx % 3]
                      }
                    >
                      {t}
                    </span>
                    {idx < data.aiTools.length - 1 && (
                      <span className="sysinfo-sep"> · </span>
                    )}
                  </React.Fragment>
                ))}
              </span>
            </div>
            <div className="sysinfo-divider" />
            <div className="sysinfo-row">
              <span className="sysinfo-cmd">$ ls education/</span>
              <span className="sysinfo-val">
                {data.education.map((e, idx) => (
                  <React.Fragment key={e.id}>
                    <span className="hl-green">{e.degree}</span>
                    {idx < data.education.length - 1 && (
                      <span className="sysinfo-sep"> · </span>
                    )}
                  </React.Fragment>
                ))}
              </span>
            </div>
            <div className="sysinfo-divider" />
            <div className="sysinfo-row">
              <span className="sysinfo-cmd">$ cat certs/</span>
              <span className="sysinfo-val">
                {data.certifications.map((c, idx) => (
                  <React.Fragment key={c.id}>
                    <span
                      className={
                        ["hl-orange", "hl-blue", "hl-purple", "hl-green"][idx % 4]
                      }
                      data-cert-id={c.domId || c.id}
                    >
                      {c.full}
                    </span>
                    {idx < data.certifications.length - 1 && (
                      <span className="sysinfo-sep"> · </span>
                    )}
                  </React.Fragment>
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutMe;
