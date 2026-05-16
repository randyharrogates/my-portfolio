/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { applyStandardLandmarkMaterials } from "./landmarkMaterialPipeline.ts";

const LANDMARK_GLB = `${process.env.PUBLIC_URL}/models/hall/landmarks/landmark-about.glb`;
useGLTF.preload(LANDMARK_GLB);

/** /about uses the canonical lit recipe from `landmarkMaterialPipeline.ts`
 *  with two opt-ins for the cartoony pagoda style:
 *
 *    - vertex-noise injection — per-mesh-family amplitude (rocks 0.30,
 *      foliage 0.20, default 0.12, emissive 0) so single rocks/bushes
 *      show within-object granularity instead of reading as solid blocks
 *    - dynamic shadows — the about scene IS inside the directional-shadow
 *      camera frustum (centered on world origin, sized ±25), so dynamic
 *      shadows look correct here. Other landmarks (projects/skills off-axis)
 *      leave dynamic shadows off to avoid frustum clipping.
 */

interface AboutLandmarkProps {
  position: [number, number, number];
}

/** /about landmark — single GLB containing the building + environment
 *  with Cycles-baked lighting + shadows + AO + colour variation baked
 *  into per-asset textures (per `feedback_cycles_bake_workflow.md`).
 *
 *  Bake groups in `landmark-about.glb`:
 *  - `rocks_baked` — all boulders + small rocks + path stones + pond
 *    stones (one merged mesh, one 2048² atlas)
 *  - `foliage_baked` — all tree foliage cones + bush clumps (one
 *    merged mesh, one 2048² atlas)
 *  - `ground_baked` — the rocky ground patch with shadows from house
 *    + plants baked in (2048²)
 *  - house walls already carry their procedural-Brick bake
 *  - small props (mailbox, pond water, lily pads, exotic plants,
 *    grass) keep their direct materials — they're either emissive
 *    or too small to need baked variation.
 */
const AboutLandmark: React.FC<AboutLandmarkProps> = ({ position }) => {
  const navigate = useNavigate();
  const gltf = useGLTF(LANDMARK_GLB) as unknown as { scene: THREE.Group };

  const landmark = useMemo(() => {
    const r = gltf.scene.clone(true);
    applyStandardLandmarkMaterials(r, {
      vertexNoise: {
        rockAmp: 0.30,
        foliageAmp: 0.20,
        defaultAmp: 0.12,
        rockHue: 0.05,
        foliageHue: 0.08,
      },
      dynamicShadows: true,
    });
    return r;
  }, [gltf.scene]);

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        navigate("/hall/about");
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <primitive object={landmark} />
    </group>
  );
};

export default AboutLandmark;
