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
  lowFidelity?: boolean;
}

const Lighting: React.FC<LightingProps> = ({ hourOverride, lowFidelity }) => {
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
        (2.9 * tint.intensityScale) + Math.sin(t * 0.4) * 0.12;
    }
    if (rimRef.current) {
      const t = state.clock.elapsedTime;
      rimRef.current.intensity = 2.0 + Math.sin(t * 0.5 + 1.4) * 0.18;
    }
  });

  return (
    <>
      <hemisphereLight args={[tint.hemi[0], tint.hemi[1], 0.55]} />
      <spotLight
        ref={keyRef}
        position={[-1.4, 3.0, 1.6]}
        angle={0.95}
        penumbra={0.7}
        intensity={2.9 * tint.intensityScale}
        color={tint.key}
        distance={11}
        decay={1.4}
        castShadow={!lowFidelity}
        shadow-mapSize={lowFidelity ? 256 : 4096}
        shadow-bias={-0.0006}
      />
      <pointLight
        ref={rimRef}
        position={[2.6, 1.4, 0.8]}
        intensity={2.0}
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
        intensity={1.3 * tint.intensityScale}
        color={tint.key}
        distance={6.5}
        decay={1.6}
        castShadow={!lowFidelity}
        shadow-mapSize={lowFidelity ? 256 : 4096}
        shadow-bias={-0.0005}
      />
      {/* Bounce-fill ambient so the scene reads even off the key beam */}
      <ambientLight intensity={0.22} color="#3a2e22" />
    </>
  );
};

export default Lighting;
