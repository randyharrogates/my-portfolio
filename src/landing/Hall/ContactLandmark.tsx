/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";

const LANDMARK_GLB = `${process.env.PUBLIC_URL}/models/hall/landmarks/landmark-contact.glb`;
useGLTF.preload(LANDMARK_GLB);

interface ContactLandmarkProps {
  position: [number, number, number];
}

/** /contact landmark — Inazuma-style wooden lantern post: ~3.4-m post
 *  with a crossarm and two warm-glowing paper lanterns hanging by rope,
 *  a small hip roof, and an adjacent wooden mailbox on a short post.
 *  Sits on a small stone dais ringed by faceted rocks. Authored in
 *  `blender/hall-master.blend` and baked with the Genshin warm key +
 *  cool fill Cycles config. */
const ContactLandmark: React.FC<ContactLandmarkProps> = ({ position }) => {
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
        navigate("/hall/contact");
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

export default ContactLandmark;
