/** @format */

import React from "react";
import type { HallViewMode } from "./useHallSettings.ts";
import "./ControlBar.css";

interface ControlBarProps {
  viewMode: HallViewMode;
  onViewModeChange: (m: HallViewMode) => void;
  onShowMap: () => void;
  onSkipToProfile: () => void;
  onOpenSettings: () => void;
  settingsOpen: boolean;
  /** Hidden in photo mode so the screenshot stays clean (but the gear
   *  + photo-exit hint is still reachable). */
  hidden?: boolean;
}

interface IconProps {
  className?: string;
}

const OrbitIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <ellipse
      cx="8"
      cy="8"
      rx="6.5"
      ry="3"
      stroke="currentColor"
      strokeWidth="1.2"
      transform="rotate(-20 8 8)"
    />
    <circle cx="8" cy="8" r="1.6" fill="currentColor" />
  </svg>
);

const GuidedIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    {/* A dotted route between two pins — reads as "guided path". */}
    <path
      d="M4 12 Q4 8 8 8 Q12 8 12 4"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeDasharray="1.6 1.8"
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="4" cy="12.5" r="1.8" fill="currentColor" />
    <circle cx="12" cy="3.5" r="1.8" stroke="currentColor" strokeWidth="1.2" fill="none" />
  </svg>
);

const MapIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M1.5 4 L5.5 2.5 L10.5 4.5 L14.5 3 L14.5 12 L10.5 13.5 L5.5 11.5 L1.5 13 Z"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
    />
    <path d="M5.5 2.5 L5.5 11.5 M10.5 4.5 L10.5 13.5" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const SkipIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M2 8 L11 8 M7.5 4 L11.5 8 L7.5 12"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path d="M13.5 4 L13.5 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const GearIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M8 1.5 L9.1 3.3 L11.2 2.9 L11.6 5 L13.4 6.1 L12.7 8 L13.4 9.9 L11.6 11 L11.2 13.1 L9.1 12.7 L8 14.5 L6.9 12.7 L4.8 13.1 L4.4 11 L2.6 9.9 L3.3 8 L2.6 6.1 L4.4 5 L4.8 2.9 L6.9 3.3 Z"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
      fill="none"
    />
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.1" fill="none" />
  </svg>
);

/** Bottom-anchored control bar — view modes + map + skip + gear.
 *  Mounts above the existing top-right HUD utilities; doesn't replace them. */
const ControlBar: React.FC<ControlBarProps> = ({
  viewMode,
  onViewModeChange,
  onShowMap,
  onSkipToProfile,
  onOpenSettings,
  settingsOpen,
  hidden = false,
}) => {
  return (
    <div
      className={`hall-controlbar${hidden ? " hall-controlbar--hidden" : ""}`}
      role="toolbar"
      aria-label="view controls"
    >
      <button
        type="button"
        className={`hall-controlbar__btn${
          viewMode === "orbit" ? " is-active" : ""
        }`}
        onClick={() => onViewModeChange("orbit")}
        aria-pressed={viewMode === "orbit"}
        aria-label="free orbit view"
      >
        <OrbitIcon className="hall-controlbar__icon" />
        <span className="hall-controlbar__label">orbit</span>
      </button>
      <button
        type="button"
        className={`hall-controlbar__btn${
          viewMode === "guided" ? " is-active" : ""
        }`}
        onClick={() => onViewModeChange("guided")}
        aria-pressed={viewMode === "guided"}
        aria-label="guided tour"
      >
        <GuidedIcon className="hall-controlbar__icon" />
        <span className="hall-controlbar__label">guided</span>
      </button>

      <span className="hall-controlbar__divider" aria-hidden="true" />

      <button
        type="button"
        className="hall-controlbar__btn"
        onClick={onShowMap}
        aria-label="open map"
      >
        <MapIcon className="hall-controlbar__icon" />
        <span className="hall-controlbar__label">map</span>
      </button>
      <button
        type="button"
        className="hall-controlbar__btn hall-controlbar__btn--accent"
        onClick={onSkipToProfile}
        aria-label="skip to terminal portfolio"
      >
        <SkipIcon className="hall-controlbar__icon" />
        <span className="hall-controlbar__label">skip</span>
      </button>
      <button
        type="button"
        className={`hall-controlbar__btn hall-controlbar__btn--icon-only${
          settingsOpen ? " is-active" : ""
        }`}
        onClick={onOpenSettings}
        aria-label="open settings"
        aria-expanded={settingsOpen}
      >
        <GearIcon className="hall-controlbar__icon" />
      </button>
    </div>
  );
};

export default ControlBar;
