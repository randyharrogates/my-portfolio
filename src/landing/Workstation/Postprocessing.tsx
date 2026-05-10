/** @format */

import React from "react";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  Noise,
  ToneMapping,
  N8AO,
} from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";

interface PostprocessingProps {
  enabled: boolean;
  focused: boolean;
}

/**
 * Cinematic postfx pipeline. Real DOF is intentionally avoided — pairing
 * @react-three/postprocessing's DepthOfField with Bloom triggers
 * GL_INVALID_OPERATION on Chrome/ANGLE (shared depth/stencil attachment).
 * Atmospheric haze (fogExp2 in Scene) handles depth perception instead of
 * screen-space blur, keeping foreground geometry crisp.
 */
const Postprocessing: React.FC<PostprocessingProps> = ({
  enabled,
  focused,
}) => {
  // Low-fidelity / reduced-motion path: keep ACES tonemapping so the CRT
  // shader's emissive multiplier compresses correctly into [0,1]; skip the
  // expensive bloom / vignette / noise / chromatic aberration passes.
  if (!enabled) {
    return (
      <EffectComposer multisampling={0}>
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={0}>
      <N8AO
        aoRadius={0.4}
        intensity={2.5}
        distanceFalloff={0.8}
        quality="medium"
      />
      <Bloom
        intensity={focused ? 1.4 : 1.15}
        luminanceThreshold={0.5}
        luminanceSmoothing={0.22}
        mipmapBlur
        radius={0.75}
      />
      <ChromaticAberration
        offset={[0.0004, 0.0006]}
        radialModulation={false}
        modulationOffset={0}
      />
      <Noise
        opacity={0.05}
        blendFunction={BlendFunction.OVERLAY}
        premultiply
      />
      <Vignette eskil={false} offset={0.32} darkness={0.42} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
};

export default Postprocessing;
