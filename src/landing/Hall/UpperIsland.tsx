/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";

const UPPER_ISLAND_GLB = `${process.env.PUBLIC_URL}/models/hall/upper-island.glb`;
useGLTF.preload(UPPER_ISLAND_GLB);

/** Upper floating island — smaller Liyue terraced cliff platform (~11 m
 *  radius) suspended above the hub at the skills POI (world XY = -30,-6,
 *  height y = +18). Source for the river-of-life cartoon waterfall that
 *  cascades down to a pool on the main hub plateau.
 *
 *  Authored in `blender/hall-master.blend` with the same directional
 *  Cycles bake recipe as the main hub disc — single soft cyan-white key
 *  + warm-rose fill + COMBINED bake → strong per-face shadow direction
 *  in the painted texture.
 *
 *  Same React-side material recipe as `Island.tsx`: every mesh converts
 *  to a `MeshBasicNodeMaterial` (unlit, the bake already encodes the
 *  shading), with `transparent=false` + explicit depth flags so the
 *  geometry occludes cleanly. */
const UpperIsland: React.FC = () => {
  const { scene } = useGLTF(UPPER_ISLAND_GLB) as unknown as {
    scene: THREE.Group;
  };

  const cloned = useMemo(() => {
    const root = scene.clone(true);
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

export default UpperIsland;
