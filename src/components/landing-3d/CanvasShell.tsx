/** @format */

import React, { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import type { LandingThemeId } from "./types.ts";
import { TERMINAL_THEME } from "./colors.ts";

interface CanvasShellProps {
  children: React.ReactNode;
  themeId: LandingThemeId;
  cameraPos: [number, number, number];
  reducedMotion: boolean;
  onLowPerf: (low: boolean) => void;
}

const CanvasShell: React.FC<CanvasShellProps> = ({
  children,
  themeId,
  cameraPos,
  reducedMotion,
  onLowPerf,
}) => {
  const [hidden, setHidden] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Pause rendering when not in viewport
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => setInView(e.isIntersecting)),
      { threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const frameloop = hidden || !inView ? "never" : reducedMotion ? "demand" : "always";

  return (
    <div
      ref={containerRef}
      className={`landing-3d-canvas landing-3d-theme-${themeId}`}
      style={{ width: "100%", height: "100%", background: TERMINAL_THEME.paper }}
      data-theme-id={themeId}
    >
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{ position: cameraPos, fov: 45, near: 0.1, far: 200 }}
        frameloop={frameloop}
      >
        <PerformanceMonitor onDecline={() => onLowPerf(true)} />
        <AdaptiveDpr pixelated />
        {children}
      </Canvas>
    </div>
  );
};

export default CanvasShell;
