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
          <p className="intro-role">Full-Stack AI Engineer · 4 YOE · NLP · LLM</p>
        </div>
      </div>

      <hr className="terminal-divider" />

      {/* Bio */}
      <div className="intro-bio">
        <p>
          Proficient in <span className="hl-orange">Python</span>, <span className="hl-orange">Java</span>,{" "}
          <span className="hl-orange">Javascript</span> and <span className="hl-orange">Typescript</span>.
          Focused on tackling industry challenges with cutting-edge, state-of-the-art solutions.
          I excel at researching innovative approaches to solve new project challenges. I thrive in
          open, collaborative environments that foster knowledge sharing and continuous growth.
        </p>
        <p className="intro-bio-cta">Take a look at some of my notable projects below.</p>
      </div>

      {/* Callout */}
      <div className="callout-box">
        <div className="callout-label">Core Stack</div>
        <p>
          <span className="hl-green">Python</span> ·{" "}
          <span className="hl-blue">TypeScript</span> ·{" "}
          <span className="hl-orange">React</span> ·{" "}
          <span className="hl-purple">FastAPI</span> ·{" "}
          <span className="hl-green">LangGraph</span> ·{" "}
          <span className="hl-blue">PyTorch</span> ·{" "}
          <span className="hl-orange">AWS</span> ·{" "}
          <span className="hl-purple">Docker</span> ·{" "}
          <span className="hl-green">PostgreSQL</span>
        </p>
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
  );
};

export default AboutMe;
