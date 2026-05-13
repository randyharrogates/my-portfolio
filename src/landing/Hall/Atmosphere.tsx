/** @format */

import React from "react";
import MotesGPU from "./MotesGPU.tsx";

interface AtmosphereProps {
  /** Low-fidelity halves the mote count. */
  lowFidelity: boolean;
  /** Reduced-motion mode locks animation phase. */
  staticMode: boolean;
}

/** Composite atmosphere layer for the archipelago — Phase 4 swapped the
 *  CPU mote loop for ShaderMaterial-driven GPU motes (vertex-shader
 *  position animation, single uniform per frame). With CPU freed, two
 *  chromatic layers (cyan + magenta) can each carry ~3× the prior
 *  particle count for richer atmospheric depth. */
const Atmosphere: React.FC<AtmosphereProps> = ({ lowFidelity, staticMode }) => {
  const cyanCount = lowFidelity ? 1600 : 2600;
  const magentaCount = lowFidelity ? 900 : 1500;
  return (
    <>
      <MotesGPU
        count={cyanCount}
        staticMode={staticMode}
        color="#6fe8ff"
        size={0.32}
        opacity={0.7}
        speed={1.0}
        radius={75}
        yBottom={-24}
        yTop={20}
        swirl={0.5}
      />
      <MotesGPU
        count={magentaCount}
        staticMode={staticMode}
        color="#ff5fa8"
        size={0.4}
        opacity={0.6}
        speed={0.7}
        radius={80}
        yBottom={-26}
        yTop={22}
        swirl={0.8}
      />
    </>
  );
};

export default Atmosphere;
