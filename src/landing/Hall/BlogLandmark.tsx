/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { applyUnlitLandmarkMaterials } from "./landmarkMaterialPipeline.ts";

const LANDMARK_GLB = `${process.env.PUBLIC_URL}/models/hall/landmarks/landmark-blog.glb`;
useGLTF.preload(LANDMARK_GLB);

interface BlogLandmarkProps {
  position: [number, number, number];
}

/** /blog landmark — Liyue-style stone book pedestal: hex stone base,
 *  three stacked books (red / blue / sakura-pink), an open parchment
 *  scroll on top, surrounded by faceted rocks + grass tufts. Built in
 *  `blender/hall-master.blend` and baked with the canonical Genshin
 *  Cycles rig; the baked PNG ships packed inside the GLB.
 *
 *  Uses the canonical UNLIT recipe in `landmarkMaterialPipeline.ts` —
 *  the bake already encodes shading + soft shadows, no runtime lighting
 *  interaction needed.
 */
const BlogLandmark: React.FC<BlogLandmarkProps> = ({ position }) => {
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
        navigate("/hall/blog");
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

export default BlogLandmark;
