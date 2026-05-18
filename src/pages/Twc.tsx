/** @format */

import React from "react";
import "./Twc.css";

const Twc: React.FC = () => {
  return (
    <div className="twc-wrap">
      {/* Title row — full width */}
      <div className="twc-title-row">
        <span className="twc-num">01</span>
        <h2 className="twc-title">
          TWC — <span className="hl-orange">Multimodal AI</span> Expense Assistant
        </h2>
      </div>

      <hr className="terminal-divider" />

      {/* Two-column body */}
      <div className="twc-layout">
        {/* ── Left: image + actions ── */}
        <div className="twc-left">
          <img
            src={`${process.env.PUBLIC_URL}/twc.webp`}
            alt="TWC — Multimodal AI Expense Assistant"
            className="twc-hero-img"
          />

          <div className="twc-actions">
            <a
              href="https://randyharrogates.github.io/twc/"
              target="_blank"
              rel="noopener noreferrer"
              className="terminal-btn primary"
            >
              <span className="btn-prefix">$</span> live demo
            </a>
            <a
              href="https://github.com/randyharrogates/twc"
              target="_blank"
              rel="noopener noreferrer"
              className="terminal-btn"
            >
              <span className="btn-prefix">$</span> view on github
            </a>
          </div>
        </div>

        {/* ── Right: text content ── */}
        <div className="twc-right">
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
            <span className="str">"Claude · GPT-5 · Ollama — multi-provider"</span>
            <br />
            <span className="key">agent</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Tool-use loop · Zod/JSON-Schema · Vision"</span>
            <br />
            <span className="key">state</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Zustand · localStorage · AES-GCM key vault"</span>
            <br />
            <span className="key">infra</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Zero-backend static SPA · GitHub Pages"</span>
          </div>

          {/* Overview */}
          <p className="twc-body">
            TWC is a <span className="hl-green">browser-only group expense splitter</span> whose
            centerpiece is a <span className="hl-orange">multimodal AI assistant</span>: drop in a
            receipt photo or a free-form note and the agent reads it, resolves ambiguous member
            names and foreign-exchange rates, and drafts itemized expenses for one-tap approval.
            The entire app — including the agentic LLM layer — ships as a static bundle with no
            server, no database, and no backend to operate.
          </p>

          {/* Architecture */}
          <h4 className="twc-subheading">Agentic Architecture</h4>
          <p className="twc-body">
            A provider-agnostic <span className="hl-blue">AgentClient</span> abstraction unifies
            Anthropic, OpenAI&apos;s <span className="hl-orange">GPT-5 reasoning family</span>, and
            any OpenAI-compatible local server (Ollama, LM Studio, vLLM) behind one interface. The
            core is a <span className="hl-purple">32-iteration agentic loop</span> with streaming
            phase labels (<span className="hl-green">resolving name…</span>,{" "}
            <span className="hl-green">looking up FX rate…</span>), tool dispatch with permission
            gating, and conversation pruning at a 60% context budget. Every provider client is a
            hand-written <span className="hl-blue">fetch</span> call rather than a vendor SDK,
            keeping the supply chain small and fully auditable.
          </p>

          {/* Capabilities */}
          <h4 className="twc-subheading">Key Capabilities</h4>
          <p className="twc-body">
            The assistant performs <span className="hl-green">multimodal receipt vision</span>{" "}
            (base64 data-URL encoding with magic-byte MIME validation) and emits{" "}
            <span className="hl-blue">structured outputs</span> via Zod schemas compiled to strict
            JSON-Schema. Five idempotent tools — <span className="hl-orange">add_member</span>,{" "}
            <span className="hl-orange">resolve_name</span>,{" "}
            <span className="hl-orange">resolve_payer</span>,{" "}
            <span className="hl-orange">lookup_fx_rate</span>, and{" "}
            <span className="hl-orange">submit_drafts</span> — are dispatched through the loop. A{" "}
            <span className="hl-purple">plan mode</span> physically omits mutating tools from the
            schema rather than relying on prompt hints, while all money is held in integer minor
            units with largest-remainder split distribution to guarantee balances reconcile to zero.
          </p>

          {/* Solution Impact */}
          <div className="callout-box">
            <div className="callout-label">Solution Impact</div>
            <p>
              TWC demonstrates shipping a production-safe LLM agent entirely in the browser: a
              bring-your-own-key trust model with a PBKDF2-SHA256 (600k) + AES-GCM-256 passphrase
              vault, token-bucket rate limiting, per-day and per-month spend caps, and request
              preflight that rejects oversized images without burning quota — agentic UX with the
              guardrails of a real product.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Twc;
