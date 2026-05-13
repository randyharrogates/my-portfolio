/** @format */

import React, { useMemo } from "react";
import { clamp, float, mix, positionLocal, vec3 } from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";

interface SkillsGreeneryProps {
  /** World position the prop group is mounted at — typically POI[2]
   *  so each prop's authored offset is "island-local". */
  position: [number, number, number];
}

interface PropPlacement {
  x: number;
  z: number;
  scale: number;
}

const TREES: PropPlacement[] = [
  { x: 12, z: -2, scale: 1.2 },
  { x: 14, z: -10, scale: 1.4 },
  { x: 4, z: 8, scale: 1.0 },
  { x: 16, z: 5, scale: 1.1 },
  { x: -2, z: 10, scale: 0.9 },
];

const BUSHES: PropPlacement[] = [
  { x: 10, z: 0, scale: 0.7 },
  { x: 13, z: -4, scale: 0.6 },
  { x: 15, z: -8, scale: 0.5 },
  { x: 8, z: 3, scale: 0.6 },
  { x: 5, z: -2, scale: 0.55 },
  { x: 11, z: -13, scale: 0.65 },
];

const ROCKS: PropPlacement[] = [
  { x: 9, z: 2, scale: 0.5 },
  { x: 14, z: -6, scale: 0.6 },
  { x: 7, z: -1, scale: 0.4 },
  { x: 13, z: -12, scale: 0.55 },
];

/** Stylized low-poly greenery scattered around the /hall/skills island
 *  — fir-style cone trees, capsule bushes, octahedron rocks. Authored
 *  in React (not Blender) for fast iteration on placement; can be
 *  re-baked as a Blender pass later if the user wants the same
 *  flat-shaded look unified with the rest of the GLB. Materials use
 *  `MeshBasicNodeMaterial` so they self-illuminate without depending
 *  on the dim neon-dusk scene lighting that swallowed the prior
 *  baked-stone forge surfaces. */
const SkillsGreenery: React.FC<SkillsGreeneryProps> = ({ position }) => {
  const trunkMat = useMemo(() => {
    const m = new MeshBasicNodeMaterial();
    m.colorNode = vec3(0.32, 0.20, 0.13);
    return m;
  }, []);

  const leavesMat = useMemo(() => {
    const m = new MeshBasicNodeMaterial();
    // Vertical gradient: darker green at the base of the cone,
    // lighter green near the tip — reads as "fir tree with light
    // catching the top." Clamp so out-of-range mesh-local Y values
    // (the geometry sits in [-1.1, +1.1] local) don't extrapolate
    // past the gradient endpoints.
    const heightT = clamp(positionLocal.y.mul(0.5).add(0.5), float(0), float(1));
    const dark = vec3(0.10, 0.32, 0.16);
    const light = vec3(0.28, 0.58, 0.30);
    m.colorNode = mix(dark, light, heightT);
    return m;
  }, []);

  const bushMat = useMemo(() => {
    const m = new MeshBasicNodeMaterial();
    const heightT = clamp(positionLocal.y.mul(0.6).add(0.5), float(0), float(1));
    const darker = vec3(0.16, 0.38, 0.20);
    const lighter = vec3(0.26, 0.52, 0.28);
    m.colorNode = mix(darker, lighter, heightT);
    return m;
  }, []);

  const rockMat = useMemo(() => {
    const m = new MeshBasicNodeMaterial();
    const heightT = clamp(positionLocal.y.mul(0.7).add(0.5), float(0), float(1));
    const shade = vec3(0.30, 0.30, 0.32);
    const lit = vec3(0.52, 0.52, 0.55);
    m.colorNode = mix(shade, lit, heightT);
    return m;
  }, []);

  return (
    <group position={position}>
      {TREES.map((t, i) => (
        <group
          key={`tree-${i}`}
          position={[t.x, 0, t.z]}
          scale={t.scale}
          rotation={[0, (i * 0.7) % (Math.PI * 2), 0]}
        >
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.14, 0.20, 0.8, 6]} />
            <primitive object={trunkMat} attach="material" />
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <coneGeometry args={[0.85, 2.2, 8]} />
            <primitive object={leavesMat} attach="material" />
          </mesh>
        </group>
      ))}
      {BUSHES.map((b, i) => (
        <mesh
          key={`bush-${i}`}
          position={[b.x, 0.3 * b.scale, b.z]}
          scale={[b.scale, b.scale * 0.75, b.scale]}
        >
          <sphereGeometry args={[0.55, 8, 6]} />
          <primitive object={bushMat} attach="material" />
        </mesh>
      ))}
      {ROCKS.map((r, i) => (
        <mesh
          key={`rock-${i}`}
          position={[r.x, 0.18 * r.scale, r.z]}
          scale={r.scale}
          rotation={[i * 0.4, i * 0.9, i * 0.3]}
        >
          <octahedronGeometry args={[0.55, 0]} />
          <primitive object={rockMat} attach="material" />
        </mesh>
      ))}
    </group>
  );
};

export default SkillsGreenery;
