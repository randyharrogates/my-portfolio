/** @format */

import React from "react";
import "./Verona.css";

const Verona: React.FC = () => {
  return (
    <div className="verona-wrap">
      {/* Title row — full width */}
      <div className="verona-title-row">
        <span className="verona-num">13</span>
        <h2 className="verona-title">
          Verona — <span className="hl-orange">Wedding Super-App</span>
        </h2>
      </div>

      <hr className="terminal-divider" />

      {/* Two-column body */}
      <div className="verona-layout">
        {/* ── Left: image + actions ── */}
        <div className="verona-left">
          <img
            src={`${process.env.PUBLIC_URL}/verona.png`}
            alt="Verona — Singapore-first wedding super-app"
            className="verona-hero-img"
          />

          <div className="verona-actions">
            <a
              href="https://verona.leeseidon.com"
              target="_blank"
              rel="noopener noreferrer"
              className="terminal-btn primary"
            >
              <span className="btn-prefix">$</span> live demo
            </a>
          </div>
        </div>

        {/* ── Right: text content ── */}
        <div className="verona-right">
          {/* Tech stack */}
          <div className="code-block">
            <span className="cmt"># tech stack</span>
            <br />
            <span className="key">frontend</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Next.js PWA · React · TypeScript · Tailwind · mobile-first"</span>
            <br />
            <span className="key">backend</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Cloudflare Workers (OpenNext) · Supabase · R2"</span>
            <br />
            <span className="key">agent</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"BYOC via OpenAPI parity — couple or agent, one surface"</span>
            <br />
            <span className="key">i18n</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"EN · 中文 · Bahasa Melayu — Singapore-first"</span>
            <br />
            <span className="key">infra</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Free-tier-only · Web Push · Realtime · CI auto-deploy"</span>
          </div>

          {/* Overview */}
          <p className="verona-body">
            Verona is a mobile-first <span className="hl-green">PWA</span> that carries a couple
            through the <span className="hl-orange">entire wedding journey</span> — the planning, the
            day itself, and the memories after. It is Singapore-first by design: trilingual,
            halal/dietary-aware, PayNow and hongbao native, and built around the local ROM, tea
            ceremony, and banquet flow.
          </p>

          {/* Pillar 1 */}
          <h4 className="verona-subheading">Planner</h4>
          <p className="verona-body">
            The couple back-office — a <span className="hl-blue">GST-aware budget</span> with banquet
            &quot;++&quot; maths in integer cents, a <span className="hl-blue">vendor CRM</span> with
            due-dated payments that roll up into the budget, a drag-and-drop{" "}
            <span className="hl-blue">seating chart</span>, and an auto-generated Singapore-milestone
            timeline.
          </p>

          {/* Pillar 2 */}
          <h4 className="verona-subheading">Invite &amp; RSVP</h4>
          <p className="verona-body">
            Per-household <span className="hl-purple">bilingual invites</span> (story, schedule, maps,
            gallery) with per-person-per-event RSVP capturing meal, dietary, halal and plus-ones; a
            live guest list, shareable QR invite links, and a one-click caterer CSV.
          </p>

          {/* Pillar 3 */}
          <h4 className="verona-subheading">Wedding-Day Live Layer</h4>
          <p className="verona-body">
            A live <span className="hl-green">photo wall and guestbook</span> guests fill via a
            table QR, an approve-first moderation queue, polls, find-my-seat, and a live{" "}
            <span className="hl-green">projector + guest wall</span> on realtime (degrading to
            polling).
          </p>

          {/* Pillar 4 */}
          <h4 className="verona-subheading">Memories</h4>
          <p className="verona-body">
            A shared post-wedding gallery so the day lives on after the last guest leaves.
          </p>

          {/* Architecture callout */}
          <div className="callout-box">
            <div className="callout-label">Architecture</div>
            <p>
              Verona is multi-tenant and <span className="hl-orange">agent-ready by
              construction</span>: every couple action is mirrored by an OpenAPI-parity endpoint a
              bring-your-own-Claude agent can drive, so the human UI and the agent share one
              contract. The whole stack runs on never-charged free tiers — a hard rule, not a
              best-effort.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Verona;
