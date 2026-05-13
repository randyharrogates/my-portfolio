/** @format */

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  attribute,
  clamp,
  cos,
  float,
  mod,
  oneMinus,
  positionLocal,
  positionView,
  sin,
  smoothstep,
  uniform,
  vec3,
} from "three/tsl";
import { PointsNodeMaterial } from "three/webgpu";

interface MotesGPUProps {
  count: number;
  staticMode: boolean;
  color: string;
  size: number;
  opacity: number;
  /** Drift speed multiplier (1.0 = baseline). */
  speed?: number;
  /** Field radius (horizontal), in world units. */
  radius?: number;
  /** Field Y extents. */
  yBottom?: number;
  yTop?: number;
  /** Per-particle horizontal swirl amplitude. */
  swirl?: number;
}

/** Phase 4 — GPU-driven atmospheric motes. TSL-authored
 *  `PointsNodeMaterial`: the vertex stage computes positions
 *  deterministically from (seed, phase, uTime). The CPU only updates a
 *  single `uTime` uniform per frame.
 *
 *  Sprite: radial-gradient PNG, additive blend so selective bloom in
 *  `Postprocessing.tsx` picks them up as glowing dust against the
 *  neon-dusk skybox.
 *
 *  Phase 4.5 sub-task 9 (pending): replace the vertex-stage animation
 *  with a true TSL compute pass writing into a `StorageBufferAttribute`.
 *  Same visual result; offloads per-particle math from the per-vertex
 *  invocation to a compute kernel that runs once per frame regardless
 *  of overdraw.
 */
const MotesGPU: React.FC<MotesGPUProps> = ({
  count,
  staticMode,
  color,
  size,
  opacity,
  speed = 1.0,
  radius = 70,
  yBottom = -22,
  yTop = 18,
  swirl = 0.6,
}) => {
  /** Per-particle seed positions + phase. Phase is in [0, 2π); seed
   *  positions are drawn from a disc × Y-range so the field surrounds
   *  the island silhouette evenly. */
  const { positions, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    const range = yTop - yBottom;
    for (let i = 0; i < count; i++) {
      const r = radius * Math.sqrt(Math.random());
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = yBottom + Math.random() * range;
      pos[i * 3 + 2] = Math.sin(a) * r;
      ph[i] = Math.random() * Math.PI * 2;
    }
    return { positions: pos, phases: ph };
  }, [count, radius, yBottom, yTop]);

  const node = useMemo(() => {
    const uTime = uniform(0);
    const uSize = uniform(size);
    const uOpacity = uniform(opacity);
    const uColor = uniform(new THREE.Color(color));
    const uSpeed = uniform(speed);
    const uSwirl = uniform(swirl);
    const uYBottom = uniform(yBottom);
    const uYTop = uniform(yTop);

    const phase = attribute("phase", "float");
    const t = uTime.mul(uSpeed).add(phase);
    const range = uYTop.sub(uYBottom);
    const yRel = mod(
      positionLocal.y.sub(uYBottom).add(uTime.mul(0.12).mul(uSpeed)),
      range
    );
    const animY = uYBottom.add(yRel);
    const animX = positionLocal.x.add(sin(t.mul(0.4)).mul(uSwirl));
    const animZ = positionLocal.z.add(
      cos(t.mul(0.4).add(phase)).mul(uSwirl)
    );
    const animPos = vec3(animX, animY, animZ);

    const yNorm = yRel.div(range);
    const fade = smoothstep(float(0.0), float(0.12), yNorm).mul(
      oneMinus(smoothstep(float(0.88), float(1.0), yNorm))
    );

    // Procedural alpha: hard-edged square dot, softened by additive
    // blending. The texture-based sprite path (`texture(sprite,
    // pointUV)`) had bundle-loading issues after the postprocessing
    // uninstall cascade — drei's `useTexture` resolves to `undefined`
    // in the rebuilt graph. Revisit when we move off drei entirely.
    const finalColor = uColor;
    const finalAlpha = uOpacity.mul(clamp(fade, 0, 1));

    // Distance-attenuated size — matches the original GLSL's
    // `uSize * 300 / -mvPosition.z`. `positionView.z` is negative in
    // front of the camera; negate to get positive depth.
    const sizeAttenuated = uSize.mul(
      float(300.0).div(positionView.z.negate())
    );

    const mat = new PointsNodeMaterial();
    mat.positionNode = animPos;
    mat.sizeNode = sizeAttenuated;
    mat.colorNode = finalColor;
    mat.opacityNode = finalAlpha;
    mat.transparent = true;
    mat.depthWrite = false;
    mat.blending = THREE.AdditiveBlending;
    return { material: mat, uTime };
  }, [color, opacity, size, speed, swirl, yBottom, yTop]);

  useFrame((_, delta) => {
    if (staticMode) return;
    node.uTime.value += delta;
  });

  useEffect(() => {
    return () => {
      node.material.dispose();
    };
  }, [node]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-phase" args={[phases, 1]} />
      </bufferGeometry>
      <primitive object={node.material} attach="material" />
    </points>
  );
};

export default MotesGPU;
