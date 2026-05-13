/** @format */

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  abs,
  cos,
  float,
  mix,
  normalView,
  oneMinus,
  positionLocal,
  positionViewDirection,
  pow,
  sin,
  timerLocal,
  vec3,
} from "three/tsl";
import { MeshStandardNodeMaterial } from "three/webgpu";

interface WaterfallFoamProps {
  /** World position where the foam cluster centres (typically the
   *  bottom of the waterfall, at the plunge-pool surface). */
  position: [number, number, number];
}

/** Procedural foam cluster — 7 overlapping spheres of varying size +
 *  position around the waterfall base. Each sphere uses a TSL animated
 *  material: soft puffy noise that breathes in/out, semi-transparent
 *  with fresnel-driven edge softness. Drives the "soft white cloud"
 *  look at the bottom of the waterfall in jordan-breton-style refs.
 *
 *  Sits beside the SkillsLandmark in the scene graph at world
 *  coordinates — independent of the GLB so we don't need to round-trip
 *  Blender to tune it. */
const WaterfallFoam: React.FC<WaterfallFoamProps> = ({ position }) => {
  const groupRef = useRef<THREE.Group>(null);

  // 4 overlapping puff spheres positioned in a tight cluster at the
  // base of the waterfall. Smaller + fewer than before (was 7+1) so the
  // pool's baked centre-foam-blast reads underneath instead of being
  // completely occluded by foam. The pool now provides the continuous
  // foam patch via its 1024² baked colour map; these puffs are just
  // the volumetric "impact cloud" on top.
  const puffs = useMemo(() => {
    const arr: Array<{
      pos: [number, number, number];
      radius: number;
      phaseSeed: number;
    }> = [];
    const RING = 3;
    for (let i = 0; i < RING; i++) {
      const angle = (i / RING) * Math.PI * 2;
      const ringR = 0.8; // tight ring close to impact
      const x = Math.cos(angle) * ringR;
      const z = Math.sin(angle) * ringR;
      const y = 0.35 + (i % 2) * 0.18;
      const radius = 0.65 + ((i * 7) % 4) * 0.10;
      arr.push({
        pos: [x, y, z],
        radius,
        phaseSeed: i * 0.7,
      });
    }
    // Centre puff (sits right under the waterfall impact, slightly raised)
    arr.push({ pos: [0, 0.55, 0], radius: 0.95, phaseSeed: 0.3 });
    return arr;
  }, []);

  // Shared TSL material — puffy white with subtle animated noise +
  // fresnel-driven edge softness so the spheres don't read as hard
  // billiard balls.
  const foamMaterial = useMemo(() => {
    const mat = new MeshStandardNodeMaterial({
      color: new THREE.Color(1.0, 1.05, 1.1),
      roughness: 0.9,
      metalness: 0.0,
    });

    const t = timerLocal();
    // Use positionLocal for the noise (each puff has its own local space)
    const px = positionLocal.x;
    const py = positionLocal.y;
    const pz = positionLocal.z;

    // Animated noise — slow breathing pattern
    const noise = sin(px.mul(5).add(t.mul(1.0)))
      .add(cos(py.mul(4).add(t.mul(0.8))))
      .add(sin(pz.mul(3.5).add(t.mul(1.3))))
      .mul(0.16).add(0.5);

    // Fresnel: foam fades softly at the silhouette edges of each sphere
    const cosTheta = abs(normalView.dot(positionViewDirection));
    const fresnel = pow(oneMinus(cosTheta), float(1.4));

    const baseWhite = vec3(0.92, 0.97, 1.05);
    const brightWhite = vec3(1.10, 1.13, 1.18);
    const color = mix(baseWhite, brightWhite, noise);

    mat.colorNode = color;
    mat.emissiveNode = color.mul(0.4);
    // Opacity drops at edges (soft cloud silhouette)
    mat.opacityNode = mix(float(0.85), float(0.25), fresnel);
    mat.transparent = true;
    mat.depthWrite = false;

    return mat;
  }, []);

  // Gentle drift animation — each puff bobs slightly so the cluster
  // doesn't look static.
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const seed = puffs[i]?.phaseSeed ?? 0;
      const bob = Math.sin(t * 0.8 + seed) * 0.08;
      child.position.y = (puffs[i]?.pos[1] ?? 0) + bob;
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {puffs.map((puff, i) => (
        <mesh key={i} position={puff.pos}>
          <sphereGeometry args={[puff.radius, 14, 10]} />
          <primitive object={foamMaterial} attach="material" />
        </mesh>
      ))}
    </group>
  );
};

export default WaterfallFoam;
