/** @format */

import React, { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { MeshStandardNodeMaterial } from "three/webgpu";
import { texture, uv } from "three/tsl";
import { buildPhotorealWater } from "./photorealWater.ts";

interface UpperIslandProps {
  /** World position where the landmark origin is mounted (POI[2] x,0,z). */
  position: [number, number, number];
}

const MODEL_PATH = `${process.env.PUBLIC_URL}/models/hall/landmarks/upper-island.glb`;
const BAKED_DIFFUSE_PATH = `${process.env.PUBLIC_URL}/models/hall/landmarks/upper-island-baked.png`;
const BAKED_EMIT_PATH = `${process.env.PUBLIC_URL}/models/hall/landmarks/upper-island-emit.png`;
const POOL_NORMAL_PATH = `${process.env.PUBLIC_URL}/models/hall/landmarks/pool_water_normal.png`;
const WATERFALL_NORMAL_PATH = `${process.env.PUBLIC_URL}/models/hall/landmarks/waterfall_water_normal.png`;
useGLTF.preload(MODEL_PATH);

/** Witcher 2-tier upper floating island authored in
 *  blender/skills-cliff.blend on 2026-05-14. Replaces the elevated
 *  portion of skl_ground_merged inside landmark-skills.glb (which was a
 *  flat-colour low-poly dark blob). Saucer silhouette: wide rocky
 *  plateau on top with a pool basin near the east edge, hanging
 *  stalactite-like underside, projecting outcrop on the east face. The
 *  diffuse map is a Cycles bake of Polyhaven aerial_rocks_02 textures
 *  blended with procedural cyan vibranium emissive veins; the emit map
 *  is the same vein pattern, used as an additive emission node for the
 *  glow accent. */
const UpperIsland: React.FC<UpperIslandProps> = ({ position }) => {
  const gltf = useGLTF(MODEL_PATH) as unknown as { scene: THREE.Group };
  // Load the baked textures separately — we can't read them off the GLB
  // material because drei caches the scene and our useMemo would see a
  // previously-replaced TSL material (with no .map/.emissiveMap) on HMR.
  const bakedMap = useLoader(THREE.TextureLoader, BAKED_DIFFUSE_PATH);
  const emitMap = useLoader(THREE.TextureLoader, BAKED_EMIT_PATH);
  const poolNormalMap = useLoader(THREE.TextureLoader, POOL_NORMAL_PATH);
  const waterfallNormalMap = useLoader(THREE.TextureLoader, WATERFALL_NORMAL_PATH);
  // GLB exports with flipY=false (UVs already V-flipped at export time);
  // useLoader returns flipY=true by default, so flip back to match the bake.
  bakedMap.flipY = false;
  bakedMap.colorSpace = THREE.SRGBColorSpace;
  emitMap.flipY = false;
  emitMap.colorSpace = THREE.SRGBColorSpace;
  poolNormalMap.flipY = false;
  poolNormalMap.colorSpace = THREE.NoColorSpace;
  waterfallNormalMap.flipY = false;
  waterfallNormalMap.colorSpace = THREE.NoColorSpace;

  // Clone the scene so HMR / re-renders don't reuse an already-mutated copy.
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  // Material override happens synchronously in useMemo so WebGPU compiles
  // the TSL material on first render (same pattern as WaterfallTSL).
  useMemo(() => {
    scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!(m as unknown as { isMesh?: boolean }).isMesh) return;

      const lowerName = m.name.toLowerCase();

      // === Flow ribbon — photoreal water flowing east across plateau ===
      if (lowerName.includes("flow_ribbon")) {
        m.material = buildPhotorealWater({
          normalMap: poolNormalMap,
          flow: "horizontal-east",
          tile: 2.5,
          scrollSpeed: 1.2,
          emissionStrength: 0.50,
        });
        m.castShadow = false;
        m.receiveShadow = false;
        return;
      }

      // === Source pool — photoreal calm water with radial ripple ===
      if (lowerName.includes("source_pool") || lowerName.includes("pool_surface")) {
        m.material = buildPhotorealWater({
          normalMap: poolNormalMap,
          flow: "radial-out",
          tile: 2.0,
          scrollSpeed: 0.6,
          emissionStrength: 0.55,
        });
        m.castShadow = false;
        m.receiveShadow = false;
        return;
      }

      // === Rocky island body — baked diffuse + vibranium emit ===
      const mat = new MeshStandardNodeMaterial({
        color: new THREE.Color(0xffffff),
        roughness: 0.85,
        metalness: 0.0,
      });
      const colorSample = texture(bakedMap, uv());
      mat.colorNode = colorSample;
      // Baseline self-emission at 0.35 so the rock reads even when the
      // neon-dusk directional rig doesn't reach it (same recipe as
      // AboutLandmark / ProjectsLandmark for baked diffuse).
      // Plus additive cyan-vein emission at low strength — the bake is
      // intentionally dense so the runtime multiplier should be subtle
      // (0.35×) or the whole surface reads as a solid cyan glow.
      const emitSample = texture(emitMap, uv());
      // @ts-expect-error - TSL nodes support arithmetic via .add()
      mat.emissiveNode = colorSample.mul(0.35).add(emitSample.mul(0.35));

      m.material = mat;
      m.castShadow = false;
      m.receiveShadow = false;
    });
  }, [scene, bakedMap, emitMap, poolNormalMap, waterfallNormalMap]);

  return <primitive object={scene} position={position} />;
};

export default UpperIsland;
