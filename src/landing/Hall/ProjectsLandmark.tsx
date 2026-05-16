/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { applyStandardLandmarkMaterials } from "./landmarkMaterialPipeline.ts";

const LANDMARK_GLB = `${process.env.PUBLIC_URL}/models/hall/landmarks/landmark-projects.glb`;
useGLTF.preload(LANDMARK_GLB);

/** Material conversion uses the canonical lit recipe in
 *  `landmarkMaterialPipeline.ts` (3-tier emission). Dynamic shadows are
 *  off because the bake already encodes shadow info AND the scene
 *  shadow-camera frustum (sized for the house area, -25..+25) doesn't
 *  fully cover the satellite at world ~(32, 0, 18) — leaving them on
 *  would produce clipped black bars across the ground.
 */

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
    applyStandardLandmarkMaterials(r);
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
