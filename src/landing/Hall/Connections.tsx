/** @format */

import React, { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { MeshBasicNodeMaterial } from "three/webgpu";

const MODEL_PATH = `${process.env.PUBLIC_URL}/models/hall/connections.glb`;
useGLTF.preload(MODEL_PATH);

/** Cross-landmark water layer — pool basin, spout source pool, waterfall
 *  cascade and river ribbon authored in `blender/hall-master.blend`.
 *
 *  Low-poly faceted style: each water mesh ships with a `COLOR_0`
 *  vertex-colour attribute that encodes per-vertex cyan variation
 *  (shadow / neutral / highlight roll on each vertex). The material
 *  just reads vertex colours — the *facets* are the read, not any
 *  UV scroll. `connections.glb` ships ~17 KB total across four
 *  primitives (pool_basin, spout_source_pool, waterfall_cascade,
 *  water_river). */
const Connections: React.FC = () => {
  const gltf = useGLTF(MODEL_PATH) as unknown as { scene: THREE.Group };
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useMemo(() => {
    scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!(m as unknown as { isMesh?: boolean }).isMesh) return;
      const name = m.name.toLowerCase();

      const mat = new MeshBasicNodeMaterial({
        side: THREE.DoubleSide,
      });
      mat.transparent = false;
      mat.depthWrite = true;
      mat.depthTest = true;
      mat.fog = false;
      // Read the COLOR_0 vertex attribute baked in Blender. The Three.js
      // node material picks this up via `vertexColors=true`.
      mat.vertexColors = true;

      m.material = mat;
      m.castShadow = false;
      m.receiveShadow = false;
      m.renderOrder = 1;
    });
  }, [scene]);

  return <primitive object={scene} position={[0, 0, 0]} />;
};

export default Connections;
