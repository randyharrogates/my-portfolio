/** @format */

import React from "react";
import {
  EffectComposer,
  Bloom,
  Vignette,
  ToneMapping,
  N8AO,
  SMAA,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

interface PostprocessingProps {
  enabled: boolean;
}

/** Postfx pipeline tuned for the Hall. Reuses the same effects + ordering as
 *  the Workstation, but drops DoF (the Hall's read is "open architectural
 *  hall" — pulling focus would shrink the read) and pushes Bloom a touch
 *  harder so the floor-glow rings and hologram fresnel rim carry.
 *
 *  The LUT pass is intentionally NOT mounted here yet — we'll bake a Hall-
 *  specific LUT at the end of Phase 8 once the final colour grade locks. The
 *  Workstation warm-evening LUT clashes with the teal-shadow / brass-mid
 *  palette so reusing it as-is reads wrong. ACES tone map alone for now.
 */
const Postprocessing: React.FC<PostprocessingProps> = ({ enabled }) => {
  if (!enabled) {
    return (
      <EffectComposer multisampling={0}>
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <N8AO
        aoRadius={0.6}
        intensity={2.2}
        distanceFalloff={1.1}
        quality="medium"
      />
      <Bloom
        intensity={0.75}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.22}
        mipmapBlur
        radius={0.85}
      />
      <Vignette eskil={false} offset={0.32} darkness={0.38} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
};

export default Postprocessing;
