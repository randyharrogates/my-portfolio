/** @format */

import React from "react";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  Noise,
  ToneMapping,
} from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";

interface PostprocessingProps {
  enabled: boolean;
  focused: boolean;
}

/**
 * Cinematic postfx pipeline. DOF is intentionally omitted — pairing it with
 * Bloom triggers GL_INVALID_OPERATION warnings on Chrome/ANGLE because both
 * passes share the same depth/stencil attachment. The look survives without it
 * thanks to bloom + film grain + vignette.
 */
const Postprocessing: React.FC<PostprocessingProps> = ({
  enabled,
  focused,
}) => {
  if (!enabled) return null;

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={focused ? 1.4 : 1.05}
        luminanceThreshold={0.32}
        luminanceSmoothing={0.22}
        mipmapBlur
        radius={0.82}
      />
      <ChromaticAberration
        offset={[0.0008, 0.0012]}
        radialModulation={false}
        modulationOffset={0}
      />
      <Noise
        opacity={0.05}
        blendFunction={BlendFunction.OVERLAY}
        premultiply
      />
      <Vignette eskil={false} offset={0.22} darkness={0.78} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
};

export default Postprocessing;
