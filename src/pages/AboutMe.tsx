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
              <div className="intro-badge"><span className="badge-prompt">&gt;</span> Claude Code Enthusiast</div>
              <p className="intro-belief">I believe AI is the future of software development.</p>
              <p className="intro-role">GenAI Solutions Engineer · 7 YOE · Multi-Agent Orchestration · Enterprise RAG · Agentic Governance</p>
            </div>
          </div>

          <hr className="terminal-divider" />

          {/* Bio */}
          <div className="intro-bio">
            <p>
              GenAI Solutions Engineer with 7+ years of experience designing, deploying, and
              operating production AI systems across financial services and healthcare. Expert in{" "}
              <span className="hl-orange">Multi-Agent Orchestration</span> (LangGraph),{" "}
              <span className="hl-orange">Enterprise RAG</span>,{" "}
              <span className="hl-orange">Agentic Governance</span>, and{" "}
              <span className="hl-orange">Model Serving Optimization</span>. Proven ability to
              partner with customer stakeholders to convert AI ambition into scalable, production-ready
              systems — bridging deep technical depth
              (<span className="hl-orange">AWS</span>, <span className="hl-orange">Azure</span>,{" "}
              <span className="hl-orange">K8s</span>, <span className="hl-orange">Terraform</span>)
              with customer-facing communication. Passionate advocate for{" "}
              <span className="hl-orange">AI-assisted development</span> — leveraging{" "}
              <span className="hl-orange">Claude Code</span> and{" "}
              <span className="hl-orange">Cursor</span> daily to architect enterprise-grade
              AI coding workflows that accelerate delivery and code quality.
            </p>
            <p className="intro-bio-cta">Explore my solution architectures and case studies below.</p>
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

          <blockquote className="intro-quote">
            "Jack of all trades, master of none, but often times better than a master of one."
          </blockquote>
        </div>

        {/* ── Right column ── */}
        <div className="intro-right">
          {/* Core stack */}
          <div className="callout-box">
            <div className="callout-label">Core Stack</div>
            <p>
              <span className="hl-purple">LangGraph</span> ·{" "}
              <span className="hl-green">LangChain</span> ·{" "}
              <span className="hl-orange">OpenAI API</span> ·{" "}
              <span className="hl-blue">Anthropic API</span> ·{" "}
              <span className="hl-purple">PyTorch</span> ·{" "}
              <span className="hl-green">Python</span> ·{" "}
              <span className="hl-orange">FastAPI</span> ·{" "}
              <span className="hl-blue">AWS</span> ·{" "}
              <span className="hl-purple">Azure</span> ·{" "}
              <span className="hl-green">Docker</span> ·{" "}
              <span className="hl-orange">Kubernetes</span> ·{" "}
              <span className="hl-blue">Terraform</span> ·{" "}
              <span className="hl-purple">MongoDB</span> ·{" "}
              <span className="hl-green">PostgreSQL</span> ·{" "}
              <span className="hl-orange">Pinecone</span> ·{" "}
              <span className="hl-blue">Weaviate</span> ·{" "}
              <span className="hl-purple">Redis</span> ·{" "}
              <span className="hl-green">Azure Service Bus</span> ·{" "}
              <span className="hl-orange">TypeScript</span> ·{" "}
              <span className="hl-blue">React</span>
            </p>
          </div>

          {/* System info panel */}
          <div className="intro-sysinfo">
            <div className="sysinfo-row">
              <span className="sysinfo-cmd">$ uptime</span>
              <span className="sysinfo-val"><span className="hl-orange">7 yrs</span> · AI solution architecture & engineering</span>
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
                <span className="hl-purple">Multi-Agent orchestration</span>
                <span className="sysinfo-sep"> · </span>
                <span className="hl-orange">Agentic governance</span>
                <span className="sysinfo-sep"> · </span>
                <span className="hl-blue">Enterprise RAG</span>
              </span>
            </div>
            <div className="sysinfo-divider" />
            <div className="sysinfo-row">
              <span className="sysinfo-cmd">$ cat ai-tools.txt</span>
              <span className="sysinfo-val">
                <span className="hl-purple">Claude Code</span>
                <span className="sysinfo-sep"> · </span>
                <span className="hl-orange">Cursor</span>
                <span className="sysinfo-sep"> · </span>
                <span className="hl-blue">AI-assisted workflows</span>
              </span>
            </div>
            <div className="sysinfo-divider" />
            <div className="sysinfo-row">
              <span className="sysinfo-cmd">$ ls education/</span>
              <span className="sysinfo-val"><span className="hl-green">B.Sc Information and Communication Technology</span></span>
            </div>
            <div className="sysinfo-divider" />
            <div className="sysinfo-row">
              <span className="sysinfo-cmd">$ cat certs/</span>
              <span className="sysinfo-val">
                <span className="hl-orange">CAIE (AIP)</span>
                <span className="sysinfo-sep"> · </span>
                <span className="hl-blue">ECBA (IIBA)</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutMe;
