/** @format */

import React, { useMemo } from "react";
import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import {
  float,
  fract,
  hash,
  instanceIndex,
  mix,
  positionLocal,
  smoothstep,
  timerLocal,
  vec3,
} from "three/tsl";

interface WaterfallDropletsProps {
  /** World position of the cascade origin (top of waterfall lip). */
  position: [number, number, number];
  /** Vertical drop in metres (positive = falls down). */
  fallHeight: number;
  /** Horizontal spread half-width at the LIP (where the water sheet starts). */
  lipHalfWidth?: number;
  /** Particle count. 1500 spread across the cascade reads well. */
  count?: number;
}

/** Falling-water droplets along the cascade path.
 *
 *  Unlike WaterfallSpray (which spawns at the impact zone), these droplets
 *  spawn distributed ALONG the fall — each droplet has a random initial
 *  Y in [0, fallHeight] and falls under gravity. As the droplet reaches the
 *  bottom it respawns near the top with new randomised offsets, giving the
 *  impression of constant droplet motion along the entire fall.
 *
 *  Each droplet is a tiny billboard. The TSL vertex shader derives the per-
 *  particle position from `instanceIndex` + `timerLocal()`. No CPU loop.
 *
 *  Per CLAUDE.md stack component: falling-droplet "particle level detail"
 *  along the cascade (in addition to the impact spray + mist). */
const WaterfallDroplets: React.FC<WaterfallDropletsProps> = ({
  position,
  fallHeight,
  lipHalfWidth = 2.5,
  count = 1500,
}) => {
  const geom = useMemo(() => {
    // Tiny droplet quad — 0.25m × 0.25m reads from orbital distance but
    // doesn't dominate the silhouette.
    const g = new THREE.PlaneGeometry(0.25, 0.25);
    // Vertical orientation so droplets face the camera as they fall.
    return g;
  }, []);

  const material = useMemo(() => {
    const mat = new MeshBasicNodeMaterial({
      color: new THREE.Color(0xffffff),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const t = timerLocal();
    const idx = instanceIndex;
    const h1 = hash(idx);
    // @ts-expect-error - hash + instanceIndex arithmetic
    const h2 = hash(idx.add(1009));
    // @ts-expect-error
    const h3 = hash(idx.add(2027));
    // @ts-expect-error
    const h4 = hash(idx.add(3041));

    // Per-particle fall duration (how long to fall the full height).
    // sqrt(2h/g) for free fall ~= sqrt(2*44/9.81) ~= 3s. Vary 2.5..3.5s.
    const fallDuration = h1.mul(1.0).add(2.5);

    // Phase offset so droplets don't all fall in sync — each gets a
    // unique starting time within [0, fallDuration).
    const phaseOffset = h2.mul(fallDuration);

    // Cycle phase: 0..1 across one fall cycle
    // @ts-expect-error
    const cycleT = fract(t.add(phaseOffset).div(fallDuration));

    // Vertical position: falls from top to bottom across the cycle.
    // Quadratic for free-fall acceleration: y = h - 0.5*g*t² but
    // normalised to cycleT, simpler: y = h * (1 - cycleT²) goes from h to 0
    // @ts-expect-error
    const yFromTop = oneMinusSqr(cycleT).mul(fallHeight);

    // Horizontal scatter: random X/Z offset within the lip width,
    // slightly increasing as the droplet falls (water sheet spreads).
    const xJitter = h3.mul(2.0).sub(1.0).mul(lipHalfWidth);
    const zJitter = h4.mul(2.0).sub(1.0).mul(lipHalfWidth);
    // @ts-expect-error - cycleT.mul accepts number
    const spread = float(1.0).add(cycleT.mul(0.6));  // 1.0 -> 1.6
    const offsetX = xJitter.mul(spread);
    const offsetZ = zJitter.mul(spread);

    // Final particle offset
    const particleOffset = vec3(offsetX, yFromTop, offsetZ);

    // @ts-expect-error - positionLocal accepts vec3 add
    mat.positionNode = positionLocal.add(particleOffset);

    // === Opacity — fade in/out around the cycle for smoother spawn/despawn
    const fadeIn = smoothstep(float(0.0), float(0.08), cycleT);
    const fadeOut = smoothstep(float(1.0), float(0.85), cycleT);
    // @ts-expect-error
    const alpha = fadeIn.mul(fadeOut).mul(0.75);

    // === Colour — bright cyan-white droplets, brighter toward the bottom
    const dropDim = vec3(0.45, 0.78, 1.0);
    const dropBright = vec3(1.0, 1.08, 1.15);
    // @ts-expect-error
    const color = mix(dropDim, dropBright, cycleT);

    mat.colorNode = color;
    mat.opacityNode = alpha;

    return mat;
  }, [fallHeight, lipHalfWidth]);

  return (
    <instancedMesh
      args={[geom, material, count]}
      position={position}
      frustumCulled={false}
      castShadow={false}
      receiveShadow={false}
    />
  );
};

// Helper since TSL doesn't expose oneMinusSqr directly — compute (1-x)*(1-x).
// @ts-expect-error - TSL node arithmetic
function oneMinusSqr(x) {
  const y = float(1.0).sub(x);
  return y.mul(y);
}

export default WaterfallDroplets;
