/** @format */

import React, { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { buildSkyEnvCubeMap } from "./SkyEnvMap.ts";

/** Mounts the procedural neon-dusk cubemap as `scene.environment` so every
 *  MeshStandardNodeMaterial in the Hall picks it up as Image-Based
 *  Lighting (IBL) without an explicit `mat.envMap = …` per call.
 *
 *  The cubemap is built from the same gradient stops as `Skybox.tsx` so
 *  reflective surfaces (water, polished landmark accents) reflect the
 *  exact dusk sky the user sees in the background. PMREMGenerator would
 *  give us roughness-aware prefiltering for free, but for the WebGPU
 *  pipeline a raw cube + mipmap chain works — the standard PBR path in
 *  three/webgpu samples lower mips for higher roughness.
 *
 *  Component renders nothing — pure side-effect. */
const EnvironmentRig: React.FC = () => {
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    const env = buildSkyEnvCubeMap(64);
    scene.environment = env;
    // environmentIntensity landed in three r163; types in 0.169 expose
    // it on Scene. Cast keeps the assignment safe under older typings.
    (scene as unknown as { environmentIntensity?: number }).environmentIntensity = 1.8;
    return () => {
      if (scene.environment === env) scene.environment = null;
    };
  }, [scene]);
  return null;
};

export default EnvironmentRig;
