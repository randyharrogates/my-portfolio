/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { applyUnlitLandmarkMaterials } from "./landmarkMaterialPipeline.ts";

const LANDMARK_GLB = `${process.env.PUBLIC_URL}/models/hall/landmarks/landmark-resume.glb`;
useGLTF.preload(LANDMARK_GLB);

interface ResumeLandmarkProps {
  position: [number, number, number];
}

/** /resume landmark — Liyue-style carved stone stele: ~3-m vertical slab
 *  with five carved inscription bands and a diamond-shaped relief at the
 *  top, mounted on a two-tier dais, capped by a cyan crystal accent.
 *  Faceted rocks ring the base. Authored in `blender/hall-master.blend`
 *  and baked with the canonical Genshin Cycles rig.
 *
 *  Uses the canonical UNLIT recipe in `landmarkMaterialPipeline.ts` —
 *  the bake already encodes shading + soft shadows, no runtime lighting
 *  interaction needed.
 */
const ResumeLandmark: React.FC<ResumeLandmarkProps> = ({ position }) => {
  const navigate = useNavigate();
  const gltf = useGLTF(LANDMARK_GLB) as unknown as { scene: THREE.Group };

  const landmark = useMemo(() => {
    const root = gltf.scene.clone(true);
    applyUnlitLandmarkMaterials(root);
    return root;
  }, [gltf.scene]);

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        navigate("/hall/resume");
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

export default ResumeLandmark;
