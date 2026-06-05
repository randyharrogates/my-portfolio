/** @format */

import React from "react";
import "./ResumeBuilder.css";

const ResumeBuilder: React.FC = () => {
  return (
    <div className="rb-wrap">
      <div className="rb-title-row">
        <span className="rb-num">12</span>
        <h2 className="rb-title">
          Resume Builder — <span className="hl-orange">AI-Powered</span> Career Tooling Suite
        </h2>
      </div>

      <hr className="terminal-divider" />

      {/* Tech stack */}
      <div className="code-block">
        <span className="cmt"># tech stack</span>
        <br />
        <span className="key">ai</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"Claude Sonnet · Anthropic API · prompt caching"</span>
        <br />
        <span className="key">backend</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"Python · FastAPI MCP server (auto-generated from OpenAPI spec)"</span>
        <br />
        <span className="key">skills</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"6 Anthropic Claude Code Skills authored"</span>
        <br />
        <span className="key">typesetting</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"LaTeX · Tectonic · ATS-safe PDF output"</span>
        <br />
        <span className="key">data</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"Markdown golden source · Ledger companion app (React)"</span>
      </div>

      {/* Overview */}
      <p className="rb-body">
        An open-source career tooling suite that turns a{" "}
        <span className="hl-green">Markdown golden source</span> (career history, roles, skills,
        education) into tailored, ATS-safe PDF resumes via a Claude-powered pipeline. The project
        doubles as a showcase of{" "}
        <span className="hl-orange">AI-assisted development advocacy</span>: the entire workflow,
        MCP server, and Claude Code skills were built with Claude Code, demonstrating what
        AI-assisted tooling looks like end-to-end rather than in isolated demos.
      </p>

      {/* MCP server section */}
      <h4 className="rb-subheading">Auto-Generated MCP Server from OpenAPI Spec</h4>
      <p className="rb-body">
        The FastAPI backend exposes a{" "}
        <span className="hl-blue">Model Context Protocol server</span> generated directly from
        the OpenAPI spec: each API endpoint becomes a typed MCP tool with schema derived from
        the Pydantic models. This means the tool surface stays in sync with the API automatically
        as the spec evolves, with no hand-maintained tool definitions. Claude Code connects to
        this MCP server and can drive the full resume generation pipeline from the CLI.
      </p>

      {/* Claude Code Skills section */}
      <h4 className="rb-subheading">6 Anthropic Claude Code Skills Authored</h4>
      <p className="rb-body">
        Six reusable{" "}
        <span className="hl-purple">Claude Code Skills</span> are bundled with the repo, covering:
        resume crafting (tailored resume generation from a job description),
        golden source building (career history ingestion and structuring),
        cover letter crafting, code review, PDF processing, and changelog generation. Each skill
        is a standalone agentic workflow callable from the Claude Code CLI, making the toolchain
        usable without any UI. The skill pack is the practical result of authoring AI-assisted
        workflows in production rather than in isolation.
      </p>

      {/* Ledger section */}
      <h4 className="rb-subheading">Ledger Companion App</h4>
      <p className="rb-body">
        A lightweight <span className="hl-green">React + FastAPI</span> companion app (Ledger)
        provides a GUI over the same golden source files the CLI uses, allowing career history to
        be reviewed and updated without touching the terminal. The Ledger and the CLI share the
        same data layer (gitignored Markdown files in{" "}
        <span className="hl-orange">career/</span>), so any edit in one is immediately visible in
        the other.
      </p>

      <div className="callout-box">
        <div className="callout-label">What This Demonstrates</div>
        <p>
          Most AI tooling demos show a single LLM call in isolation. This project shows a
          complete production workflow: a persistent career knowledge base, a typed MCP server
          that exposes it, a skill pack for agentic task execution, LaTeX typesetting with
          ATS-safe constraints, and a GUI companion for non-terminal use. It is the same architecture
          pattern as enterprise AI tooling, applied to a personal productivity problem.
        </p>
      </div>

      <div className="rb-actions">
        <a
          href="https://github.com/randyharrogates/resume_builder"
          target="_blank"
          rel="noopener noreferrer"
          className="terminal-btn primary"
        >
          <span className="btn-prefix">$</span> view on github
        </a>
      </div>
    </div>
  );
};

export default ResumeBuilder;
