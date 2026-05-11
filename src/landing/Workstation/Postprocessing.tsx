/** @format */

import React, { useEffect, useState } from "react";
import {
  EffectComposer,
  Bloom,
  Vignette,
  ToneMapping,
  N8AO,
  DepthOfField,
  LUT,
  SMAA,
} from "@react-three/postprocessing";
import { ToneMappingMode, LookupTexture } from "postprocessing";
import { TextureLoader, type Texture } from "three";

interface PostprocessingProps {
  enabled: boolean;
  focused: boolean;
}

const LUT_URL = `${process.env.PUBLIC_URL}/luts/warm-evening.png`;

/** Cinematic postfx pipeline. ACES tonemap + N8AO + DOF (idle only) + Bloom +
 *  vignette + LUT grade. Multisampling is forced to 0 so the DOF depth-buffer
 *  copy doesn't fight an MSAA target on Chrome/ANGLE — historically that
 *  triggered GL_INVALID_OPERATION when DOF + Bloom shared the depth/stencil
 *  attachment. With multisampling=0 + DOF before Bloom, both compose cleanly. */
const Postprocessing: React.FC<PostprocessingProps> = ({
  enabled,
  focused,
}) => {
  // Lazy-loaded LUT: TextureLoader → LookupTexture (3D). Async so the first
  // paint doesn't block on PNG decode.
  const [lutTex, setLutTex] = useState<LookupTexture | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let canceled = false;
    new TextureLoader().load(LUT_URL, (tex: Texture) => {
      if (canceled) {
        tex.dispose();
        return;
      }
      try {
        const lut = LookupTexture.from(tex);
        tex.dispose();
        setLutTex(lut);
      } catch {
        /* PNG might not decode as a valid LUT atlas — skip silently. */
      }
    });
    return () => {
      canceled = true;
    };
  }, [enabled]);

  // Low-fidelity / reduced-motion path: keep ACES tonemapping so the CRT
  // shader's emissive multiplier compresses correctly into [0,1]; skip the
  // expensive bloom / DOF / LUT passes.
  if (!enabled) {
    return (
      <EffectComposer multisampling={0}>
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={0}>
      {/* Morphological AA — cleaner bezel/window-mullion edges than the
       *  MSAA we forfeited for DOF compatibility. */}
      <SMAA />
      <N8AO
        aoRadius={0.4}
        intensity={2.5}
        distanceFalloff={0.8}
        quality="medium"
      />
      {/* DOF only in idle / B-roll framing. When focused, the camera is
       *  already 0.85 units from the monitor — applying DOF would soften
       *  the screen content. */}
      {!focused && (
        <DepthOfField
          worldFocusDistance={4.2}
          worldFocusRange={4.0}
          bokehScale={1.4}
          focalLength={0.04}
          height={480}
        />
      )}
      <Bloom
        intensity={focused ? 0.7 : 0.55}
        luminanceThreshold={0.7}
        luminanceSmoothing={0.22}
        mipmapBlur
        radius={0.75}
      />
      <Vignette eskil={false} offset={0.28} darkness={0.34} />
      {lutTex && <LUT lut={lutTex} tetrahedralInterpolation />}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
};

export default Postprocessing;
