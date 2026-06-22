/** @format */

import React from "react";
import "./Jarvis.css";

const Jarvis: React.FC = () => {
  return (
    <div className="jarvis-wrap">
      <div className="jarvis-title-row">
        <span className="jarvis-num">14</span>
        <h2 className="jarvis-title">
          JARVIS — <span className="hl-orange">Personal AI Agent</span> &amp; Second Brain
        </h2>
      </div>

      <hr className="terminal-divider" />

      {/* Tech stack */}
      <div className="code-block">
        <span className="cmt"># tech stack</span>
        <br />
        <span className="key">runtime</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"One long-lived interactive Claude Code session · $0 on Claude Max"</span>
        <br />
        <span className="key">memory</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"Markdown vault (single source of truth) + SQLite insight engine"</span>
        <br />
        <span className="key">skills</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"Brief · health/nutrition · finance · résumé · commitments · decisions"</span>
        <br />
        <span className="key">channels</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"Telegram + on-device voice I/O (local STT/TTS, $0)"</span>
        <br />
        <span className="key">integrations</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"Gmail · Calendar · Drive (MCP, read) · Strava · Garmin"</span>
      </div>

      {/* Architecture visual */}
      <div className="jarvis-arch-block">
        <span className="cmt">$ jarvis status</span>
        <br />
        <span className="hl-green">✓</span> <span>morning brief · event heartbeat · weekly review (in-session cron)</span>
        <br />
        <span className="hl-green">✓</span> <span>vault: notes + domain diaries (health · meals · finance)</span>
        <br />
        <span className="hl-green">✓</span> <span>guardrails: no-trades · origin-conditional approvals · untrusted-input</span>
        <br />
        <span className="hl-green">✓</span> <span>voice: local STT/TTS, on-device ($0)</span>
        <br />
        <span className="hl-orange">i</span>{" "}
        <span style={{ color: "#5a5450" }}>Personal system — repo private</span>
      </div>

      {/* Overview */}
      <p className="jarvis-body">
        JARVIS is a <span className="hl-green">personal AI agent</span> that runs as a single
        always-on session — a second brain and advisor that captures and recalls knowledge, compiles
        a morning brief, tracks health, nutrition and finances, and prepares (
        <span className="hl-orange">never auto-sends</span>) actions, all under hard governance.
      </p>

      <h4 className="jarvis-subheading">Governance-First</h4>
      <p className="jarvis-body">
        Inviolable guardrails define what the agent may never do: it{" "}
        <span className="hl-orange">never places a financial trade</span>, gates every outbound or
        destructive action by <span className="hl-blue">where the instruction came from</span>{" "}
        (a channel or scheduled pass needs an approval relayed to the phone; the terminal runs
        native-auto over an inviolable floor), and treats all email, web and file content as{" "}
        <span className="hl-purple">untrusted data</span> — never as commands. Nothing irreversible
        happens unprompted.
      </p>

      <h4 className="jarvis-subheading">In-Session Autonomy</h4>
      <p className="jarvis-body">
        A morning brief, an hourly event heartbeat over Gmail and Calendar, content capture from git
        activity, and a weekly review all run on <span className="hl-blue">in-session schedules</span>{" "}
        — entirely on the Claude Max subscription, with no metered API and no separate backend to
        operate.
      </p>

      <h4 className="jarvis-subheading">Local-First &amp; $0</h4>
      <p className="jarvis-body">
        On-device speech (faster-whisper + Kokoro TTS), local embeddings for semantic recall, and a
        pure-stdlib insight engine (lagged metric correlations, training-load, weight-trend
        forecasting) keep the marginal cost at zero — private data never leaves the machine.
      </p>

      <div className="callout-box">
        <div className="callout-label">Why It Is Interesting</div>
        <p>
          A production-grade <span className="hl-green">personal</span> agent with the safety
          discipline of an enterprise system: turn-origin-conditional approvals relayed to a phone,
          an auditable markdown vault as the single source of truth, and zero marginal cost on a
          flat subscription.
        </p>
      </div>

      <div className="jarvis-actions">
        <a href="mailto:randychan_92@outlook.com" className="terminal-btn primary">
          <span className="btn-prefix">$</span> request more information
        </a>
      </div>
    </div>
  );
};

export default Jarvis;
