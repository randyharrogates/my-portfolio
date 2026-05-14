/** @format */

import React, { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { MeshStandardNodeMaterial } from "three/webgpu";
import { buildPhotorealWater } from "./photorealWater.ts";

// Re-export so this file doesn't lose the type-check on MeshStandardNodeMaterial
// (still used implicitly through buildPhotorealWater's return type).
void MeshStandardNodeMaterial;

interface WaterfallTSLProps {
  /** World position where the waterfall's BASE sits. */
  position: [number, number, number];
}

const MODEL_PATH = `${process.env.PUBLIC_URL}/models/hall/waterfall-tsl.glb`;
const NORMAL_MAP_PATH = `${process.env.PUBLIC_URL}/models/hall/landmarks/waterfall_water_normal.png`;
useGLTF.preload(MODEL_PATH);

/** TSL-shaded waterfall — high-poly curved sheet authored in Blender
 *  (~5k verts, 4×36m). Replaces the runtime cylinder + the
 *  WaterfallVideo billboard. Material override happens in useMemo so
 *  WebGPU sees the new TSL material on first render, not the imported
 *  Principled-BSDF default. v1 uses procedural flow; v2 will sample a
 *  FLIP-baked flow texture for real fluid dynamics. */
const WaterfallTSL: React.FC<WaterfallTSLProps> = ({ position }) => {
  const gltf = useGLTF(MODEL_PATH) as unknown as { scene: THREE.Group };
  const normalMap = useLoader(THREE.TextureLoader, NORMAL_MAP_PATH);
  normalMap.flipY = false;
  normalMap.colorSpace = THREE.NoColorSpace;
  // Clone so HMR / re-renders don't see our previously-mutated material
  // (same pattern as UpperIsland.tsx).
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  // === UNIFIED PHOTOREAL WATER (locked 2026-05-14) ===
  // The waterfall now uses the same `buildPhotorealWater` factory as the
  // source pool + flow ribbon + landing pool. Normal map is baked from
  // the BlenderKit "Animated water, river and waterfall" Cycles material.
  // Flow mode = vertical-down → UVs scroll V-axis with fast cascade speed.
  // splashAtBase = true → intense foam mask below v=0.78.
  useMemo(() => {
    const mat = buildPhotorealWater({
      normalMap,
      flow: "vertical-down",
      tile: 1.8,
      scrollSpeed: 1.3,
      emissionStrength: 0.55,
      splashAtBase: true,
    });

    // Apply to every imported mesh
    scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!(m as unknown as { isMesh?: boolean }).isMesh) return;
      m.material = mat;
      m.castShadow = false;
      m.receiveShadow = false;
    });

    return mat;
  }, [scene, normalMap]);

  return <primitive object={scene} position={position} />;
};

export default WaterfallTSL;
