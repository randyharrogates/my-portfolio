/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { applyStandardLandmarkMaterials } from "./landmarkMaterialPipeline.ts";

const LANDMARK_GLB = `${process.env.PUBLIC_URL}/models/hall/landmarks/landmark-contact.glb`;
useGLTF.preload(LANDMARK_GLB);

/** /contact landmark — Inazuma shrine compound (Sumeru cyan-magic palette).
 *
 *  Rebuilt 2026-05-16 (PIVOT from the abandoned beach concept) in
 *  `blender/contact-landmark-bake.blend`. Two adjacent floating outcrops:
 *  the main cliff hosts a full Inazuma shrine compound (red torii with
 *  shimenawa rope + shide + magatama; climbing stone path lined with toro
 *  lanterns; plaza with bell pavilion + kumiko lattice + saisen offering
 *  box + bell rope; sky-lantern release deck on the east edge; sacred
 *  sakura ema tree with painted prayer plaques + ribbons; komainu
 *  guardians + chozuya purification basin + nobori banners + stone sign
 *  at the entrance). The adjacent twin cliff carries a mini torii,
 *  kitsune fox messenger statue, furin wind-chime, mini sakura, bamboo,
 *  toro lantern — connected to the main cliff by chochin paper lanterns
 *  strung on rope lines. Off-outcrop scenery: 9 satellite floating
 *  rocks + bamboo grove + floating cherry petals + cyan glow orbs.
 *
 *  Baked groups (13 × 1024² hand-painted DIFFUSE colour bakes, per-group
 *  unique materials to avoid shared-material image clashes): outcrop,
 *  stone-path, torii, pavilion, bell, release-deck, ema-tree, ema-foliage,
 *  ema-plaques, twin-cliff, satellite-rocks, bamboo, floating-petals.
 *
 *  Authored-emission groups (no PNG, runtime self-glow): toro-lanterns
 *  (warm soft 2× boost), brazier (warm hard 5×), sky-lanterns (chochin
 *  body warm hard 5×), crystal-shards (cyan hard 5×), mushrooms (magenta
 *  hard 5×), glow-orbs (cyan hard 5×). Some authored-emission materials
 *  also live on baked groups (chozuya water, magatama beads on torii,
 *  furin chime on twin cliff) — they keep their glow at runtime because
 *  the React side detects per-material, not per-group.
 *
 *  Palette: Sumeru cyan-magic mid-tones (indigo-blue stone, cool teak
 *  wood, cool grey-blue path, saturated mint grass) + warm ritual-fire
 *  hero accents (vermilion torii + pavilion roof, warm chochin / brazier
 *  glow, magenta sakura). Locked 2026-05-16 with user.
 *
 *  Material conversion uses the canonical lit recipe in
 *  `landmarkMaterialPipeline.ts` — every baked PNG runs through
 *  `emissiveMap` at 0.55 intensity. Authored-emission surfaces keep
 *  their authored emission boosted 5× /2×.
 */

interface ContactLandmarkProps {
  position: [number, number, number];
}

const ContactLandmark: React.FC<ContactLandmarkProps> = ({ position }) => {
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
        navigate("/hall/contact");
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

export default ContactLandmark;
