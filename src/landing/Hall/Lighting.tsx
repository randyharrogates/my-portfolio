/** @format */

import React from "react";

interface LightingProps {
  /** Reserved for a future low-fidelity branch. */
  lowFidelity?: boolean;
}

/** Archipelago lighting — Genshin Sumeru cyan-magic-night rig
 *  (locked 2026-05-15, replaces the Path-A brightened photoreal rig).
 *
 *  Genshin scenes don't shade with sharp directional sunlight — the look
 *  is "painted sun + soft fill + saturated painted ambient." Anything
 *  beyond that is fighting the baked hand-painted textures coming off
 *  the landmark GLBs in later phases.
 *
 *  Rig:
 *   - Hemisphere: cool cyan from above + soft warm-rose from below.
 *     Primary diffuse fill for the painted asset palette.
 *   - Ambient: lifted warm-neutral so painted shadows never near-black.
 *   - Cool key directional: single soft cyan-white "painted sun" from
 *     above + camera-right. Gentle, broad, no sharp shadow cast.
 *   - Warm fill directional: ~30% key strength from the opposite side
 *     so the shadow side stays painterly.
 */
const Lighting: React.FC<LightingProps> = () => {
  return (
    <>
      <hemisphereLight
        intensity={3.8}
        color="#cfe7ff"
        groundColor="#8a6a78"
      />
      <ambientLight intensity={1.8} color="#b9b0b8" />
      <directionalLight
        position={[30, 55, 25]}
        intensity={3.2}
        color="#dceeff"
      />
      <directionalLight
        position={[-35, 22, -28]}
        intensity={1.0}
        color="#ffc8d6"
      />
    </>
  );
};

export default Lighting;
