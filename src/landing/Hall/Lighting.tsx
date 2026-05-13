/** @format */

import React from "react";

interface LightingProps {
  /** Reserved for a future low-fidelity branch. */
  lowFidelity?: boolean;
}

/** Archipelago exterior lighting — Phase 3 neon-on-dark dusk rig.
 *
 *  Three lights total:
 *  - Ambient: low-intensity deep-violet fill so unlit surfaces don't go
 *    fully black under the dark sky.
 *  - Warm key (directional): saturated magenta-amber from camera-right
 *    and above, simulating a low neon sun. Hits the island rim with a
 *    saturated highlight that selective bloom in `Postprocessing.tsx`
 *    will lift into a glow.
 *  - Cool rim (directional): saturated cyan from camera-left and behind,
 *    catches the spire's silhouette so the underside doesn't drop into
 *    pure shadow.
 */
const Lighting: React.FC<LightingProps> = () => {
  return (
    <>
      {/* Hemisphere fill: warm-magenta from above, cool-violet from
          below. Replaces ambient + adds top-surface illumination so the
          platter top reads when the user orbits to an above-island
          angle. Without this the upward-facing rock geometry was as
          dark as the skybox's lower hemisphere and the silhouette
          merged with the background. */}
      <hemisphereLight
        intensity={2.2}
        color="#ff8fb8"
        groundColor="#3a2c5a"
      />
      <ambientLight intensity={0.6} color="#3a2c5a" />
      <directionalLight
        position={[40, 50, 20]}
        intensity={5.0}
        color="#ff5fa8"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-bias={-0.001}
      />
      <directionalLight
        position={[-45, 28, -35]}
        intensity={3.4}
        color="#5feaff"
      />
    </>
  );
};

export default Lighting;
