/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { applyStandardLandmarkMaterials } from "./landmarkMaterialPipeline.ts";

const LANDMARK_GLB = `${process.env.PUBLIC_URL}/models/hall/landmarks/landmark-blog.glb`;
useGLTF.preload(LANDMARK_GLB);

interface BlogLandmarkProps {
  position: [number, number, number];
}

/** /blog landmark — Mondstadt cottage bookhouse + Sumeru-Akademiya
 *  magical-library accents + continuous ridge backdrop.
 *
 *  Cottage: stone-and-timber half-timber walls, peaked terracotta roof,
 *  front porch, ivy on west wall, wooden door (slightly ajar), large
 *  hub-facing window showing baked bookshelf interior. Wrought-iron
 *  lamppost on the front yard + wooden signpost.
 *
 *  Front-yard centerpiece: stone-book-stack pedestal (4 carved stone
 *  books with cyan rune-glow spines) topped with a big floating tome,
 *  ringed by 4 rune pillars + 5 mini floating tomes orbiting + a
 *  high-hovering Akademiya sigil disc + small stone reading bench.
 *  Orb (BlogTomeOrb) hovers above the floating tome at z≈4.7.
 *
 *  Surrounding scatter: wishing well, beehive, barrels, mailbox,
 *  laundry line, watering can, garden fence, outdoor reading nook
 *  (stone table + chair + open book + ink-pot + candle + wind chimes),
 *  3 trees + remote bench under satellite sakura, 23 windwheel asters,
 *  rune obelisk + scroll rack + rune stelae + floating paper sheets
 *  scattered in all 4 directions, 16 floating papers.
 *
 *  Backdrop: continuous mid-ridge wrapping behind cottage (varying
 *  spine heights, faceted sloping faces), parallax back-ridge row,
 *  distant mountain range with snow caps + cyan crystal vein accents.
 *
 *  Built in `blender/blog-landmark-bake.blend` under the canonical
 *  bake rig (Cycles 128 samples, AgX, saturated magenta key + cyan
 *  fill suns, world bg (0.2,0.1,0.3) × 0.4). 15 bake groups → 15
 *  1024² sRGB PNGs packed in the GLB + 1 emit group preserving
 *  authored emission (lantern warm + candle flame warm + cyan
 *  rune-glow). Uses the canonical LIT recipe — the runtime applies
 *  the 5× hard-emission boost to lantern, candle, and rune accents
 *  (all emit ≥ 0.4). Baked textures get the 0.55 emissive-map nudge
 *  so they read warm against the runtime lighting.
 */
const BlogLandmark: React.FC<BlogLandmarkProps> = ({ position }) => {
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
        navigate("/hall/blog");
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

export default BlogLandmark;
