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
  TiltShift2,
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
 * TiltShift2 is a screen-space blur that fakes the same look without a depth
 * pass, so it composes cleanly with Bloom.
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
        luminanceThreshold={0.35}
        luminanceSmoothing={0.22}
        mipmapBlur
        radius={1.0}
      />
      <TiltShift2 blur={0.18} samples={10} />
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
      <Vignette eskil={false} offset={0.32} darkness={0.42} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
};

export default Postprocessing;
