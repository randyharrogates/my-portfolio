/** @format */

import React, { useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { applyStandardLandmarkMaterials } from "./landmarkMaterialPipeline.ts";

const HUB_CLOUDS_GLB = `${process.env.PUBLIC_URL}/models/hall/hub-clouds.glb`;
useGLTF.preload(HUB_CLOUDS_GLB);

interface CloudSeaProps {
  /** Halves cloud count on low fidelity. */
  lowFidelity: boolean;
  /** Reduced-motion mode disables drift animation. */
  staticMode: boolean;
}

/** Cloud sea — Genshin Sea-of-Clouds dense belt around+below the disc.
 *
 *  Author 2026-05-17 in `blender/hall-master.blend`. The GLB ships one
 *  puffy cumulus primitive (~280 verts, 7 smooth-shaded clustered
 *  icospheres). At runtime we instance it 330 times (high fidelity) /
 *  165 times (low fidelity) in three layers:
 *
 *    - Floor:  200 / 100 instances at r=[20,180], y=[-25,-10] — dense
 *              occluder so the void below the disc isn't visible.
 *    - Side:   100 / 50  instances at r=[65,150], y=[-10,+2]  — wraps
 *              around the disc rim.
 *    - Upper:   30 / 15  instances at r=[70,130], y=[+2,+8]   — sparse
 *              parallax stragglers above disc level.
 *
 *  Animation: each cloud drifts +x at 0.05 m/s, wrapping at r=200 back
 *  to r=-200 so the belt looks like a continuous moving sea. Drift is
 *  done in `useFrame` updating per-instance matrix; static mode skips
 *  the update so reduced-motion is respected. */
const CloudSea: React.FC<CloudSeaProps> = ({ lowFidelity, staticMode }) => {
  const { scene } = useGLTF(HUB_CLOUDS_GLB) as unknown as {
    scene: THREE.Group;
  };
  const instancedRef = useRef<THREE.InstancedMesh>(null);

  const { instancedMesh } = useMemo(() => {
    const root = scene.clone(true);
    applyStandardLandmarkMaterials(root);

    let cloudMesh: THREE.Mesh | null = null;
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if ((mesh as unknown as { isMesh?: boolean }).isMesh) {
        cloudMesh = mesh;
      }
    });
    if (!cloudMesh) {
      return { instancedMesh: null, basePositions: [] as THREE.Vector3[] };
    }

    type Layer = {
      count: number;
      rMin: number;
      rMax: number;
      zMin: number;
      zMax: number;
      scaleMin: number;
      scaleMax: number;
    };
    const HI_LAYERS: Layer[] = [
      { count: 200, rMin: 20,  rMax: 180, zMin: -25, zMax: -10, scaleMin: 2.5, scaleMax: 7.0 },
      { count: 100, rMin: 65,  rMax: 150, zMin: -10, zMax: 2,   scaleMin: 2.0, scaleMax: 5.0 },
      { count: 30,  rMin: 70,  rMax: 130, zMin: 2,   zMax: 8,   scaleMin: 1.5, scaleMax: 3.0 },
    ];
    const LO_LAYERS: Layer[] = HI_LAYERS.map((l) => ({
      ...l,
      count: Math.floor(l.count / 2),
    }));
    const layers = lowFidelity ? LO_LAYERS : HI_LAYERS;
    const totalCount = layers.reduce((s, l) => s + l.count, 0);

    // Deterministic PRNG (Mulberry32)
    const rand = (() => {
      let state = 2027;
      return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })();

    const inst = new THREE.InstancedMesh(
      (cloudMesh as THREE.Mesh).geometry,
      (cloudMesh as THREE.Mesh).material as THREE.Material,
      totalCount,
    );
    inst.name = "cloud_sea_instanced";
    inst.frustumCulled = false;
    // Push behind the disc so foreground geometry occludes correctly
    inst.renderOrder = -1;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scaleVec = new THREE.Vector3();
    const yAxis = new THREE.Vector3(0, 1, 0);
    const positions: THREE.Vector3[] = [];

    let idx = 0;
    for (const layer of layers) {
      for (let i = 0; i < layer.count; i++) {
        const ang = rand() * Math.PI * 2;
        const r = layer.rMin + rand() * (layer.rMax - layer.rMin);
        const z = layer.zMin + rand() * (layer.zMax - layer.zMin);
        const x = Math.cos(ang) * r;
        const y = Math.sin(ang) * r;
        const scale = layer.scaleMin + rand() * (layer.scaleMax - layer.scaleMin);
        const rotY = rand() * Math.PI * 2;
        // Blender (x, y, z) → three.js (x, z, -y)
        position.set(x, z, -y);
        quat.setFromAxisAngle(yAxis, rotY);
        scaleVec.set(scale, scale, scale);
        matrix.compose(position, quat, scaleVec);
        inst.setMatrixAt(idx, matrix);
        positions.push(position.clone());
        idx++;
      }
    }
    inst.instanceMatrix.needsUpdate = true;

    return { instancedMesh: inst, basePositions: positions };
  }, [scene, lowFidelity]);

  // Drift animation: each cloud moves +x slowly, wrapping at 200 → -200
  useFrame((_, delta) => {
    if (staticMode || !instancedRef.current || !instancedMesh) return;
    const driftSpeed = 0.05;
    const wrapDist = 400; // cycle distance
    const tempMatrix = new THREE.Matrix4();
    const tempPos = new THREE.Vector3();
    const tempQuat = new THREE.Quaternion();
    const tempScale = new THREE.Vector3();
    const mesh = instancedRef.current;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, tempMatrix);
      tempMatrix.decompose(tempPos, tempQuat, tempScale);
      tempPos.x += driftSpeed * delta;
      if (tempPos.x > 200) tempPos.x -= wrapDist;
      tempMatrix.compose(tempPos, tempQuat, tempScale);
      mesh.setMatrixAt(i, tempMatrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!instancedMesh) return null;
  // Use a key to force re-mount when fidelity changes
  return <primitive object={instancedMesh} ref={instancedRef} />;
};

export default CloudSea;
