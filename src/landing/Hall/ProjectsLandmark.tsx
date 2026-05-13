/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { MeshStandardNodeMaterial } from "three/webgpu";

const LANDMARK_GLB = `${process.env.PUBLIC_URL}/models/hall/landmarks/landmark-projects.glb`;
useGLTF.preload(LANDMARK_GLB);

/** Convert each Mesh in the loaded GLB from `MeshStandardMaterial` to
 *  `MeshStandardNodeMaterial` (required by WebGPURenderer). Same
 *  three-tier emission strategy as `AboutLandmark.tsx`:
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
    // All shadows are baked into the structural / ground textures. The
    // dynamic shadow camera is sized for the house area (-25..+25) and
    // the satellite lives at world ~(32, 0, 18) — partially outside the
    // shadow frustum, which produces clipped black bars across the
    // ground. Disable dynamic shadow casting + receiving for this
    // landmark; the bake already has everything baked in.
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
}

interface ProjectsLandmarkProps {
  position: [number, number, number];
}

/** /projects landmark — crashed mecha-satellite at HALL_POI_POSITIONS[1].
 *  Cycles-baked structural hull + crater/scorch ground; emissive seams,
 *  terminal screen + buttons stay flat-emissive (light sources). The
 *  terminal screen is rendered separately by `Scene.tsx` as a clickable
 *  surface — this component just renders the visual wreck.
 *
 *  Clicking anywhere on the hull navigates to /hall/projects (close-up
 *  view). The terminal's screen + an orb above it (mounted separately in
 *  Scene.tsx) handle the deeper jump straight to /projects/credit-memo.
 */
const ProjectsLandmark: React.FC<ProjectsLandmarkProps> = ({ position }) => {
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
        navigate("/hall/projects");
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

export default ProjectsLandmark;
