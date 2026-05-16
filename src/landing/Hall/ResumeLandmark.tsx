/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { applyStandardLandmarkMaterials } from "./landmarkMaterialPipeline.ts";

const LANDMARK_GLB = `${process.env.PUBLIC_URL}/models/hall/landmarks/landmark-resume.glb`;
useGLTF.preload(LANDMARK_GLB);

interface ResumeLandmarkProps {
  position: [number, number, number];
}

/** /resume landmark — Sumeru Akademiya floating satellite, NORTH of skills'
 *  floating mini-island at altitude y=+18.
 *
 *  Island: faceted cyan-grey wedge disc (6m top / 3m bottom / 3m drop) with
 *  5 stalactites hanging beneath, mossy top patch, 28 grass tufts, 10
 *  bioluminescent mushrooms in 2 clusters, 2 cyan crystal outcrops.
 *
 *  Hero structure: octagonal Akademiya pavilion (~6m diameter) — 8 cyan-
 *  stone columns, dome roof with gold trim band, apex crystal sigil at the
 *  peak. 2-step octagonal dais inside carries a carved stone writing desk
 *  (1.5 × 0.8m) with ink-pot, brush + holder, a 3-tome closed stack, and
 *  a floating tilted scroll (1.0 × 0.6m) hovering 0.5m above the desk
 *  surface — the orb's anchor. Cyan rune-glow plane sits ~0.02m above the
 *  scroll for the painted magical inscription.
 *
 *  Accents: 6 cyan crystal spires (heights -1.5m to +5m, inner emit cores),
 *  5 floating open Akademiya tomes at varying altitudes + yaws, 3 drifting
 *  small scrolls, 8 floating sheets of paper, 2 high-altitude sigil discs
 *  (z = 9.5 / 10.8) with annular glyph-glow rings. Stone reading bench
 *  with open tome on the north side, herb garden + flower dots on the
 *  east edge, 7 path tiles leading from the hall south edge to the bridge
 *  entrance.
 *
 *  Bridge: Sumeru stone arch span (12m long, 1.6m wide, arches +1m at the
 *  midpoint) reaching south from the satellite to skills' floating
 *  mini-island. 18 carved rune-stone railing posts (every ~1.5m, both
 *  sides), 10 warm-yellow lanterns at alternating posts (chromatic
 *  counterpoint to the cyan dominant). Bridge endpoint at world
 *  (-30, 17.7, -12) aligns with skills' mini-island north edge.
 *
 *  Built in `blender/resume-landmark-bake.blend` under the canonical
 *  bake rig (Cycles 128 samples, AgX, saturated magenta key + cyan fill
 *  suns, world bg (0.2,0.1,0.3) × 0.4). 15 bake groups → 15 1024² sRGB
 *  PNGs packed in the GLB + 4 authored-emission groups preserving
 *  cyan rune-glow (scroll, sigils, spires, mushroom dots, apex crystal)
 *  and warm-yellow lantern flames. Uses the canonical LIT recipe — the
 *  runtime applies the 5× hard-emission boost to every emit ≥ 0.4. Baked
 *  textures get the 0.55 emissive-map nudge so they read warm against
 *  the scene lighting.
 */
const ResumeLandmark: React.FC<ResumeLandmarkProps> = ({ position }) => {
  const navigate = useNavigate();
  const gltf = useGLTF(LANDMARK_GLB) as unknown as { scene: THREE.Group };

  const landmark = useMemo(() => {
    const root = gltf.scene.clone(true);
    applyStandardLandmarkMaterials(root);
    return root;
  }, [gltf.scene]);

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        navigate("/hall/resume");
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

export default ResumeLandmark;
