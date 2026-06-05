/** @format */

import React from "react";
import "./Leeseidon.css";

const Leeseidon: React.FC = () => {
  return (
    <div className="lee-wrap">
      {/* Title row — full width */}
      <div className="lee-title-row">
        <span className="lee-num">02</span>
        <h2 className="lee-title">
          Leeseidon — <span className="hl-orange">Agentic</span> Investment Intelligence
        </h2>
      </div>

      <hr className="terminal-divider" />

      {/* Two-column body */}
      <div className="lee-layout">
        {/* ── Left: image + actions ── */}
        <div className="lee-left">
          <img
            src={`${process.env.PUBLIC_URL}/leeseidon.webp`}
            alt="Leeseidon — Agentic Investment Intelligence"
            className="lee-hero-img"
          />

          <div className="lee-actions">
            <a
              href="https://leeseidon.com"
              target="_blank"
              rel="noopener noreferrer"
              className="terminal-btn primary"
            >
              <span className="btn-prefix">$</span> open the app
            </a>
          </div>
        </div>

        {/* ── Right: text content ── */}
        <div className="lee-right">
          {/* Tech stack */}
          <div className="code-block">
            <span className="cmt"># tech stack</span>
            <br />
            <span className="key">frontend</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"React 19 · TypeScript · Vite · Tailwind 4"</span>
            <br />
            <span className="key">ai</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Claude · GPT-4 · local models — pluggable"</span>
            <br />
            <span className="key">agents</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Multi-turn ingestion · Zod tools · streaming"</span>
            <br />
            <span className="key">crypto</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"E2E AES-GCM · PBKDF2 600k · Web Workers"</span>
            <br />
            <span className="key">infra</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Cloudflare Pages + Worker (D1)"</span>
          </div>

          {/* Overview */}
          <p className="lee-body">
            Leeseidon is a <span className="hl-green">privacy-first investment tracker</span> that
            delivers institutional-grade analytics — time-weighted and money-weighted return, CAGR,
            Sharpe ratio, allocation breakdowns — across global stocks, ETFs, and crypto. Data syncs
            across devices through a <span className="hl-orange">fully encryption-blind server</span>:
            the backend stores only ciphertext and the vault passphrase never leaves the device.
          </p>

          {/* Agentic ingestion */}
          <h4 className="lee-subheading">Agentic Data Ingestion</h4>
          <p className="lee-body">
            The hardest part of any portfolio tool is data entry. Leeseidon solves it with{" "}
            <span className="hl-orange">multi-turn Claude agents</span> that extract trades and
            expenses from <span className="hl-green">CSV, PDF, images, and natural language</span>.
            A model-agnostic tool executor dispatches schematized tools —{" "}
            <span className="hl-blue">lookup_fx_rate</span>,{" "}
            <span className="hl-blue">validate_ticker</span>,{" "}
            <span className="hl-blue">check_duplicate</span>,{" "}
            <span className="hl-blue">submit_drafts</span> — with streaming, retry, and rate-limit
            handling. AI-assisted imports flow through the <span className="hl-purple">same core
            engines</span> as manual entry, so an agent-parsed broker statement produces
            byte-identical output to a hand-typed one.
          </p>

          {/* Capabilities */}
          <h4 className="lee-subheading">Key Capabilities</h4>
          <p className="lee-body">
            A pluggable LLM layer abstracts <span className="hl-orange">AnthropicClient</span>{" "}
            (with optional extended thinking), <span className="hl-orange">OpenAIClient</span>, and a
            self-hosted <span className="hl-orange">LocalClient</span> behind one agent loop. An{" "}
            <span className="hl-blue">isomorphic TypeScript core</span> (@leeseidon/core, storage,
            cli) powers both the browser app and a terminal CLI with bundled Claude Code skills, so
            the portfolio can be driven by agents from the command line as well. Heavy compute —{" "}
            <span className="hl-purple">Monte Carlo retirement simulation</span> and jurisdictional
            tax engines — runs in Web Workers off the main thread.
          </p>

          {/* Cloudflare callout */}
          <div className="callout-box">
            <div className="callout-label">Why Cloudflare Workers + D1</div>
            <p>
              Leeseidon's backend runs on{" "}
              <span className="hl-orange">Cloudflare Workers</span> with{" "}
              <span className="hl-blue">D1</span> (SQLite at the edge) rather than a traditional
              server. The rationale: a privacy-first app that stores only ciphertext has no need
              for server-side compute near the data, but it does need globally low-latency sync
              for cross-device reads. Workers deploy to 300+ edge locations automatically, D1
              replicates reads globally with no ops overhead, and the zero-cold-start model means
              sync responses arrive in under 50ms for most users regardless of geography. The
              whole backend runs at Cloudflare's free tier for personal use.
            </p>
          </div>

          {/* Solution Impact */}
          <div className="callout-box">
            <div className="callout-label">Solution Impact</div>
            <p>
              Leeseidon shows end-to-end AI integration: agentic ingestion turns unstructured broker
              statements into clean, validated transactions, while a two-secret end-to-end
              encryption model keeps a leaked password exposing only ciphertext. It connects
              user-facing AI agents, careful structured-tool design, and domain-specific financial
              compute into a single coherent product.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leeseidon;
