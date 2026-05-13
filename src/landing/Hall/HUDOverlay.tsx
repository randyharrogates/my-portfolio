/** @format */

import React from "react";
import { HALL_THEMES } from "../sections.ts";
import type { HallTargetId } from "../sections.ts";
import "./HUDOverlay.css";

type HallPhase = "intro" | "entering" | "interactive";

interface HUDOverlayProps {
  active: HallTargetId;
  hoveredId: HallTargetId | null;
  lowFidelity: boolean;
  audioMuted: boolean;
  fps: number;
  phase: HallPhase;
  onToggleMap: () => void;
  onToggleAudio: () => void;
  onToggleFidelity: () => void;
  onReturnToWorkstation: () => void;
  onJumpToTerminal: () => void;
  onEnterDoor: () => void;
}

const HUDOverlay: React.FC<HUDOverlayProps> = ({
  active,
  hoveredId,
  lowFidelity,
  audioMuted,
  fps,
  phase,
  onToggleMap,
  onToggleAudio,
  onToggleFidelity,
  onReturnToWorkstation,
  onJumpToTerminal,
  onEnterDoor,
}) => {
  const labelTarget = hoveredId ?? active;
  const isHub = labelTarget === "hub";
  const theme = isHub ? null : HALL_THEMES[labelTarget];
  const isIntro = phase !== "interactive";

  return (
    <div className="hall-hud" aria-hidden={false}>
      {/* Top-left: phase chip */}
      <div className="hall-hud__chip" role="status">
        <span className="hall-hud__dot" />
        {isIntro
          ? "the hall · entrance · click the door"
          : "the hall · archipelago · hub island"}
      </div>

      {/* Top-right: utility controls (suppressed during intro to keep the
       *  arrival uncluttered, but the skip-to-terminal escape hatch stays). */}
      <div className="hall-hud__utilities">
        {!isIntro && (
          <>
            <button
              type="button"
              className="hall-hud__btn"
              onClick={onToggleMap}
              aria-label="open map (M)"
            >
              map · M
            </button>
            <button
              type="button"
              className="hall-hud__btn"
              onClick={onToggleAudio}
              aria-label={audioMuted ? "unmute audio" : "mute audio"}
            >
              {audioMuted ? "audio · off" : "audio · on"}
            </button>
            <button
              type="button"
              className="hall-hud__btn"
              onClick={onToggleFidelity}
              aria-label="toggle visual fidelity"
            >
              {lowFidelity ? "fidelity · low" : "fidelity · high"}
            </button>
          </>
        )}
        <button
          type="button"
          className="hall-hud__btn hall-hud__btn--accent"
          onClick={onJumpToTerminal}
          aria-label="skip to terminal version"
        >
          skip to terminal →
        </button>
      </div>

      {/* Lower-third label — hidden during intro so the door scene reads clean. */}
      {!isIntro && (
        <div className="hall-hud__label">
          <span className="hall-hud__label-eyebrow">
            {isHub ? "hub" : "island"}
          </span>
          <span
            className="hall-hud__label-title"
            style={
              theme
                ? ({ "--accent": theme.accent } as React.CSSProperties)
                : undefined
            }
          >
            {isHub ? "hub island" : theme?.title ?? ""}
          </span>
          <span className="hall-hud__label-subtitle">
            {isHub ? "orbital view · drag to rotate" : theme?.subtitle ?? ""}
          </span>
        </div>
      )}

      {/* Bottom-right: footer + diagnostic */}
      <div className="hall-hud__footer">
        <button
          type="button"
          className="hall-hud__back"
          onClick={onReturnToWorkstation}
        >
          ← back to workstation
        </button>
        <span className="hall-hud__fps">
          {fps > 0 ? `${fps} fps` : "—"}
        </span>
      </div>

      {/* Bottom-left: keymap hint — replaced with door-entry prompt in intro. */}
      {!isIntro && (
        <div className="hall-hud__keys">
          <span>0 hub</span>
          <span>·</span>
          <span>M map</span>
          <span>·</span>
          <span>drag to rotate</span>
          <span>·</span>
          <span>Esc back</span>
        </div>
      )}

      {/* Visually hidden but focusable affordance for screen readers and
       *  keyboard-only users during the intro phase. */}
      {phase === "intro" && (
        <button
          type="button"
          className="hall-hud__sr-enter"
          onClick={onEnterDoor}
        >
          Enter the Hall
        </button>
      )}
    </div>
  );
};

export default HUDOverlay;
