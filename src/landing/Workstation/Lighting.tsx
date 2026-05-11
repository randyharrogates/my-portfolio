/** @format */

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface TimeOfDayTint {
  key: string;
  rim: string;
  hemi: [string, string];
  fill: string;
  intensityScale: number;
}

export function tintForHour(hour: number): TimeOfDayTint {
  if (hour >= 18 && hour < 22) {
    return {
      key: "#ff9f60",
      rim: "#ff7a3c",
      hemi: ["#3a2418", "#0a0807"],
      fill: "#3a4a6a",
      intensityScale: 1.0,
    };
  }
  if (hour >= 22 || hour < 6) {
    return {
      key: "#a8c4ff",
      rim: "#5e7bff",
      hemi: ["#1a2238", "#050608"],
      fill: "#5e7bff",
      intensityScale: 0.85,
    };
  }
  if (hour >= 6 && hour < 12) {
    return {
      key: "#ffe6c0",
      rim: "#ffae6e",
      hemi: ["#2c2218", "#0a0808"],
      fill: "#a8b8d8",
      intensityScale: 1.0,
    };
  }
  return {
    key: "#fff0d8",
    rim: "#ff9658",
    hemi: ["#26201c", "#0c0b0a"],
    fill: "#88a0c8",
    intensityScale: 1.05,
  };
}

interface LightingProps {
  hourOverride?: number;
}

const Lighting: React.FC<LightingProps> = ({ hourOverride }) => {
  const tint = useMemo(() => {
    const h = hourOverride ?? new Date().getHours();
    return tintForHour(h);
  }, [hourOverride]);

  const keyRef = useRef<THREE.SpotLight>(null);
  const rimRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (keyRef.current) {
      const t = state.clock.elapsedTime;
      keyRef.current.intensity =
        (1.8 * tint.intensityScale) + Math.sin(t * 0.4) * 0.08;
    }
    if (rimRef.current) {
      const t = state.clock.elapsedTime;
      rimRef.current.intensity = 1.4 + Math.sin(t * 0.5 + 1.4) * 0.12;
    }
  });

  return (
    <>
      <hemisphereLight args={[tint.hemi[0], tint.hemi[1], 0.7]} />
      <spotLight
        ref={keyRef}
        position={[-1.4, 3.0, 1.6]}
        angle={0.95}
        penumbra={0.7}
        intensity={1.8 * tint.intensityScale}
        color={tint.key}
        distance={11}
        decay={1.4}
      />
      <pointLight
        ref={rimRef}
        position={[2.6, 1.4, 0.8]}
        intensity={1.4}
        color={tint.rim}
        distance={6}
        decay={2}
      />
      <pointLight
        position={[-2.2, 0.7, 1.6]}
        intensity={1.2}
        color={tint.fill}
        distance={6}
        decay={2}
      />
      {/* Avatar fill — small, localized to the desk photo frame */}
      <pointLight
        position={[-0.78, 0.6, 0.28]}
        intensity={0.8}
        color="#c8d0e8"
        distance={1.2}
        decay={2}
      />
      {/* Ceiling wash — broad, soft top-down spot covering the whole desk. */}
      <spotLight
        position={[0.0, 3.2, 0.4]}
        target-position={[0.0, 0.0, 0.0]}
        angle={1.05}
        penumbra={0.85}
        intensity={0.75 * tint.intensityScale}
        color={tint.key}
        distance={6.5}
        decay={1.6}
      />
      {/* Pendant desk lamp — warm spotlight hanging above the desk, aimed
       *  down to light the chair, plant and desk surface. No shadows (cheap). */}
      <spotLight
        position={[0.0, 2.2, 0.55]}
        target-position={[0.0, 0.0, 0.55]}
        angle={0.75}
        penumbra={0.85}
        intensity={1.1}
        color="#ffd8a0"
        distance={4.2}
        decay={1.8}
      />
      {/* Bounce-fill ambient so the scene reads even off the key beam */}
      <ambientLight intensity={0.32} color="#3a2e22" />
    </>
  );
};

export default Lighting;
