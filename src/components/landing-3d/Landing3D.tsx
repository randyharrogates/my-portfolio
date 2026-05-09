/** @format */

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useLandingTheme } from "./useLandingTheme.ts";
import { THEME_IDS, THEME_REGISTRY } from "./themes/registry.ts";
import CanvasShell from "./CanvasShell.tsx";
import { portfolioData } from "./data.ts";
import type { LandingThemeId } from "./types.ts";

interface Landing3DProps {
  typedName: string;
  showCursor: boolean;
}

function detectInitialLowPerf(): boolean {
  if (typeof window === "undefined") return false;
  const cores = (navigator as Navigator & { hardwareConcurrency?: number })
    .hardwareConcurrency;
  const isMobile = window.matchMedia("(max-width: 800px)").matches;
  return (cores !== undefined && cores < 4) || isMobile;
}

function detectReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const ThemeSwitcher: React.FC<{
  current: LandingThemeId;
  onChange: (id: LandingThemeId) => void;
}> = ({ current, onChange }) => (
  <div className="landing-3d-switcher" role="tablist" aria-label="3D landing theme">
    {THEME_IDS.map((id) => (
      <button
        key={id}
        role="tab"
        aria-selected={id === current}
        className={`landing-3d-switcher-btn${id === current ? " is-active" : ""}`}
        onClick={() => onChange(id)}
        type="button"
        title={THEME_REGISTRY[id].description}
      >
        {THEME_REGISTRY[id].label}
      </button>
    ))}
  </div>
);

const Landing3D: React.FC<Landing3DProps> = ({ typedName, showCursor }) => {
  const { themeId, setThemeId } = useLandingTheme();
  const [lowPerf, setLowPerf] = useState<boolean>(() => detectInitialLowPerf());
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => detectReducedMotion());

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const entry = THEME_REGISTRY[themeId];
  const ThemeComponent = entry.component;

  const themeProps = useMemo(
    () => ({
      data: portfolioData,
      typedName,
      showCursor,
      reducedMotion,
      lowPerf,
    }),
    [typedName, showCursor, reducedMotion, lowPerf]
  );

  return (
    <div className="landing-3d-root" data-theme={themeId}>
      <ThemeSwitcher current={themeId} onChange={setThemeId} />
      <CanvasShell
        themeId={themeId}
        cameraPos={entry.defaultCameraPos}
        reducedMotion={reducedMotion}
        onLowPerf={setLowPerf}
      >
        <Suspense fallback={null}>
          <ThemeComponent {...themeProps} />
        </Suspense>
      </CanvasShell>
    </div>
  );
};

export default Landing3D;
