/** @format */

import React, { useEffect, useState } from "react";
import "./AboutMe.css";

const FULL_NAME = "Randy Chan";

const AboutMe: React.FC = () => {
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [githubUrl, setGithubUrl] = useState<string>("https://github.com/randyharrogates");
  const [typed, setTyped] = useState<string>("");
  const [showCursor, setShowCursor] = useState(true);

  // Fetch GitHub profile
  useEffect(() => {
    fetch("https://api.github.com/users/randyharrogates")
      .then((r) => r.json())
      .then((data) => {
        setAvatarUrl(data.avatar_url || "");
        setGithubUrl(data.html_url || "https://github.com/randyharrogates");
      })
      .catch(() => {});
  }, []);

  // Typing animation for name
  useEffect(() => {
    let i = 0;
    const delay = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setTyped(FULL_NAME.slice(0, i));
        if (i >= FULL_NAME.length) clearInterval(interval);
      }, 75);
      return () => clearInterval(interval);
    }, 400);
    return () => clearTimeout(delay);
  }, []);

  // Blinking cursor
  useEffect(() => {
    const id = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="intro-wrap">
      {/* Prompt */}
      <div className="prompt-line">
        <span className="prompt-path">~/portfolio</span>
        <span className="prompt-sep"> $ </span>
        <span className="prompt-cmd">whoami</span>
      </div>

      <div className="intro-layout">
        {/* ── Left column ── */}
        <div className="intro-left">
          {/* Identity */}
          <div className="intro-identity">
            {avatarUrl && (
              <img src={avatarUrl} alt="Randy Chan" className="intro-avatar" />
            )}
            <div className="intro-identity-text">
              <h1 className="intro-name">
                <span className="intro-name-typed">{typed}</span>
                <span className={`intro-cursor${showCursor ? "" : " intro-cursor-hidden"}`}>_</span>
              </h1>
              <p className="intro-role">Senior AI Software Engineer · 6 YOE · NLP · LLM · RAG · AI Agents · Agentic Workflows</p>
            </div>
          </div>

          <hr className="terminal-divider" />

          {/* Bio */}
          <div className="intro-bio">
            <p>
              Senior AI Software Engineer with 6+ years of experience in backend architecture and
              productionizing <span className="hl-orange">Multi-Agent AI systems</span>. Expert in{" "}
              <span className="hl-orange">Agentic Orchestration</span> (LangGraph),{" "}
              <span className="hl-orange">Enterprise RAG</span>, and scaling{" "}
              <span className="hl-orange">Asynchronous Microservices</span>. Proven track record
              in developing autonomous financial research suites and high-stakes healthcare AI.
              Specialized in bridging LLM capabilities with robust engineering patterns
              (<span className="hl-orange">Azure</span>, <span className="hl-orange">K8s</span>,{" "}
              <span className="hl-orange">Terraform</span>) to deliver state-of-the-art automation.
            </p>
            <p className="intro-bio-cta">Take a look at some of my notable projects below.</p>
          </div>

          {/* Links */}
          <div className="intro-links">
            <a href="mailto:randychan_92@outlook.com" className="terminal-btn">
              <span className="btn-prefix">$</span> email
            </a>
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="terminal-btn">
              <span className="btn-prefix">$</span> github
            </a>
            <a href="https://www.linkedin.com/in/randychan112" target="_blank" rel="noopener noreferrer" className="terminal-btn primary">
              <span className="btn-prefix">$</span> linkedin
            </a>
          </div>

          {/* Nav hint */}
          <div className="nav-hint">
            <span className="nav-hint-main">Click the tabs above to explore →</span>
            <span className="nav-hint-sub">or use ← → arrow keys</span>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="intro-right">
          {/* Core stack */}
          <div className="callout-box">
            <div className="callout-label">Core Stack</div>
            <p>
              <span className="hl-green">Python</span> ·{" "}
              <span className="hl-blue">TypeScript</span> ·{" "}
              <span className="hl-orange">Java</span> ·{" "}
              <span className="hl-purple">JavaScript</span> ·{" "}
              <span className="hl-green">React</span> ·{" "}
              <span className="hl-blue">NextJS</span> ·{" "}
              <span className="hl-orange">FastAPI</span> ·{" "}
              <span className="hl-purple">LangGraph</span> ·{" "}
              <span className="hl-green">LangChain</span> ·{" "}
              <span className="hl-blue">PyTorch</span> ·{" "}
              <span className="hl-orange">Pydantic</span> ·{" "}
              <span className="hl-purple">AWS</span> ·{" "}
              <span className="hl-green">Azure</span> ·{" "}
              <span className="hl-blue">GCP</span> ·{" "}
              <span className="hl-orange">Docker</span> ·{" "}
              <span className="hl-purple">Kubernetes</span> ·{" "}
              <span className="hl-green">PostgreSQL</span> ·{" "}
              <span className="hl-blue">MongoDB</span> ·{" "}
              <span className="hl-orange">Redis</span> ·{" "}
              <span className="hl-purple">Azure Service Bus</span>
            </p>
          </div>

          {/* System info panel */}
          <div className="intro-sysinfo">
            <div className="sysinfo-row">
              <span className="sysinfo-cmd">$ uptime</span>
              <span className="sysinfo-val"><span className="hl-orange">6 yrs</span> · full-stack AI engineering</span>
            </div>
            <div className="sysinfo-divider" />
            <div className="sysinfo-row">
              <span className="sysinfo-cmd">$ whoami --location</span>
              <span className="sysinfo-val"><span className="hl-blue">Singapore</span></span>
            </div>
            <div className="sysinfo-divider" />
            <div className="sysinfo-row">
              <span className="sysinfo-cmd">$ cat status.txt</span>
              <span className="sysinfo-val"><span className="hl-green">● available for work</span></span>
            </div>
            <div className="sysinfo-divider" />
            <div className="sysinfo-row">
              <span className="sysinfo-cmd">$ cat interests.txt</span>
              <span className="sysinfo-val">
                <span className="hl-purple">Multi-Agent systems</span>
                <span className="sysinfo-sep"> · </span>
                <span className="hl-orange">RAG</span>
                <span className="sysinfo-sep"> · </span>
                <span className="hl-blue">agentic workflows</span>
              </span>
            </div>
            <div className="sysinfo-divider" />
            <div className="sysinfo-row">
              <span className="sysinfo-cmd">$ ls education/</span>
              <span className="sysinfo-val"><span className="hl-green">B.Sc Information and Communication Technology</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutMe;
