/** @format */

import React from "react";
import { HALL_CEILING_HEIGHT } from "../sections.ts";

interface LightingProps {
  lowFidelity: boolean;
}

/** Hall lighting — dome skylight key + cool fill from below + low ambient.
 *  Bounce light is faked entirely by emissive materials (brass + floor-glow
 *  rings) until a Cycles bake replaces it in Phase 2.
 */
const Lighting: React.FC<LightingProps> = ({ lowFidelity }) => {
  return (
    <>
      {/* Ambient — keeps shadows from going jet-black */}
      <ambientLight intensity={0.22} color="#9ab3ac" />

      {/* Dome key — warm tungsten from above */}
      <directionalLight
        position={[0, HALL_CEILING_HEIGHT + 3, 0.4]}
        intensity={1.4}
        color="#f4d8a8"
        castShadow={!lowFidelity}
        shadow-mapSize-width={lowFidelity ? 512 : 1024}
        shadow-mapSize-height={lowFidelity ? 512 : 1024}
        shadow-camera-far={20}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Floor-up fill — cool teal, sells the floor-glow ring's bounce */}
      <pointLight
        position={[0, 0.3, 0]}
        intensity={0.7}
        color="#4dd0c4"
        distance={10}
        decay={2.2}
      />

      {/* Skylight halo — soft yellow disc light at the dome apex.
       *  Approximates the bright aperture mesh as an actual light source.
       *  Cheap in low-fidelity (no shadows). */}
      <pointLight
        position={[0, HALL_CEILING_HEIGHT - 0.1, 0]}
        intensity={1.0}
        color="#fff1c8"
        distance={8}
        decay={2}
      />
    </>
  );
};

export default Lighting;
