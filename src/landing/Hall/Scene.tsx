/** @format */

import React from "react";
import Island from "./Island.tsx";
import UpperIsland from "./UpperIsland.tsx";
import Foliage from "./Foliage.tsx";
import Atmosphere from "./Atmosphere.tsx";
import Lighting from "./Lighting.tsx";
import EnvironmentRig from "./EnvironmentRig.tsx";
import Skybox from "./Skybox.tsx";
import PoiMarkers from "./PoiMarkers.tsx";
import AboutLandmark from "./AboutLandmark.tsx";
import EnterHouseOrb from "./EnterHouseOrb.tsx";
import ProjectsLandmark from "./ProjectsLandmark.tsx";
import ProjectsTerminalOrb from "./ProjectsTerminalOrb.tsx";
import SkillsLandmark from "./SkillsLandmark.tsx";
import SkillsForgeOrb from "./SkillsForgeOrb.tsx";
import Connections from "./Connections.tsx";
import Signboard from "./Signboard.tsx";
import { HALL_POI_POSITIONS } from "../sections.ts";

interface SceneProps {
  lowFidelity: boolean;
  staticMode: boolean;
}

/** Archipelago hub scene — Genshin-inspired stylized (locked 2026-05-15).
 *
 *  Sumeru cyan-magic-night palette: painted painterly sky, single soft
 *  cool key + warm fill, hub disc + landmarks + cartoon-water connections
 *  layer. Replaces the prior photoreal-AAA-with-AAA-water-stack scene —
 *  upper island, waterfall mist plane, particle spray, and the
 *  separately-mounted TSL waterfall are all retired in favour of meshes
 *  that ship inside `connections.glb` rendered with the cartoon shader.
 */
const Scene: React.FC<SceneProps> = ({ lowFidelity, staticMode }) => {
  return (
    <>
      <Skybox />
      <EnvironmentRig />
      <fog attach="fog" args={["#1a0b30", 160, 360]} />
      <Lighting lowFidelity={lowFidelity} />
      <Island />
      <UpperIsland />
      <Foliage />
      {/* About landmark (front-centre POI). Pagoda style-clash carve-out
          per the 2026-05-15 pivot: house keeps its existing cartoon look;
          surrounding environment retargets to Genshin terrain in Phase 4. */}
      <AboutLandmark
        position={[HALL_POI_POSITIONS[0][0], 0, HALL_POI_POSITIONS[0][2]]}
      />
      <EnterHouseOrb
        position={[
          HALL_POI_POSITIONS[0][0],
          2.3,
          HALL_POI_POSITIONS[0][2] + 4.8,
        ]}
      />
      <Signboard
        position={[
          HALL_POI_POSITIONS[0][0] - 2.5,
          0,
          HALL_POI_POSITIONS[0][2] + 6.0,
        ]}
        rotationY={0.5}
        text="ABOUT ME"
      />
      {/* /projects landmark — mecha wreck silhouette kept; orange
          vibranium veins re-coloured to cyan crystal in Phase 5. */}
      <ProjectsLandmark
        position={[HALL_POI_POSITIONS[1][0], 0, HALL_POI_POSITIONS[1][2]]}
      />
      <ProjectsTerminalOrb
        position={[
          HALL_POI_POSITIONS[1][0] + 9.0,
          3.0,
          HALL_POI_POSITIONS[1][2] - 2.5,
        ]}
      />
      <Signboard
        position={[
          HALL_POI_POSITIONS[1][0] + 6.5,
          0,
          HALL_POI_POSITIONS[1][2] - 4.5,
        ]}
        rotationY={-0.6}
        text="CASE STUDIES"
        scale={1.3}
      />
      {/* /skills landmark — forge cave; rebuilt as a Genshin Liyue cliff
          outcrop with painted multi-stream cartoon waterfall in Phase 6. */}
      <SkillsLandmark
        position={[HALL_POI_POSITIONS[2][0], 0, HALL_POI_POSITIONS[2][2]]}
      />
      <SkillsForgeOrb position={[-25.45, 8.1, -16.70]} />
      {/* Cross-landmark water — sourced at /skills, chevrons NE to
          /projects, returns SW into the /about basin. All cartoon-water
          authored in `blender/hall-master.blend` and packed into
          `connections.glb`. */}
      <Connections />
      <Signboard
        position={[-32.0, 4.0, -17.0]}
        rotationY={Math.PI / 4}
        text="SKILLS"
        scale={1.5}
      />
      <PoiMarkers />
      <Atmosphere lowFidelity={lowFidelity} staticMode={staticMode} />
    </>
  );
};

export default Scene;
