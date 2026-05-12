/** @format */

import React from "react";
import { HALL_CEILING_HEIGHT } from "../sections.ts";

interface LightingProps {
  /** Reserved — currently no fidelity branch in Lighting, but keeping
   *  the prop in the signature so the call-site in Scene.tsx doesn't
   *  need to change when we re-add a low-fidelity branch later. */
  lowFidelity?: boolean;
}

/** Hall lighting — Session 26c daylight retune.
 *  The dusk era used a cool-blue dome key + emerald floor bounce to break
 *  monochrome against a magenta HDRI. With the new daylight Drakensberg
 *  HDRI doing most of the work via IBL, the lights pivot to a softer,
 *  more neutral profile: brighter ambient daylight fill, gentler dome
 *  skylight, less aggressive emerald floor-up (the floor inlay's own
 *  emissive carries the green now).
 */
const Lighting: React.FC<LightingProps> = () => {
  return (
    <>
      {/* Ambient — daylight fill. Brighter (0.22 → 0.45) and neutralised
       *  toward cool grey-blue (#8aa4b8 → #c8d4e0) so the dark cathedral
       *  interior catches enough soft daylight to read without going
       *  flat. Pairs with the lifted environmentIntensity in Scene.tsx. */}
      <ambientLight intensity={0.45} color="#c8d4e0" />

      {/* Dome key — soft cool daylight from above. Session 27: castShadow
       *  dropped (Canvas-level shadows are now disabled for perf), all
       *  shadow-camera props removed. */}
      <directionalLight
        position={[0, HALL_CEILING_HEIGHT + 3, 0.4]}
        intensity={2.0}
        color="#e0eaf2"
      />

      {/* Floor-up fill — emerald, sells the floor-glow ring's bounce.
       *  Intensity dropped 1.6 → 0.8 so the green doesn't fight the
       *  daylight palette; the floor inlay's own emissive ring keeps
       *  the green focal accent. */}
      <pointLight
        position={[0, 0.4, 0]}
        intensity={0.8}
        color="#4ed4a0"
        distance={22}
        decay={2.2}
      />

      {/* Skylight halo — warm gold focal moment at the dome aperture.
       *  Intensity dropped 2.2 → 1.4 so the halo reads as a subtle
       *  highlight rather than a competing key light against the
       *  daylight HDRI. */}
      <pointLight
        position={[0, HALL_CEILING_HEIGHT - 0.1, 0]}
        intensity={1.4}
        color="#fbcf78"
        distance={18}
        decay={2}
      />
    </>
  );
};

export default Lighting;
