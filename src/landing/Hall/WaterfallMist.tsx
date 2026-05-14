/** @format */

import React, { useMemo } from "react";
import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import {
  cos,
  float,
  mix,
  oneMinus,
  sin,
  smoothstep,
  timerLocal,
  uv,
  vec3,
} from "three/tsl";

interface WaterfallMistProps {
  /** World position where the mist hovers (impact zone — bottom of waterfall). */
  position: [number, number, number];
  /** Mist disc radius. ~6m gives a generous haze cloud at the impact. */
  radius?: number;
  /** Vertical thickness (height) of the mist column. */
  height?: number;
}

/** Planar mist plane that hovers above the waterfall impact zone.
 *
 *  WebGPU on Mac+Chrome doesn't support real volumetric fog, so we
 *  substitute by stacking semi-transparent planes with noise-based
 *  density. The result reads as a soft haze that catches the magenta/
 *  cyan scene lighting and gives the waterfall its "wet atmosphere"
 *  character. Per CLAUDE.md `feedback_hall_water_tech.md` stack
 *  component #4. */
const WaterfallMist: React.FC<WaterfallMistProps> = ({
  position,
  radius = 6.0,
  height = 2.4,
}) => {
  // Build a small stack of horizontal discs at slightly different heights.
  // Each disc has the same TSL noise material — together they read as a
  // 3D-ish volume.
  const PLANE_COUNT = 5;

  const sharedGeom = useMemo(() => {
    const g = new THREE.CircleGeometry(radius, 32);
    g.rotateX(-Math.PI / 2);  // flat horizontal
    return g;
  }, [radius]);

  const sharedMaterial = useMemo(() => {
    const mat = new MeshBasicNodeMaterial({
      color: new THREE.Color(0xffffff),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const t = timerLocal();
    const u = uv();
    const cu = u.x.sub(0.5);
    const cv = u.y.sub(0.5);
    const dist = cu.mul(cu).add(cv.mul(cv)).sqrt();

    // Two layers of slow-scrolling sin/cos pattern — gives the impression of
    // shifting cloud cells inside the mist.
    const n1 = sin(cu.mul(8.0).add(t.mul(0.5))).mul(cos(cv.mul(8.0).sub(t.mul(0.4))));
    const n2 = sin(cu.mul(20.0).sub(t.mul(0.9))).mul(cos(cv.mul(20.0).add(t.mul(1.1))));
    const noise = n1.mul(0.6).add(n2.mul(0.4)).mul(0.5).add(0.5);  // 0..1

    // Density falls off toward the disc edge so the mist has soft boundaries
    // rather than a hard cylinder shape.
    const edgeFalloff = oneMinus(smoothstep(float(0.35), float(0.5), dist));

    // Centre is denser (where the water actually impacts) than the edges.
    const centerDense = oneMinus(smoothstep(float(0.0), float(0.3), dist));
    const density = edgeFalloff.mul(noise.mul(0.7).add(centerDense.mul(0.3)));

    // Cool magenta-cyan tint to match the scene's neon-dusk palette
    const magentaTint = vec3(0.8, 0.55, 0.85);
    const cyanTint = vec3(0.55, 0.85, 1.0);
    const mistColor = mix(magentaTint, cyanTint, noise);

    mat.colorNode = mistColor;
    mat.opacityNode = density.mul(0.28);  // mist is subtle (28% peak)

    return mat;
  }, []);

  return (
    <group position={position}>
      {Array.from({ length: PLANE_COUNT }).map((_, i) => {
        const y = (i / (PLANE_COUNT - 1)) * height;
        return (
          <mesh
            key={i}
            geometry={sharedGeom}
            material={sharedMaterial}
            position={[0, y, 0]}
            frustumCulled={false}
          />
        );
      })}
    </group>
  );
};

export default WaterfallMist;
