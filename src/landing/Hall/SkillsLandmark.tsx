/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { applyStandardLandmarkMaterials } from "./landmarkMaterialPipeline.ts";

const LANDMARK_GLB = `${process.env.PUBLIC_URL}/models/hall/landmarks/landmark-skills.glb`;
useGLTF.preload(LANDMARK_GLB);

/** /skills landmark — Liyue-style cliff outcrop with multi-stream
 *  waterfall, floating island above, plunge pool, dense pool-rim rocks,
 *  scattered foliage + boulders + grass, mountain range backdrop,
 *  shed + fenced yard + sheep on the floating island, plus an
 *  interactive pedestal + terminal at the cliff base.
 *
 *  Authored 2026-05-15 in `blender/skills-landmark-bake.blend` under the
 *  canonical bake rig — magenta-pink key sun 2.5W + cyan fill sun 1.7W +
 *  dark purple world 0.4 strength, AgX view transform. This .blend is the
 *  source of truth other landmarks copy from.
 *
 *  Material conversion uses the canonical lit recipe in
 *  `landmarkMaterialPipeline.ts` — every baked PNG piped through
 *  `emissiveMap` at 0.55 intensity so the surface self-glows with the
 *  baked colour, immune to runtime scene-lighting wash. Authored-
 *  emission surfaces keep their authored emission boosted 5× /2×.
 *
 *  Click routing: this landmark serves two destinations. The ground-level
 *  cliff + waterfall + plunge pool → /hall/skills. The floating mini-
 *  island (shed/fence/sheep, ~world Y=25+) is the south end of the resume
 *  satellite's bridge cluster → /hall/resume. Threshold y=15 splits them
 *  (cliff peak tops out at ~y=13).
 */

interface SkillsLandmarkProps {
  position: [number, number, number];
}

const SkillsLandmark: React.FC<SkillsLandmarkProps> = ({ position }) => {
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
        navigate(e.point.y > 15 ? "/hall/resume" : "/hall/skills");
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
