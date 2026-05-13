/** @format */

import React, { useMemo } from "react";
import * as THREE from "three";
import {
  clamp,
  float,
  mix,
  positionLocal,
  vec3,
  vertexColor,
} from "three/tsl";
import { MeshStandardNodeMaterial } from "three/webgpu";

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

// Rocks scattered across the island — bumped from 4 to 12 per user.
const ROCKS: PropPlacement[] = [
  { x: 9, z: 2, scale: 0.5 },
  { x: 14, z: -6, scale: 0.6 },
  { x: 7, z: -1, scale: 0.4 },
  { x: 13, z: -12, scale: 0.55 },
  { x: 3, z: 6, scale: 0.45 },
  { x: 6, z: -8, scale: 0.5 },
  { x: 11, z: 5, scale: 0.4 },
  { x: -1, z: 2, scale: 0.55 },
  { x: 17, z: -4, scale: 0.6 },
  { x: 10, z: -16, scale: 0.5 },
  { x: -3, z: -4, scale: 0.45 },
  { x: 18, z: 0, scale: 0.55 },
];

/** Deterministic per-vertex random colour — same recipe as
 *  AboutLandmark.tsx / SkillsLandmark.tsx. Gives within-mesh
 *  weathering variation. */
function vertexNoiseColor(
  seed: number,
  amplitude: number,
  hueDrift: number
): THREE.Color {
  const v = ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1;
  const h = ((Math.sin(seed * 7.5713) * 17439.123) % 1 + 1) % 1;
  const value = 1.0 + (v - 0.5) * 2.0 * amplitude;
  const drift = (h - 0.5) * 2.0 * hueDrift;
  return new THREE.Color(value + drift, value, value - drift);
}

function injectVertexNoise(
  geometry: THREE.BufferGeometry,
  amplitude: number,
  hueDrift: number,
  seedOffset: number
) {
  const positions = geometry.getAttribute("position");
  if (!positions) return;
  const vertCount = positions.count;
  const colors = new Float32Array(vertCount * 3);
  for (let i = 0; i < vertCount; i++) {
    const c = vertexNoiseColor(i + seedOffset, amplitude, hueDrift);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/** Build a Standard node material with three-stop vertical gradient
 *  along mesh-local Y, multiplied by per-vertex injected colour for
 *  within-mesh variation, with 40 % self-emission so the prop reads
 *  even without scene lights reaching it. */
function buildGradientMaterial(opts: {
  shadow: [number, number, number];
  mid: [number, number, number];
  light: [number, number, number];
  yScale?: number;
}): MeshStandardNodeMaterial {
  const yScale = opts.yScale ?? 0.5;
  const heightT = clamp(
    positionLocal.y.mul(yScale).add(0.5),
    float(0),
    float(1)
  );
  const shadow = vec3(...opts.shadow);
  const mid = vec3(...opts.mid);
  const light = vec3(...opts.light);
  const tier1 = mix(shadow, mid, heightT);
  const tier2 = mix(tier1, light, heightT.mul(heightT).mul(0.55));
  const colored = tier2.mul(vertexColor);

  const mat = new MeshStandardNodeMaterial({
    color: new THREE.Color(0xffffff),
    roughness: 0.95,
    metalness: 0.0,
    vertexColors: true,
  });
  mat.colorNode = colored;
  mat.emissiveNode = colored.mul(0.40);
  return mat;
}

/** Stylized low-poly greenery scattered around the /hall/skills island
 *  — fir-style cone trees, capsule bushes, octahedron rocks. Each
 *  prop has its own geometry instance with per-vertex random colour
 *  injected so the same material reads with within-mesh weathering
 *  variation. Materials use MeshStandardNodeMaterial with TSL
 *  vertical-gradient colorNode + emissive baseline + vertex-color
 *  multiply — same /about recipe so the props match that scene's
 *  bake-lit look without needing a Blender round-trip. */
const SkillsGreenery: React.FC<SkillsGreeneryProps> = ({ position }) => {
  // Per-tree geometries so each tree gets its own noise pattern.
  const treeAssets = useMemo(
    () =>
      TREES.map((_, i) => {
        const trunk = new THREE.CylinderGeometry(0.14, 0.20, 0.8, 6);
        injectVertexNoise(trunk, 0.18, 0.04, 211 + i * 17);
        const leaves = new THREE.ConeGeometry(0.85, 2.2, 8);
        injectVertexNoise(leaves, 0.22, 0.07, 113 + i * 23);
        return { trunk, leaves };
      }),
    []
  );

  const bushGeometries = useMemo(
    () =>
      BUSHES.map((_, i) => {
        const g = new THREE.SphereGeometry(0.55, 10, 8);
        injectVertexNoise(g, 0.22, 0.06, 311 + i * 19);
        return g;
      }),
    []
  );

  const rockGeometries = useMemo(
    () =>
      ROCKS.map((_, i) => {
        // Subdivision=1 gives more vertices for finer noise patches.
        const g = new THREE.OctahedronGeometry(0.55, 1);
        injectVertexNoise(g, 0.30, 0.05, 411 + i * 13);
        return g;
      }),
    []
  );

  // Materials (shared across same-type props — variation comes from
  // each mesh's per-vertex colour, not from separate materials).
  const trunkMat = useMemo(
    () =>
      buildGradientMaterial({
        shadow: [0.18, 0.10, 0.06],
        mid: [0.32, 0.20, 0.13],
        light: [0.45, 0.30, 0.18],
        yScale: 0.6,
      }),
    []
  );

  const leavesMat = useMemo(
    () =>
      buildGradientMaterial({
        shadow: [0.06, 0.22, 0.10],
        mid: [0.16, 0.40, 0.20],
        light: [0.34, 0.62, 0.32],
        yScale: 0.45,
      }),
    []
  );

  const bushMat = useMemo(
    () =>
      buildGradientMaterial({
        shadow: [0.10, 0.28, 0.14],
        mid: [0.20, 0.46, 0.24],
        light: [0.30, 0.58, 0.32],
        yScale: 0.7,
      }),
    []
  );

  const rockMat = useMemo(
    () =>
      buildGradientMaterial({
        shadow: [0.20, 0.20, 0.22],
        mid: [0.40, 0.40, 0.42],
        light: [0.58, 0.58, 0.60],
        yScale: 0.8,
      }),
    []
  );

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
            <primitive object={treeAssets[i].trunk} attach="geometry" />
            <primitive object={trunkMat} attach="material" />
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <primitive object={treeAssets[i].leaves} attach="geometry" />
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
          <primitive object={bushGeometries[i]} attach="geometry" />
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
          <primitive object={rockGeometries[i]} attach="geometry" />
          <primitive object={rockMat} attach="material" />
        </mesh>
      ))}
    </group>
  );
};

export default SkillsGreenery;
