/** @format */

import React from "react";
import { Link } from "react-router-dom";

interface HUDProps {
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

/** Skip link — visually hidden until focused (Tab from URL bar). Provides a
 *  fast escape hatch to the terminal route for users who don't want the
 *  3D experience. */
const SKIP_LINK_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  padding: "8px 12px",
  background: "#0c0b0a",
  color: "#e8632a",
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 12,
  letterSpacing: 0.4,
  textDecoration: "none",
  border: "1px solid #e8632a",
  zIndex: 100,
  // Move offscreen unless focused.
  transform: "translateY(-150%)",
  transition: "transform 120ms ease-out",
};

const HUD: React.FC<HUDProps> = ({
  audioMuted,
  onToggleAudio,
  bootSkippable,
  onSkipBoot,
}) => {
  return (
    <>
      <a
        href="#/about"
        style={SKIP_LINK_STYLE}
        onFocus={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.transform = "translateY(-150%)";
        }}
      >
        skip to terminal view →
      </a>

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
          onClick={onToggleAudio}
          aria-label={audioMuted ? "unmute audio" : "mute audio"}
          title={audioMuted ? "audio muted" : "audio on"}
        >
          {audioMuted ? "♪ muted" : "♪ on"}
        </button>
        <Link to="/hall" style={BTN} title="enter the hall of zero limits">
          hall →
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
