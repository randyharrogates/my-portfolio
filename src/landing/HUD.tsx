/** @format */

import React from "react";
import { Link } from "react-router-dom";
import type { FidelityMode } from "./use-low-power.ts";

interface HUDProps {
  mode: FidelityMode;
  effectiveLow: boolean;
  onCycleMode: () => void;
  audioMuted: boolean;
  onToggleAudio: () => void;
  bootSkippable?: boolean;
  onSkipBoot?: () => void;
}

const TAG_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 16,
  left: 18,
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 11,
  color: "#8a8178",
  letterSpacing: 0.4,
  pointerEvents: "none",
  zIndex: 2,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  maxWidth: "55vw",
};

const RIGHT_STACK: React.CSSProperties = {
  position: "absolute",
  top: 14,
  right: 16,
  zIndex: 2,
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "flex-end",
  maxWidth: "calc(100vw - 24px)",
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 11,
};

const BTN: React.CSSProperties = {
  background: "rgba(20, 17, 15, 0.78)",
  border: "1px solid #3a3532",
  color: "#c8bfb5",
  padding: "5px 10px",
  borderRadius: 4,
  fontFamily: "inherit",
  fontSize: 11,
  letterSpacing: 0.3,
  cursor: "pointer",
  textDecoration: "none",
  backdropFilter: "blur(4px)",
};

const HINT_STYLE: React.CSSProperties = {
  position: "absolute",
  bottom: 18,
  left: 0,
  right: 0,
  textAlign: "center",
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 11,
  color: "#5a5450",
  letterSpacing: 0.5,
  pointerEvents: "none",
  zIndex: 2,
};

const SKIP_STYLE: React.CSSProperties = {
  ...BTN,
  position: "absolute",
  bottom: 18,
  right: 16,
  zIndex: 3,
};

const HUD: React.FC<HUDProps> = ({
  mode,
  effectiveLow,
  onCycleMode,
  audioMuted,
  onToggleAudio,
  bootSkippable,
  onSkipBoot,
}) => {
  const fidelityLabel =
    mode === "auto" ? (effectiveLow ? "auto·low" : "auto·full") : mode;
  return (
    <>
      <div style={TAG_STYLE}>
        <span>
          <span style={{ color: "#e8632a" }}>●</span> randy chan · workstation
        </span>
        <span style={{ color: "#5a5450" }}>genai solutions engineer</span>
      </div>

      <div style={RIGHT_STACK}>
        <button
          type="button"
          style={BTN}
          onClick={onCycleMode}
          aria-label="cycle fidelity mode"
          title="cycle fidelity (auto/low/full)"
        >
          fx: {fidelityLabel}
        </button>
        <button
          type="button"
          style={BTN}
          onClick={onToggleAudio}
          aria-label={audioMuted ? "unmute audio" : "mute audio"}
          title={audioMuted ? "audio muted" : "audio on"}
        >
          {audioMuted ? "♪ muted" : "♪ on"}
        </button>
        <Link to="/about" style={BTN} title="switch to terminal view">
          terminal →
        </Link>
      </div>

      <div style={HINT_STYLE}>
        click any monitor to enter · <span style={{ color: "#e8632a" }}>esc</span> returns
      </div>

      {bootSkippable && onSkipBoot && (
        <button type="button" style={SKIP_STYLE} onClick={onSkipBoot}>
          skip intro →
        </button>
      )}
    </>
  );
};

export default HUD;
