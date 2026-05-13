/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { MeshStandardNodeMaterial } from "three/webgpu";

const LANDMARK_GLB = `${process.env.PUBLIC_URL}/models/hall/landmarks/landmark-skills.glb`;
useGLTF.preload(LANDMARK_GLB);

/** Convert each Mesh in the loaded GLB from `MeshStandardMaterial` to
 *  `MeshStandardNodeMaterial` (required by WebGPURenderer). Same
 *  three-tier emission strategy as `AboutLandmark.tsx` /
 *  `ProjectsLandmark.tsx`:
 *
 *    - authored emission → boosted 5× (hard) or 2× (soft)
 *    - base-colour texture but no emission → texture piped through
 *      emissiveMap at 0.55 intensity (so the bake reads even when no
 *      scene light hits the surface)
 *    - plain colour → flat self-emission at 45% base
 */
function convertToNodeMaterials(root: THREE.Group) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return;
    const src = mesh.material as THREE.MeshStandardMaterial;
    if (!src) return;

    const srcEmissive = src.emissive ?? new THREE.Color(0, 0, 0);
    const emissionMagnitude = Math.max(srcEmissive.r, srcEmissive.g, srcEmissive.b);
    const hasAuthoredEmission = emissionMagnitude > 0.02;
    const hardEmissive = emissionMagnitude >= 0.4;
    const hasBaseTexture = !!src.map;

    let finalEmissive: THREE.Color;
    let finalIntensity: number;
    let finalEmissiveMap: THREE.Texture | null = null;
    if (hasAuthoredEmission) {
      finalEmissive = srcEmissive.clone();
      finalIntensity = hardEmissive ? 5.0 : 2.0;
    } else if (hasBaseTexture) {
      finalEmissive = new THREE.Color(1, 1, 1);
      finalEmissiveMap = src.map;
      finalIntensity = 0.55;
    } else {
      finalEmissive = src.color.clone().multiplyScalar(0.45);
      finalIntensity = 1.0;
    }

    const nodeMat = new MeshStandardNodeMaterial({
      color: src.color.clone(),
      roughness: src.roughness,
      metalness: src.metalness,
      emissive: finalEmissive,
      emissiveIntensity: finalIntensity,
      transparent: src.transparent,
      opacity: src.opacity,
      side: src.side,
    });
    if (src.map) nodeMat.map = src.map;
    if (src.normalMap) {
      nodeMat.normalMap = src.normalMap;
      if (src.normalScale) nodeMat.normalScale = src.normalScale.clone();
    }
    if (src.roughnessMap) nodeMat.roughnessMap = src.roughnessMap;
    if (src.metalnessMap) nodeMat.metalnessMap = src.metalnessMap;
    if (src.aoMap) nodeMat.aoMap = src.aoMap;
    if (finalEmissiveMap) nodeMat.emissiveMap = finalEmissiveMap;
    else if (src.emissiveMap) nodeMat.emissiveMap = src.emissiveMap;

    mesh.material = nodeMat;
    // Same shadow-disable as ProjectsLandmark — the dynamic shadow
    // camera is sized for the house area (-25..+25) and the skills
    // landmark lives at world ~(-30, 0, -6), outside the frustum. The
    // Cycles bake already contains shadows.
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
}

interface SkillsLandmarkProps {
  position: [number, number, number];
}

/** /skills landmark — 3-tier waterfall pouring off the west cliff +
 *  forge platform (anvil + hammer + tool rack + sword-in-progress) on
 *  the bank, at `HALL_POI_POSITIONS[2]`. Cycles-baked rock/forge/
 *  organics groups; emissive water sheets + plunge pools + forge
 *  embers + sword blade + pedestal screen stay flat-emissive.
 *
 *  Clicking anywhere on the landmark navigates to /hall/skills. The
 *  pedestal screen + the lime orb mounted above it (in Scene.tsx)
 *  jump straight to /skills.
 */
const SkillsLandmark: React.FC<SkillsLandmarkProps> = ({ position }) => {
  const navigate = useNavigate();
  const gltf = useGLTF(LANDMARK_GLB) as unknown as { scene: THREE.Group };

  const landmark = useMemo(() => {
    const r = gltf.scene.clone(true);
    convertToNodeMaterials(r);
    return r;
  }, [gltf.scene]);

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        navigate("/hall/skills");
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

export default SkillsLandmark;
