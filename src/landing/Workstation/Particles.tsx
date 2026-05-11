/** @format */

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface DustProps {
  count?: number;
  reducedMotion: boolean;
  active: boolean;
}

/** Volumetric-style dust particles: additive billboards drifting in the key-light beam. */
const Dust: React.FC<DustProps> = ({
  count = 40,
  reducedMotion,
  active,
}) => {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 4.0;
      arr[i * 3 + 1] = Math.random() * 2.5 - 0.4;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 2.5;
    }
    return arr;
  }, [count]);

  const seeds = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = Math.random() * 1000;
    return arr;
  }, [count]);

  useFrame((s) => {
    if (!ref.current || reducedMotion || !active) return;
    const t = s.clock.elapsedTime;
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      arr[idx] += Math.sin(t * 0.3 + seeds[i]) * 0.0008;
      arr[idx + 1] += 0.0015;
      arr[idx + 2] += Math.cos(t * 0.25 + seeds[i] * 1.3) * 0.0007;
      if (arr[idx + 1] > 2.4) arr[idx + 1] = -0.4;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.013}
        color="#ffd9a8"
        transparent
        opacity={0.08}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

interface DustBeamProps {
  count?: number;
  reducedMotion: boolean;
  active: boolean;
}

/**
 * Tighter dust field clustered inside the ceiling spotlight's cone — gives the
 * top-down beam a visible volumetric falloff without paying for a GodRays
 * postprocessing pass. Spawns inside a downward cone whose apex is roughly the
 * spot position [0, 3.2, 0.4] and whose base spans the desk surface.
 */
export const DustBeam: React.FC<DustBeamProps> = ({
  count = 160,
  reducedMotion,
  active,
}) => {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // y in [0, 3.2] from desk to ceiling; cone radius scales with height.
      const y = Math.random() * 3.2;
      const radius = 0.25 + (3.2 - y) * 0.55;
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      arr[i * 3] = Math.cos(theta) * r;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = 0.4 + Math.sin(theta) * r;
    }
    return arr;
  }, [count]);

  const seeds = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = Math.random() * 1000;
    return arr;
  }, [count]);

  useFrame((s) => {
    if (!ref.current || reducedMotion || !active) return;
    const t = s.clock.elapsedTime;
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      arr[idx] += Math.sin(t * 0.25 + seeds[i]) * 0.0004;
      arr[idx + 1] -= 0.0009;
      arr[idx + 2] += Math.cos(t * 0.22 + seeds[i] * 1.3) * 0.0004;
      if (arr[idx + 1] < 0.0) arr[idx + 1] = 3.2;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.014}
        color="#fff0d8"
        transparent
        opacity={0.42}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

export default Dust;
