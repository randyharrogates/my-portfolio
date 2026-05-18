/** @format */

import React, { useCallback, useEffect, useRef } from "react";
import { useHallSettings } from "./useHallSettings.ts";
import type { AutoRotateMode, TriState } from "./useHallSettings.ts";
import "./SettingsPanel.css";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  onResetTutorials?: () => void;
}

const SECTION_HEADINGS = {
  camera: "camera",
  display: "display",
  advanced: "advanced",
  reset: "reset",
} as const;

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  open,
  onClose,
  onResetTutorials,
}) => {
  const {
    settings,
    setSensitivity,
    setFov,
    setAutoRotate,
    setPoiLabels,
    setFpsCounter,
    setReducedMotionOverride,
    resetAll,
  } = useHallSettings();
  const panelRef = useRef<HTMLDivElement>(null);

  // Outside-click close
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (panelRef.current.contains(e.target as Node)) return;
      // Skip if the click was on the gear button itself (its onClick
      // already toggles the panel; treating outside-click as close
      // would race with that and reopen immediately).
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[aria-label="open settings"]')) return;
      onClose();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, onClose]);

  const handleReset = useCallback(() => {
    resetAll();
    if (onResetTutorials) onResetTutorials();
    onClose();
  }, [resetAll, onResetTutorials, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="hall-settings-panel"
      role="dialog"
      aria-modal="false"
      aria-label="hall settings"
    >
      <div className="hall-settings-panel__arrow" aria-hidden="true" />

      <section className="hall-settings-panel__section">
        <h3 className="hall-settings-panel__heading">
          {SECTION_HEADINGS.camera}
        </h3>
        <div className="hall-settings-panel__row">
          <label className="hall-settings-panel__label" htmlFor="hall-sens">
            sensitivity
            <span className="hall-settings-panel__value">
              {settings.sensitivity.toFixed(1)}×
            </span>
          </label>
          <input
            id="hall-sens"
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={settings.sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
            className="hall-settings-panel__slider"
          />
        </div>
        <div className="hall-settings-panel__row">
          <label className="hall-settings-panel__label" htmlFor="hall-fov">
            fov
            <span className="hall-settings-panel__value">{settings.fov}°</span>
          </label>
          <input
            id="hall-fov"
            type="range"
            min={40}
            max={90}
            step={1}
            value={settings.fov}
            onChange={(e) => setFov(Number(e.target.value))}
            className="hall-settings-panel__slider"
          />
        </div>
      </section>

      <section className="hall-settings-panel__section">
        <h3 className="hall-settings-panel__heading">
          {SECTION_HEADINGS.display}
        </h3>
        <div className="hall-settings-panel__row">
          <span className="hall-settings-panel__label">auto-rotate</span>
          <div className="hall-settings-panel__seg">
            {(["hub-only", "always", "never"] as AutoRotateMode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={`hall-settings-panel__seg-btn${
                  settings.autoRotate === m ? " is-active" : ""
                }`}
                onClick={() => setAutoRotate(m)}
                aria-pressed={settings.autoRotate === m}
              >
                {m === "hub-only" ? "hub" : m}
              </button>
            ))}
          </div>
        </div>
        <div className="hall-settings-panel__row">
          <span className="hall-settings-panel__label">poi labels</span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.poiLabels}
            className={`hall-settings-panel__toggle${
              settings.poiLabels ? " is-on" : ""
            }`}
            onClick={() => setPoiLabels(!settings.poiLabels)}
          >
            <span className="hall-settings-panel__toggle-knob" />
            <span className="hall-settings-panel__toggle-text">
              {settings.poiLabels ? "on" : "off"}
            </span>
          </button>
        </div>
      </section>

      <section className="hall-settings-panel__section">
        <h3 className="hall-settings-panel__heading">
          {SECTION_HEADINGS.advanced}
        </h3>
        <div className="hall-settings-panel__row">
          <span className="hall-settings-panel__label">fps counter</span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.fpsCounter}
            className={`hall-settings-panel__toggle${
              settings.fpsCounter ? " is-on" : ""
            }`}
            onClick={() => setFpsCounter(!settings.fpsCounter)}
          >
            <span className="hall-settings-panel__toggle-knob" />
            <span className="hall-settings-panel__toggle-text">
              {settings.fpsCounter ? "show" : "hide"}
            </span>
          </button>
        </div>
        <div className="hall-settings-panel__row">
          <span className="hall-settings-panel__label">reduced motion</span>
          <div className="hall-settings-panel__seg">
            {(["system", "on", "off"] as TriState[]).map((m) => (
              <button
                key={m}
                type="button"
                className={`hall-settings-panel__seg-btn${
                  settings.reducedMotionOverride === m ? " is-active" : ""
                }`}
                onClick={() => setReducedMotionOverride(m)}
                aria-pressed={settings.reducedMotionOverride === m}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="hall-settings-panel__section hall-settings-panel__section--reset">
        <button
          type="button"
          className="hall-settings-panel__reset"
          onClick={handleReset}
        >
          reset all + replay tutorial
        </button>
      </section>
    </div>
  );
};

export default SettingsPanel;
