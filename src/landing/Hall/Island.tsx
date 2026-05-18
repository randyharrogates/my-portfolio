/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { applyStandardLandmarkMaterials } from "./landmarkMaterialPipeline.ts";

const ISLAND_HUB_GLB = `${process.env.PUBLIC_URL}/models/hall/island-hub.glb`;
useGLTF.preload(ISLAND_HUB_GLB);

/** Hub island — multi-tier terraced Liyue cliff platform with neutral cool
 *  cyan-grey stone palette that bridges Inazuma-warm and Sumeru-cool
 *  landmark families. Authored 2026-05-16 in `blender/hall-master.blend`
 *  against the live POI positions of all 6 shipped landmarks; baked via
 *  Cycles under the canonical /hall pipeline.
 *
 *  Geometry: 4 meshes — plateau top with carved features (576 faces) +
 *  3-tier cliff rim (252 faces) + underside dome (24 faces) + pebble
 *  scatter (300 faces, 14 cobbles along channel banks + path edges).
 *  ~1070 verts total, 65 m world radius.
 *
 *  Topology: hybrid plateau preserves every landmark Y=0. Carved features:
 *    - River-of-life chevron channels (skills→projects→about) per locked
 *      /hall river-of-life spec, with projects split-rejoin island
 *    - About pond integration (smooth depression around POI[0])
 *    - Contact harbor bay carved into south rim (with harbor mouth opening
 *      to disc outer edge)
 *    - Baked stone path strips (blog↔about, contact↔about) painted into
 *      the plateau bake texture + 5 cm geometric inset
 *
 *  Materials: 5 bake groups under the canonical pipeline, all baked at
 *  1024² sRGB with the standard skills-canonical Cycles rig. Disc-level
 *  foliage (KILL per Genshin pivot) is NOT mounted; `Foliage.tsx` and
 *  `foliage.glb` were removed in this phase.
 *
 *  Rendering: `applyStandardLandmarkMaterials` (canonical lit recipe, no
 *  vertex noise, no dynamic shadows — bake encodes all shading). The bake
 *  already encodes painted edge lighting, but the lit recipe lets future
 *  authored emission (e.g., bioluminescent moss accents) participate in
 *  the standard 5× hard-emissive boost. */
const Island: React.FC = () => {
  const { scene } = useGLTF(ISLAND_HUB_GLB) as unknown as {
    scene: THREE.Group;
  };

  const cloned = useMemo(() => {
    const root = scene.clone(true);
    applyStandardLandmarkMaterials(root);
    return root;
  }, [scene]);

  return <primitive object={cloned} />;
};

export default Island;
