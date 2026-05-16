/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";

const FOLIAGE_GLB = `${process.env.PUBLIC_URL}/models/hall/foliage.glb`;
useGLTF.preload(FOLIAGE_GLB);

/** Foliage layer for the hub — 11 branching trees (sakura/green/red),
 *  20 bushes (green + sakura-pink) and 16 luminous Sumeru mushrooms
 *  scattered across the hub plateau (Phase 3 of the Genshin pivot).
 *
 *  Geometry authored in `blender/hall-master.blend` per master, with each
 *  master shading-baked in Cycles (emission + AO) at its own 256-512²
 *  atlas. Instances share their master's mesh data via Blender linked
 *  duplicates → the GLB ships 6 unique meshes + 6 textures + 47 transform
 *  records, not 47 unique meshes.
 *
 *  Same material recipe as `Island.tsx`: every mesh converts to a
 *  `MeshBasicNodeMaterial` (unlit) carrying its baked map verbatim. The
 *  Cycles bake already encodes top-bright/bottom-dark canopy gradient
 *  + self-shadowing AO, so re-lighting in Three.js would just wash it. */
const Foliage: React.FC = () => {
  const { scene } = useGLTF(FOLIAGE_GLB) as unknown as { scene: THREE.Group };

  const cloned = useMemo(() => {
    const root = scene.clone(true);
    root.updateMatrixWorld(true);

    // Drop foliage that was scattered on the removed UpperIsland (it sat
    // at world y ≈ +18; anything above the hub plateau is orphan scatter).
    const orphans: THREE.Object3D[] = [];
    const worldPos = new THREE.Vector3();
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return;
      mesh.getWorldPosition(worldPos);
      if (worldPos.y > 10) orphans.push(mesh);
    });
    orphans.forEach((o) => o.parent?.remove(o));

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
  }, [scene]);

  return <primitive object={cloned} />;
};

export default Foliage;
