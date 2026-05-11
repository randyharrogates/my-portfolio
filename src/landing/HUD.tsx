/** @format */

import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useIsMobileViewport, type FidelityMode } from "./use-low-power.ts";

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

/** Base button style. `backdrop-filter: blur()` is a per-frame full-screen
 *  composite pass and is brutal on mobile GPUs; we strip it on phones and
 *  compensate with a more opaque background so the text stays readable. */
const BTN_BASE: React.CSSProperties = {
  border: "1px solid #3a3532",
  color: "#c8bfb5",
  padding: "5px 10px",
  borderRadius: 4,
  fontFamily: "inherit",
  fontSize: 11,
  letterSpacing: 0.3,
  cursor: "pointer",
  textDecoration: "none",
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

const SKIP_POSITION: React.CSSProperties = {
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
  mode,
  effectiveLow,
  onCycleMode,
  audioMuted,
  onToggleAudio,
  bootSkippable,
  onSkipBoot,
}) => {
  const isMobile = useIsMobileViewport();
  const BTN = useMemo<React.CSSProperties>(
    () => ({
      ...BTN_BASE,
      background: isMobile ? "rgba(20, 17, 15, 0.88)" : "rgba(20, 17, 15, 0.78)",
      backdropFilter: isMobile ? undefined : "blur(4px)",
    }),
    [isMobile]
  );
  const SKIP_STYLE = useMemo<React.CSSProperties>(
    () => ({ ...BTN, ...SKIP_POSITION }),
    [BTN]
  );
  const fidelityLabel =
    mode === "auto" ? (effectiveLow ? "auto·low" : "auto·full") : mode;
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
