/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { applyStandardLandmarkMaterials } from "./landmarkMaterialPipeline.ts";
import placements from "./hub_scatter_placements.json";

const HUB_SCATTER_GLB = `${process.env.PUBLIC_URL}/models/hall/hub-scatter.glb`;
useGLTF.preload(HUB_SCATTER_GLB);

interface HubScatterProps {
  lowFidelity: boolean;
}

type Placement = [number, number, number, number, number];

/** Hub-scatter: Genshin-style forest belt around the disc periphery.
 *
 *  Authored 2026-05-17 against `hall-master.blend`. The GLB carries
 *  16 primitive meshes (14 scatter primitives at local origin + 5
 *  pre-positioned floating crystal-rock clusters + 5 pre-positioned
 *  water surfaces). The scatter primitives are instanced at the
 *  positions in `hub_scatter_placements.json` (~692 instances total).
 *  Floating rocks + water render as positioned meshes (each at its
 *  Blender-authored world position carried by the GLB).
 *
 *  Coordinate convention: placements JSON stores Blender coords
 *  (Z-up). The GLB itself was exported with `export_yup=True`, so the
 *  loaded meshes are in three.js space (Y-up). We convert per-instance
 *  positions: Blender (Bx, By, Bz=0) → three.js (Bx, 0, -By).
 *
 *  Low-fidelity: halves instance count per primitive. */
const HubScatter: React.FC<HubScatterProps> = ({ lowFidelity }) => {
  const { scene } = useGLTF(HUB_SCATTER_GLB) as unknown as {
    scene: THREE.Group;
  };

  const instancedGroup = useMemo(() => {
    const root = scene.clone(true);
    applyStandardLandmarkMaterials(root);

    // Collect meshes by primitive name (mesh name suffix "_mesh")
    const primMeshes = new Map<string, THREE.Mesh>();
    const positionedMeshes: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return;
      const name = mesh.name;
      // Primitive meshes share a name with their key in placements (after stripping "_mesh")
      // The GLB mesh names match the object names from Blender (no _mesh suffix on object,
      // but the mesh data is named "<name>_mesh" — we read the object's name).
      // After clone, mesh.name reflects the Blender object name.
      if (Object.prototype.hasOwnProperty.call(placements, name)) {
        primMeshes.set(name, mesh);
        mesh.visible = false; // hide the original; we'll render via InstancedMesh
      } else {
        // floating_rocks_*, water_*, and any other pre-positioned mesh: keep as-is
        positionedMeshes.push(mesh);
      }
    });

    // Build a fresh group containing:
    //   1. InstancedMesh per scatter primitive
    //   2. Positioned meshes (floating rocks, water) unchanged
    const out = new THREE.Group();
    out.name = "hub_scatter_root";

    // Add positioned meshes (the original GLB hierarchy preserves their transforms)
    positionedMeshes.forEach((m) => {
      // Re-parent under our output group so we can control order
      const cloned = m;
      out.add(cloned);
    });

    // Build InstancedMesh per primitive
    const placementsByPrim = placements as Record<string, Placement[]>;
    const tempMatrix = new THREE.Matrix4();
    const tempPos = new THREE.Vector3();
    const tempQuat = new THREE.Quaternion();
    const tempScale = new THREE.Vector3();
    const yAxis = new THREE.Vector3(0, 1, 0);

    for (const [primName, places] of Object.entries(placementsByPrim)) {
      const sourceMesh = primMeshes.get(primName);
      if (!sourceMesh) continue;
      const geom = sourceMesh.geometry;
      const mat = sourceMesh.material as THREE.Material;
      // Halve count under low fidelity
      const stride = lowFidelity ? 2 : 1;
      const instanceCount = Math.ceil(places.length / stride);
      const inst = new THREE.InstancedMesh(geom, mat, instanceCount);
      inst.name = `${primName}_instanced`;
      for (let i = 0, j = 0; i < places.length; i += stride, j += 1) {
        const [bx, by, , rotZ, scale] = places[i];
        // Blender (Bx, By, Bz=0) → three.js (Bx, 0, -By)
        tempPos.set(bx, 0, -by);
        // Blender Z-axis rotation around disc normal → three.js Y-axis
        tempQuat.setFromAxisAngle(yAxis, rotZ);
        tempScale.set(scale, scale, scale);
        tempMatrix.compose(tempPos, tempQuat, tempScale);
        inst.setMatrixAt(j, tempMatrix);
      }
      inst.instanceMatrix.needsUpdate = true;
      inst.frustumCulled = false;
      out.add(inst);
    }

    return out;
  }, [scene, lowFidelity]);

  return <primitive object={instancedGroup} />;
};

export default HubScatter;
