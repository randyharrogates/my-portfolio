/** @format */

import React, { useMemo } from "react";
import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import {
  cos,
  float,
  fract,
  hash,
  instanceIndex,
  mix,
  positionLocal,
  sin,
  smoothstep,
  timerLocal,
  vec3,
} from "three/tsl";

interface WaterfallSprayProps {
  /** World position of the spray emitter (impact zone — bottom of waterfall). */
  position: [number, number, number];
  /** How many particles to render. 2000 reads as a dense splash without
   *  tanking the GPU on Mac integrated graphics. */
  count?: number;
}

/** TSL-instanced particle spray system for the waterfall impact zone.
 *  Each particle is a tiny quad. The TSL vertex shader derives the per-
 *  particle position from `instanceIndex` + a `timerLocal()` cycle — no
 *  CPU loop, no per-frame uniform updates. Particles follow a parabolic
 *  trajectory (initial upward+outward burst → gravity drag → respawn at
 *  the impact origin) that reads as "water bouncing off the plunge pool".
 *
 *  Per CLAUDE.md `feedback_hall_water_tech.md` stack-component #3. */
const WaterfallSpray: React.FC<WaterfallSprayProps> = ({
  position,
  count = 2000,
}) => {
  const geom = useMemo(() => {
    // Quad sized to read from orbital distance (camera ~80m away).
    // 0.5m × 0.5m droplets still cluster into a believable spray since the
    // TSL alpha + parabolic trajectory keeps them moving fast.
    const g = new THREE.PlaneGeometry(0.5, 0.5);
    // Face up so the orbital camera (+X+Y+Z above impact) sees them.
    g.rotateX(-Math.PI / 2);
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

    // === Per-particle random seeds (deterministic from instanceIndex) ===
    const idx = instanceIndex;
    const h1 = hash(idx);                  // 0..1
    // @ts-expect-error - hash arithmetic + TSL nodes
    const h2 = hash(idx.add(1009));
    // @ts-expect-error
    const h3 = hash(idx.add(2027));
    // @ts-expect-error
    const h4 = hash(idx.add(3041));

    // Particle lifetime varies 0.8s..1.6s per particle for natural staggering.
    const lifetime = h1.mul(0.8).add(0.8);

    // Cycle phase: each particle has its own offset so they don't all
    // respawn at the same time. (t + offset) mod lifetime → age in [0, lifetime).
    const phaseOffset = h2.mul(2.0);  // 0..2s offset
    // @ts-expect-error
    const cycleT = fract(t.add(phaseOffset).div(lifetime));
    const age = cycleT.mul(lifetime);  // 0..lifetime seconds

    // === Trajectory: parabolic launch from origin ===
    // Initial velocity: upward + outward in a random horizontal direction.
    const azimuth = h3.mul(Math.PI * 2);    // 0..2π
    const speed = h4.mul(2.5).add(1.5);     // 1.5..4.0 m/s horizontal speed
    const upSpeed = h1.mul(2.0).add(2.5);   // 2.5..4.5 m/s upward speed

    const vX = cos(azimuth).mul(speed);
    const vZ = sin(azimuth).mul(speed);
    const vY = upSpeed;

    // Position: x0 + vt - 0.5*g*t²  (g = 9.81 m/s²)
    const offsetX = vX.mul(age);
    const offsetZ = vZ.mul(age);
    // @ts-expect-error
    const offsetY = vY.mul(age).sub(age.mul(age).mul(4.905));

    // Particle position in local-instance space
    const particleOffset = vec3(offsetX, offsetY, offsetZ);

    // Apply to vertex position
    // @ts-expect-error - positionLocal.add accepts vec3
    mat.positionNode = positionLocal.add(particleOffset);

    // === Per-particle size — drop over lifetime ===
    const sizeOverLife = mix(float(1.0), float(0.3), cycleT);
    // We can't easily scale just THIS particle without per-vert effort;
    // instead control via opacity which gives an apparent size effect.

    // === Opacity — fade in fast, hold, fade out
    const fadeIn = smoothstep(float(0.0), float(0.1), cycleT);
    const fadeOut = smoothstep(float(1.0), float(0.7), cycleT);
    // @ts-expect-error
    const alpha = fadeIn.mul(fadeOut).mul(sizeOverLife);

    // === Colour — bright cyan-white droplets fading to blue
    const dropBright = vec3(1.0, 1.06, 1.12);
    const dropBlue = vec3(0.30, 0.65, 1.0);
    // @ts-expect-error
    const color = mix(dropBright, dropBlue, cycleT);

    mat.colorNode = color;
    mat.opacityNode = alpha;

    return mat;
  }, []);

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

export default WaterfallSpray;
