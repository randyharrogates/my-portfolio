/** @format */

import React, { Suspense, lazy, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import { useAmbientScene } from "./useAmbientScene.ts";

const AgentGraph = lazy(() => import("./scenes/AgentGraph.tsx"));
const Phosphor = lazy(() => import("./scenes/Phosphor.tsx"));
const WireGrid = lazy(() => import("./scenes/WireGrid.tsx"));

function detectInitialLowPerf(): boolean {
  if (typeof window === "undefined") return false;
  const cores = (navigator as Navigator & { hardwareConcurrency?: number })
    .hardwareConcurrency;
  const isMobile = window.matchMedia("(max-width: 800px)").matches;
  return (cores !== undefined && cores < 4) || isMobile;
}

const AmbientCanvas: React.FC = () => {
  const { sceneId } = useAmbientScene();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [lowPerf] = useState(() => detectInitialLowPerf());

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (sceneId === "off") return null;

  // Demand framerate keeps GPU near-idle when nothing is changing.
  // Each scene drives its own animation via tiny stepped useFrame ticks.
  const frameloop = hidden || reducedMotion ? "never" : "always";

  return (
    <div className={`ambient-canvas ambient-${sceneId}`} aria-hidden="true">
      <Canvas
        dpr={[1, lowPerf ? 1 : 1.25]}
        gl={{ antialias: false, powerPreference: "low-power", alpha: true }}
        camera={{ position: [0, 0, 8], fov: 50, near: 0.1, far: 100 }}
        frameloop={frameloop}
      >
        <AdaptiveDpr pixelated />
        <Suspense fallback={null}>
          {sceneId === "graph" && <AgentGraph lowPerf={lowPerf} reducedMotion={reducedMotion} />}
          {sceneId === "phosphor" && <Phosphor lowPerf={lowPerf} reducedMotion={reducedMotion} />}
          {sceneId === "grid" && <WireGrid lowPerf={lowPerf} reducedMotion={reducedMotion} />}
        </Suspense>
      </Canvas>
    </div>
  );
};

export default AmbientCanvas;
