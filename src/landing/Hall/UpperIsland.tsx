/** @format */

import React, { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { MeshStandardNodeMaterial } from "three/webgpu";
import {
  cos,
  float,
  mix,
  pow,
  sin,
  smoothstep,
  texture,
  timerLocal,
  uv,
  vec3,
} from "three/tsl";

interface UpperIslandProps {
  /** World position where the landmark origin is mounted (POI[2] x,0,z). */
  position: [number, number, number];
}

const MODEL_PATH = `${process.env.PUBLIC_URL}/models/hall/landmarks/upper-island.glb`;
const BAKED_DIFFUSE_PATH = `${process.env.PUBLIC_URL}/models/hall/landmarks/upper-island-baked.png`;
const BAKED_EMIT_PATH = `${process.env.PUBLIC_URL}/models/hall/landmarks/upper-island-emit.png`;
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
  // GLB exports with flipY=false (UVs already V-flipped at export time);
  // useLoader returns flipY=true by default, so flip back to match the bake.
  bakedMap.flipY = false;
  bakedMap.colorSpace = THREE.SRGBColorSpace;
  emitMap.flipY = false;
  emitMap.colorSpace = THREE.SRGBColorSpace;

  // Clone the scene so HMR / re-renders don't reuse an already-mutated copy.
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  // Material override happens synchronously in useMemo so WebGPU compiles
  // the TSL material on first render (same pattern as WaterfallTSL).
  useMemo(() => {
    scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!(m as unknown as { isMesh?: boolean }).isMesh) return;

      const lowerName = m.name.toLowerCase();

      // === Pool water surface — TSL animated water disc inside the basin.
      // Concentric ripple rings + caustic glints + foam patch near center
      // where the waterfall would conceptually originate. Same recipe as
      // SkillsLandmark's plunge-pool TSL but tuned for the basin scale. ===
      if (lowerName.includes("source_pool") || lowerName.includes("pool_surface")) {
        const poolMat = new MeshStandardNodeMaterial({
          color: new THREE.Color(0.04, 0.18, 0.45),
          roughness: 0.08,
          metalness: 0.0,
        });
        const t = timerLocal();
        const u = uv();
        const cu = u.x.sub(0.5);
        const cv = u.y.sub(0.5);
        const dist = cu.mul(cu).add(cv.mul(cv)).sqrt();
        // Concentric ripples from center, moving outward
        const ripple = sin(dist.mul(35).sub(t.mul(3.5))).mul(0.5).add(0.5);
        const rippleSoft = pow(ripple, float(2.0));
        // Foam concentrated near the centre — where the water source feeds in
        const foam = smoothstep(float(0.30), float(0.05), dist);
        // Slow rotating caustics — sin/cos around UV centre, time-driven
        const caustic = sin(cu.mul(18).add(t.mul(1.2))).mul(cos(cv.mul(18).sub(t.mul(0.9))));
        const causticGlint = smoothstep(float(0.45), float(0.95), caustic);

        const baseBlue = vec3(0.05, 0.20, 0.50);
        const rippleColor = vec3(0.28, 0.62, 1.10);
        const foamColor = vec3(0.95, 1.00, 1.10);
        let color = mix(baseBlue, rippleColor, rippleSoft.mul(0.7));
        color = mix(color, foamColor, causticGlint.mul(0.5));
        color = mix(color, foamColor, foam.mul(0.85));

        poolMat.colorNode = color;
        poolMat.emissiveNode = color.mul(0.55);

        m.material = poolMat;
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
  }, [scene, bakedMap, emitMap]);

  return <primitive object={scene} position={position} />;
};

export default UpperIsland;
