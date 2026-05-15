/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { MeshStandardNodeMaterial } from "three/webgpu";

const LANDMARK_GLB = `${process.env.PUBLIC_URL}/models/hall/landmarks/landmark-skills.glb`;
useGLTF.preload(LANDMARK_GLB);

/** /skills landmark — Liyue-style cliff outcrop with multi-stream
 *  waterfall, floating island above, plunge pool, dense pool-rim rocks,
 *  scattered foliage + boulders + grass, mountain range backdrop,
 *  shed + fenced yard + sheep on the floating island, plus an
 *  interactive pedestal + terminal at the cliff base.
 *
 *  Authored 2026-05-15 in `blender/skills-landmark-bake.blend` and baked
 *  under the canonical projects-style Cycles rig (magenta-pink key sun
 *  5.0 + cyan fill sun 3.4 + dark purple world 0.4) — the same recipe as
 *  `landmark-projects.glb`, so the directional-shadow read matches.
 *
 *  Material conversion: every mesh gets its baked PNG piped through
 *  `emissiveMap` at 0.55 intensity so the surface self-glows with the
 *  baked colour, immune to runtime scene-lighting wash. Authored-
 *  emission surfaces (lantern paper tops, crystals, terminal screen +
 *  buttons, fire embers) keep their authored emission boosted 5× /2×
 *  via the hardEmissive / soft branch.
 */
function convertToNodeMaterials(root: THREE.Group) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return;
    const src = mesh.material as THREE.MeshStandardMaterial;
    if (!src) return;

    const srcEmissive = src.emissive ?? new THREE.Color(0, 0, 0);
    const emissionMagnitude = Math.max(
      srcEmissive.r,
      srcEmissive.g,
      srcEmissive.b
    );
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
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
}

interface SkillsLandmarkProps {
  position: [number, number, number];
}

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
