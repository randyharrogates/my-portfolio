/** @format */

import React, { useMemo } from "react";
import * as THREE from "three";
import {
  abs,
  cos,
  float,
  floor,
  hash,
  mix,
  oneMinus,
  pow,
  sin,
  smoothstep,
  timerLocal,
  uv,
  vec3,
} from "three/tsl";
import { MeshStandardNodeMaterial } from "three/webgpu";

interface SkillsRiverProps {
  /** World position the river is mounted at — POI[2] so waypoints are
   *  island-local. */
  position: [number, number, number];
}

/** Build a flat-ribbon geometry following a smooth Catmull-Rom curve
 *  through the given landmark-local waypoints. Each centerline point
 *  spawns two vertices (left + right edge) so the ribbon has proper
 *  width, plus a UV mapping where u flows along-river (0 at source,
 *  1 at exit) and v spans across-river (0 = left bank, 1 = right). */
function buildRiverGeometry(): THREE.BufferGeometry {
  // Landmark-local waypoints. River starts at the waterfall base
  // (local x=-3, just west of the plunge pool), curves NE around the
  // forge platform (which now sits at local (5..11, *, -14..-6) after
  // relocation), and exits the eastern edge of the island. Constant
  // Y=0.18 sits clearly above the y=0 ground plane.
  const waypoints: THREE.Vector3[] = [
    new THREE.Vector3(-3, 0.18, -0.5),
    new THREE.Vector3(0, 0.18, -0.5),
    new THREE.Vector3(3, 0.18, 0.5),
    new THREE.Vector3(7, 0.18, 1.5),
    new THREE.Vector3(11, 0.18, 0.5),
    new THREE.Vector3(15, 0.18, -1),
    new THREE.Vector3(18, 0.18, -2),
  ];
  const curve = new THREE.CatmullRomCurve3(
    waypoints,
    false,
    "catmullrom",
    0.5
  );

  const samples = 80;
  const points: THREE.Vector3[] = [];
  const tangents: THREE.Vector3[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    points.push(curve.getPoint(t));
    tangents.push(curve.getTangent(t));
  }

  // River widens slightly mid-stream and narrows at both ends — gives
  // the ribbon a natural "spring → wide pool → tail" silhouette.
  function widthAt(t: number): number {
    const widen = 1.0 - Math.pow(Math.abs(t - 0.5) * 2, 1.2);
    return 1.4 + widen * 1.2;
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const tan = tangents[i];
    // Perpendicular in XZ plane (rotate tangent 90° around Y axis).
    const perpX = -tan.z;
    const perpZ = tan.x;
    const len = Math.hypot(perpX, perpZ) || 1;
    const px = perpX / len;
    const pz = perpZ / len;

    const t = i / (points.length - 1);
    const w = widthAt(t);

    positions.push(p.x + px * w * 0.5, p.y, p.z + pz * w * 0.5);
    positions.push(p.x - px * w * 0.5, p.y, p.z - pz * w * 0.5);
    uvs.push(t, 0);
    uvs.push(t, 1);
  }

  for (let i = 0; i < points.length - 1; i++) {
    const v0 = i * 2;
    const v1 = i * 2 + 1;
    const v2 = (i + 1) * 2;
    const v3 = (i + 1) * 2 + 1;
    indices.push(v0, v2, v1);
    indices.push(v1, v2, v3);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** TSL water material for the river ribbon. Stacks multiple effects
 *  for a non-flat read:
 *    - Multi-octave wave noise scrolling along +u (flow direction)
 *    - Caustic streaks (pow of combined waves) for bright moving lines
 *    - Foam patches (hash-based) that pop in and out near wave crests
 *    - Bank shading: darker + more transparent near v=0 and v=1
 *    - Subtle moss-green tint at the very edges (where plants grow)
 *  Self-emission baseline (0.45) so the river reads even with no
 *  scene light reaching it. */
function buildRiverMaterial(): MeshStandardNodeMaterial {
  const mat = new MeshStandardNodeMaterial({
    color: new THREE.Color(0xffffff),
    roughness: 0.10,
    metalness: 0.0,
    transparent: true,
  });

  const t = timerLocal();
  const u0 = uv().x;
  const v0 = uv().y;

  // Scroll u backwards (so positive flow direction is +u) at moderate speed.
  const flow = t.mul(0.32);
  const scrolledU = u0.sub(flow);

  // Wave envelope: three octaves at increasing frequencies.
  const wave1 = sin(scrolledU.mul(28).add(v0.mul(7))).mul(0.5).add(0.5);
  const wave2 = sin(scrolledU.mul(72).sub(v0.mul(11)).add(t.mul(1.8)))
    .mul(0.5)
    .add(0.5);
  const wave3 = sin(scrolledU.mul(150).add(t.mul(2.6))).mul(0.5).add(0.5);
  const waveCombined = wave1.mul(0.42).add(wave2.mul(0.34)).add(wave3.mul(0.24));

  // Cross-flow ripple modulation so the wave streaks don't read as
  // perfectly straight stripes.
  const crossRipple = cos(v0.mul(18).add(scrolledU.mul(6))).mul(0.5).add(0.5);
  const waveModulated = waveCombined.mul(crossRipple.mul(0.6).add(0.4));

  // Caustics: bright streaks on wave crests.
  const causticMask = pow(waveModulated, float(2.3));

  // Foam patches: sparser, white bursts that move with the flow.
  const foamCellsU = floor(scrolledU.mul(18));
  const foamCellsV = floor(v0.mul(14).add(t.mul(0.4)));
  const foamSeed = foamCellsU.add(foamCellsV.mul(18));
  const foamRand = hash(foamSeed);
  const foamMask = smoothstep(float(0.82), float(0.97), foamRand);

  // Bank mask: 0 at center (v=0.5), 1 at edges (v=0 or v=1).
  const edgeMask = abs(v0.sub(0.5)).mul(2);
  const centerMask = oneMinus(pow(edgeMask, float(1.5)));

  // Palette stops.
  const deepBlue = vec3(0.03, 0.10, 0.28);
  const midBlue = vec3(0.09, 0.32, 0.58);
  const lightBlue = vec3(0.36, 0.70, 1.10);
  const foamColor = vec3(0.95, 1.00, 1.05);
  const bankMoss = vec3(0.08, 0.20, 0.10);

  // Build colour: dark at banks → mid-blue centre → light-blue crests → white foam.
  const banksColored = mix(deepBlue, midBlue, centerMask);
  const caustic = mix(banksColored, lightBlue, causticMask.mul(0.65));
  const foamed = mix(caustic, foamColor, foamMask.mul(0.85));

  // Subtle moss tint near the banks (the river's bed catches mossy growth).
  const colored = mix(foamed, foamed.add(bankMoss), edgeMask.mul(0.25));

  mat.colorNode = colored;
  mat.emissiveNode = colored.mul(0.45);
  // Alpha higher in the centre, softer at the banks for edge falloff.
  mat.opacityNode = mix(float(0.55), float(0.95), centerMask);
  mat.transparent = true;
  mat.depthWrite = false;
  return mat;
}

/** Procedural river that flows from the base of the /hall/skills
 *  waterfall outward, exiting the east edge of the island. Single
 *  flat ribbon geometry following a smooth Catmull-Rom path; the
 *  TSL water material handles the flow animation + caustics + foam
 *  + bank shading so the surface reads as moving water, not a flat
 *  blue painted strip. Authored in React for fast iteration — can
 *  be re-baked into the GLB later if we want it shadow-cast against
 *  the rest of the island. */
const SkillsRiver: React.FC<SkillsRiverProps> = ({ position }) => {
  const geometry = useMemo(() => buildRiverGeometry(), []);
  const material = useMemo(() => buildRiverMaterial(), []);

  return (
    <mesh position={position}>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

export default SkillsRiver;
