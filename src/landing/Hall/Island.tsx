/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";

const ISLAND_HUB_GLB = `${process.env.PUBLIC_URL}/models/hall/island-hub.glb`;
useGLTF.preload(ISLAND_HUB_GLB);

/** Hub island — Liyue-style multi-tier terraced cliff platform (Phase 2
 *  of the Genshin pivot, locked 2026-05-15). Authored in
 *  `blender/hall-master.blend` against the live landmark POI positions,
 *  baked via Cycles emission as a hand-painted 1024² Sumeru cyan-magic
 *  palette texture, exported as a single packed GLB.
 *
 *  Geometry: 434 verts / 468 faceted faces, 65 m world radius (the
 *  authored scale is the final scale — no runtime up-scale, so the
 *  top plateau (radius 60 m) sits with breathing room around every
 *  landmark POI at radial 9-38 m). Profile: flat grass plateau, three
 *  terraced step-downs at the rim, vertical cliff drop, converging cone
 *  bottom (-25 m).
 *
 *  Rendering strategy — UNLIT (`MeshBasicNodeMaterial`). The bake already
 *  encodes painted lighting (flat key + soft fill + painted edge stroke)
 *  in the texture, so adding scene-light shading on top double-counts
 *  the lighting and washes the surface toward pure white. The Genshin
 *  reference uses unlit "painted" surfaces; we follow that. Forces
 *  `transparent=false` + explicit depth flags so the Tron-grid backdrop
 *  (`GridFloor.tsx`, renderOrder=-1, depthWrite=false) is reliably
 *  occluded — without those, scene-light driven brightness made the
 *  disc visually merge with the cyan-magic grid backdrop. */
const Island: React.FC = () => {
  const { scene } = useGLTF(ISLAND_HUB_GLB) as unknown as {
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
      mesh.renderOrder = 0;
    });
    return root;
  }, [scene]);

  return <primitive object={cloned} />;
};

export default Island;
