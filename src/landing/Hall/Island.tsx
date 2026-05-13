/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { MeshStandardNodeMaterial } from "three/webgpu";
import { useKTX2Compat } from "./useKTX2Compat.ts";

const ISLAND_HUB_GLB = `${process.env.PUBLIC_URL}/models/hall/island-hub.glb`;
const BASIS_PATH = `${process.env.PUBLIC_URL}/basis/`;
const ISLAND_AO_KTX2 = `${process.env.PUBLIC_URL}/textures/hall/baked/ao/island-hub.ktx2`;
const ISLAND_LM_KTX2 = `${process.env.PUBLIC_URL}/textures/hall/baked/lightmap/island-hub.ktx2`;
useGLTF.preload(ISLAND_HUB_GLB);

/** Hub island — floating rock platter, archipelago centerpiece. GLB
 *  geometry + Cycles-baked AO (1024², ~100 KB KTX2) + Cycles-baked
 *  lightmap (1024², ~93 KB KTX2). Both maps share UV channel 1.
 *
 *  AO darkens the displaced rock crevices when the runtime IBL hits the
 *  surface. Lightmap encodes the offline daylight bake (HOSEK sky + warm
 *  sun key from above-right) — a pre-shaded layer that multiplies into
 *  the diffuse, giving the dark rock subtle warmth on the rim and a
 *  cooler fall-off on the spire underside that pure runtime IBL wouldn't
 *  capture cheaply.
 *
 *  Island top face rests at world y = 0; rock extends ~30 m outward and
 *  ~18 m below. */
const Island: React.FC = () => {
  const { scene } = useGLTF(ISLAND_HUB_GLB) as unknown as {
    scene: THREE.Group;
  };
  const aoMap = useKTX2Compat(ISLAND_AO_KTX2, BASIS_PATH);
  const lightMap = useKTX2Compat(ISLAND_LM_KTX2, BASIS_PATH);

  const rockMaterial = useMemo(() => {
    aoMap.colorSpace = THREE.NoColorSpace;
    aoMap.flipY = false;
    aoMap.needsUpdate = true;
    lightMap.colorSpace = THREE.SRGBColorSpace;
    lightMap.flipY = false;
    lightMap.needsUpdate = true;
    return new MeshStandardNodeMaterial({
      // Warmer, lighter grey-purple so the rock silhouette reads
      // distinct from the skybox's dark lower hemisphere even when
      // viewed from above (where direct lights don't hit the top
      // surfaces).
      color: new THREE.Color("#6a5575"),
      roughness: 0.9,
      metalness: 0.05,
      aoMap,
      aoMapIntensity: 1.0,
      lightMap,
      lightMapIntensity: 1.6,
    });
  }, [aoMap, lightMap]);

  const cloned = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.material = rockMaterial;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });
    return root;
  }, [scene, rockMaterial]);

  // Phase 6 — hub island scaled up so each of the six themed
  // landmarks (house, satellite, waterfall, tree, garden, entrance)
  // has its own zone without crowding. Authored radius was ~28 m; at
  // 2.0× the platter spans ~56 m which lets the landmarks read as
  // distinct districts rather than props on a side-table. Rebuilding
  // the GLB at the larger native scale is a backlog item; for now the
  // displacement detail just reads bigger, which is fine for a
  // stylised look.
  return <primitive object={cloned} scale={2.0} />;
};

export default Island;
