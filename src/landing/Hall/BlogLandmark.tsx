/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";

const LANDMARK_GLB = `${process.env.PUBLIC_URL}/models/hall/landmarks/landmark-blog.glb`;
useGLTF.preload(LANDMARK_GLB);

interface BlogLandmarkProps {
  position: [number, number, number];
}

/** /blog landmark — Liyue-style stone book pedestal: hex stone base,
 *  three stacked books (red / blue / sakura-pink), an open parchment
 *  scroll on top, surrounded by faceted rocks + grass tufts. Built in
 *  `blender/hall-master.blend` and baked with the same Genshin warm key
 *  + cool fill Cycles config as the other low-poly painted landmarks;
 *  the baked PNG ships packed inside the GLB.
 *
 *  Material recipe is unlit — the bake already encodes shading + soft
 *  shadows — same as `UpperIsland.tsx`. */
const BlogLandmark: React.FC<BlogLandmarkProps> = ({ position }) => {
  const navigate = useNavigate();
  const gltf = useGLTF(LANDMARK_GLB) as unknown as { scene: THREE.Group };

  const landmark = useMemo(() => {
    const root = gltf.scene.clone(true);
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return;
      const src = mesh.material as THREE.MeshStandardMaterial;
      if (!src) return;
      const nodeMat = new MeshBasicNodeMaterial();
      if (src.map) {
        nodeMat.map = src.map;
      } else {
        nodeMat.color = src.color?.clone() ?? new THREE.Color(0xffffff);
      }
      nodeMat.transparent = false;
      nodeMat.depthWrite = true;
      nodeMat.depthTest = true;
      nodeMat.side = THREE.DoubleSide;
      nodeMat.fog = false;
      mesh.material = nodeMat;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    });
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
