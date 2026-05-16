/** @format */

import React from "react";
import Island from "./Island.tsx";
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
import BlogLandmark from "./BlogLandmark.tsx";
import ResumeLandmark from "./ResumeLandmark.tsx";
import ContactLandmark from "./ContactLandmark.tsx";
import ContactBeaconOrb from "./ContactBeaconOrb.tsx";
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
      {/* /skills landmark — Liyue cliff outcrop + multi-stream waterfall
          + floating island with shed/fence/sheep + mountain ridges +
          interactive pedestal + terminal. Rebuilt 2026-05-15 under the
          canonical projects-style Cycles bake recipe. */}
      <SkillsLandmark
        position={[HALL_POI_POSITIONS[2][0], 0, HALL_POI_POSITIONS[2][2]]}
      />
      {/* Orb hovers just above the small foreground pedestal at the cliff
          base (skl_pedestal_merged, local Blender ~(11.1, 1.35, 17.7) after
          y-up conversion). Signboard sits ground-level beside the pedestal
          pointing toward the orb. */}
      <SkillsForgeOrb position={[-18.9, 2.6, 11.7]} />
      <Signboard
        position={[-19.3, 0, 15.4]}
        rotationY={Math.PI / 2}
        text="SKILLS"
        scale={1.5}
      />
      {/* /blog landmark — Liyue stone book pedestal at POI[3]
          (deep back-left of the hub). Wooden sign sits hub-side. */}
      <BlogLandmark
        position={[HALL_POI_POSITIONS[3][0], 0, HALL_POI_POSITIONS[3][2]]}
      />
      <Signboard
        position={[
          HALL_POI_POSITIONS[3][0] + 2.5,
          0,
          HALL_POI_POSITIONS[3][2] + 3.0,
        ]}
        rotationY={-0.6}
        text="BLOG"
      />
      {/* /resume landmark — Liyue carved-stone stele at POI[4] (east
          rim adjacent to the house). */}
      <ResumeLandmark
        position={[HALL_POI_POSITIONS[4][0], 0, HALL_POI_POSITIONS[4][2]]}
      />
      <Signboard
        position={[
          HALL_POI_POSITIONS[4][0] - 2.8,
          0,
          HALL_POI_POSITIONS[4][2] + 2.6,
        ]}
        rotationY={0.7}
        text="RESUME"
      />
      {/* /contact landmark — Inazuma shrine compound at POI[5] (south
          landing). Twin floating cliffs: main cliff carries the full
          shrine (red torii + climbing stone path lined with toro
          lanterns + plaza + bell pavilion + sky-lantern release deck +
          sacred sakura ema tree + brazier at plaza entrance + komainu +
          chozuya + nobori). Adjacent twin cliff has a mini-torii +
          kitsune fox + furin chime + mini sakura + bamboo, connected
          via chochin paper lanterns strung on rope lines. Off-outcrop
          scenery: satellite floating rocks, bamboo grove, floating
          petals, glow orbs. Authored 2026-05-16 (pivot from the
          abandoned beach concept) under Sumeru cyan-magic palette. The
          brazier sits at the plaza entrance — the cyan beacon orb
          hovers above and is the click target for /contact. */}
      <ContactLandmark
        position={[HALL_POI_POSITIONS[5][0], 0, HALL_POI_POSITIONS[5][2]]}
      />
      {/* Beacon orb hovers above the plaza-entrance brazier. Brazier
          in landmark-local Blender (0, -7.6, 2.8) → GLTF (0, 2.8, 7.6)
          → world (0, 2.8, 45.6) after POI[5] offset. Orb sits a bit
          higher so it's clearly above the flame. */}
      <ContactBeaconOrb position={[0, 4.2, 45.6]} />
      <Signboard
        position={[
          HALL_POI_POSITIONS[5][0] - 3.0,
          0,
          HALL_POI_POSITIONS[5][2] - 3.0,
        ]}
        rotationY={Math.PI / 2}
        text="CONTACT"
        scale={1.5}
      />
      <PoiMarkers />
      <Atmosphere lowFidelity={lowFidelity} staticMode={staticMode} />
    </>
  );
};

export default Scene;
