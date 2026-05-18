/** @format */

import React from "react";
import { HALL_THEMES } from "../sections.ts";
import type { HallTargetId } from "../sections.ts";
import ControlBar from "./ControlBar.tsx";
import SettingsPanel from "./SettingsPanel.tsx";
import MobileTutorial from "./MobileTutorial.tsx";
import GuidedNav from "./GuidedNav.tsx";
import type { HallViewMode } from "./useHallSettings.ts";
import "./HUDOverlay.css";

type HallPhase = "intro" | "entering" | "interactive";

interface HUDOverlayProps {
  active: HallTargetId;
  hoveredId: HallTargetId | null;
  lowFidelity: boolean;
  audioMuted: boolean;
  fps: number;
  phase: HallPhase;
  /** Whether to render the bottom-right FPS counter. */
  showFps: boolean;
  /** Current camera view mode — drives ControlBar active state + the
   *  guided-tour pill mount. */
  viewMode: HallViewMode;
  /** True when the settings popover is open. */
  settingsOpen: boolean;
  /** Close the settings popover (called by outside-click + reset). */
  onCloseSettings: () => void;
  /** Reset additional tutorial flags (orbPulseSeen, mobileDeck) — fired
   *  from the gear panel's "reset all + replay tutorial" button. */
  onResetTutorials: () => void;
  onToggleMap: () => void;
  onToggleAudio: () => void;
  onToggleFidelity: () => void;
  onReturnToWorkstation: () => void;
  onJumpToTerminal: () => void;
  onEnterDoor: () => void;
  onViewModeChange: (m: HallViewMode) => void;
  onOpenSettings: () => void;
  /** Advance the guided tour to the next stop. */
  onGuidedNext: () => void;
  /** Exit guided mode back to free orbit. */
  onGuidedExit: () => void;
}

const HUDOverlay: React.FC<HUDOverlayProps> = ({
  active,
  hoveredId,
  lowFidelity,
  audioMuted,
  fps,
  phase,
  showFps,
  viewMode,
  settingsOpen,
  onCloseSettings,
  onResetTutorials,
  onToggleMap,
  onToggleAudio,
  onToggleFidelity,
  onReturnToWorkstation,
  onJumpToTerminal,
  onEnterDoor,
  onViewModeChange,
  onOpenSettings,
  onGuidedNext,
  onGuidedExit,
}) => {
  const labelTarget = hoveredId ?? active;
  const isHub = labelTarget === "hub";
  const theme = isHub ? null : HALL_THEMES[labelTarget];
  const isIntro = phase !== "interactive";
  const isGuided = viewMode === "guided";

  return (
    <div className="hall-hud" aria-hidden={false}>
      {/* Top-left: phase chip */}
      {!isIntro && (
        <div className="hall-hud__chip" role="status">
          <span className="hall-hud__dot" />
          {isGuided
            ? "the hall · guided tour"
            : "the hall · archipelago · hub island"}
        </div>
      )}

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
        {showFps && (
          <span className="hall-hud__fps">
            {fps > 0 ? `${fps} fps` : "—"}
          </span>
        )}
      </div>

      {/* Bottom-left keymap hint — replaced with door-entry prompt in intro.
       *  Shorter text now that the bottom ControlBar shows the main affordances. */}
      {!isIntro && (
        <div className="hall-hud__keys">
          <span>drag</span>
          <span>·</span>
          <span>scroll</span>
          <span>·</span>
          <span>click orb</span>
          <span>·</span>
          <span>⚙ for settings</span>
        </div>
      )}

      {/* Guided-tour pill — floats above the ControlBar when guided mode
       *  is active. Steps the camera through the landmarks one at a time. */}
      {!isIntro && isGuided && (
        <GuidedNav
          active={active}
          onNext={onGuidedNext}
          onExit={onGuidedExit}
        />
      )}

      {/* Bottom-anchored ControlBar — view modes + map + skip + gear. */}
      {!isIntro && (
        <ControlBar
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          onShowMap={onToggleMap}
          onSkipToProfile={onJumpToTerminal}
          onOpenSettings={onOpenSettings}
          settingsOpen={settingsOpen}
        />
      )}

      {/* Settings popover anchored above the gear button. */}
      {!isIntro && (
        <SettingsPanel
          open={settingsOpen}
          onClose={onCloseSettings}
          onResetTutorials={onResetTutorials}
        />
      )}

      {/* First-mobile-visit swipe-deck tutorial. The component self-gates
       *  on its own tutorial flag + viewport check, but we also gate the
       *  mount entirely on the parent so non-mobile users never download
       *  its DOM. */}
      {!isIntro && <MobileTutorialMount />}

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

/** Mounts the MobileTutorial overlay only when the viewport matches
 *  the mobile breakpoint. Tracks viewport size via matchMedia so a user
 *  who resizes from desktop to narrow sees the deck on next refresh.
 *  Tutorial-flag bookkeeping lives inside MobileTutorial itself. */
const MobileTutorialMount: React.FC = () => {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 720px)").matches;
  });
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 720px)");
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  if (!isMobile) return null;
  return <MobileTutorial visible={true} onDismiss={() => {}} />;
};

export default HUDOverlay;
