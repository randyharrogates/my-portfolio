/** @format */

import React from "react";
import Island from "./Island.tsx";
import HubScatter from "./HubScatter.tsx";
import CloudSea from "./CloudSea.tsx";
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
import BlogTomeOrb from "./BlogTomeOrb.tsx";
import ResumeLandmark from "./ResumeLandmark.tsx";
import ResumeScrollOrb from "./ResumeScrollOrb.tsx";
import ContactLandmark from "./ContactLandmark.tsx";
import ContactBeaconOrb from "./ContactBeaconOrb.tsx";
import Signboard from "./Signboard.tsx";
import PoiLabels from "./PoiLabels.tsx";
import { OrbPulseProvider } from "./OrbPulseProvider.tsx";
import { HALL_POI_POSITIONS } from "../sections.ts";

interface SceneProps {
  lowFidelity: boolean;
  staticMode: boolean;
  /** Show POI labels above each landmark — gated on gear-panel setting. */
  poiLabels?: boolean;
  /** Pulse the 6 orbs (first-visit tutorial). */
  bootActive?: boolean;
}

/** Archipelago hub scene — Genshin-inspired stylized (locked 2026-05-15).
 *
 *  Mounts the painted skybox + lighting rig + hub disc + the six
 *  per-section landmarks (about / projects / skills / blog / resume /
 *  contact) under the Inazuma sakura-dusk + Sumeru cyan-magic-night
 *  aesthetic. Disc-level foliage scatter was killed 2026-05-16 per the
 *  Genshin pivot KILL list (no more pastel cone trees or grass tufts on
 *  the hub); the new hub disc carries painted-stone topology only. The
 *  river-of-life chevron (skills → projects → about) is carved into the
 *  hub disc as dry channel geometry — the water surface on top remains
 *  deferred to a future `connections.glb` pass.
 */
const Scene: React.FC<SceneProps> = ({
  lowFidelity,
  staticMode,
  poiLabels = false,
  bootActive = false,
}) => {
  return (
    <OrbPulseProvider bootActive={bootActive}>
      <Skybox />
      <EnvironmentRig />
      <fog attach="fog" args={["#1a0b30", 160, 360]} />
      <Lighting lowFidelity={lowFidelity} />
      {/* Cloud sea — dense Genshin-style Sea of Clouds below+around the
          disc. 330 (high) / 165 (low) cloud instances in 3 layers
          (floor + side belt + upper stragglers). Drifts +x at 0.05 m/s
          unless staticMode. Rendered behind disc (renderOrder=-1). */}
      <CloudSea lowFidelity={lowFidelity} staticMode={staticMode} />
      <Island />
      {/* Hub scatter belt — Genshin forest ring at disc periphery (~692
          instances of trees/grass/boulders/lanterns/ferns/etc, instanced
          via InstancedMesh). Also carries the 5 pre-positioned floating
          crystal-rock clusters above the contact cove + 5 cartoon-water
          meshes (mini-pond + 2 streams + 2 mini-waterfalls). Authored
          2026-05-17 in `blender/hall-master.blend`. */}
      <HubScatter lowFidelity={lowFidelity} />
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
        text="PROJECTS"
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
      {/* /blog landmark — Mondstadt cottage bookhouse + Sumeru-Akademiya
          magical-library accents + continuous ridge backdrop at POI[3].
          Front-yard centerpiece: stone-book-stack pedestal with floating
          tome + ring of rune pillars + Akademiya sigil disc above. The
          cyan-magic BlogTomeOrb hovers above the floating tome — the
          click target for navigation. Wooden sign sits on the +Z
          (camera-facing) side. */}
      <BlogLandmark
        position={[HALL_POI_POSITIONS[3][0], 0, HALL_POI_POSITIONS[3][2]]}
      />
      {/* Orb hovers above the pedestal's floating tome. Blender-local
          orb pad authored at (0, -9, 4.70); glTF Y-up swap → (0, 4.70, 9)
          → world (POI[3].x, 4.70, POI[3].z + 9). */}
      <BlogTomeOrb
        position={[
          HALL_POI_POSITIONS[3][0],
          4.7,
          HALL_POI_POSITIONS[3][2] + 9,
        ]}
      />
      {/* Sign sits LEFT of the orb so its right-pointing arrow (→ in the
          painted text) directs the eye toward the floating orb. Slight
          rotationY=+0.3 angles the sign face toward the orbital camera
          while pointing the arrow direction toward the orb at +X. */}
      <Signboard
        position={[
          HALL_POI_POSITIONS[3][0] - 3.0,
          0,
          HALL_POI_POSITIONS[3][2] + 10.0,
        ]}
        rotationY={0.3}
        text="BLOG"
      />
      {/* /resume landmark — Sumeru Akademiya floating satellite NORTH-EAST
          of skills' floating mini-island, 3m higher than its top surface.
          POI[4] = (-15, 28, -55); skills' mini-island center world (-5,
          ~22, -21) with top surface Y = 25.1 and ~20m radius. Resume
          satellite is offset 10m east of skills' west edge and 14m
          north of its north edge.
          Floating cliff disc carries an octagonal Akademiya hall with
          cyan crystal columns, dome roof, and a writing desk at hall
          centre holding a rune-glowing floating scroll (the orb's
          anchor). Ring of cyan crystal spires + floating Akademiya
          tomes + sigil discs + drifting papers surrounds the hall. A
          Sumeru stone arch bridge descends south from the resume
          satellite (Y=27.5) to skills' mini-island top (Y=25.1),
          spanning ~10m and dropping 2.6m. Warm-yellow lanterns provide
          chromatic counterpoint to the cyan dominant. Landmark group
          is mounted at world Y = POI - 0.5 so the GLB's local origin
          (the island top surface) sits ~0.5 m below the POI marker. */}
      <ResumeLandmark
        position={[
          HALL_POI_POSITIONS[4][0],
          HALL_POI_POSITIONS[4][1] - 0.5,
          HALL_POI_POSITIONS[4][2],
        ]}
      />
      {/* Orb hovers ~1m above the Akademiya floating scroll on the desk.
          Scroll is at landmark-local Blender (0, 0, 1.51) → world Y=19.01;
          orb at POI Y + 2.0 = 20.0 → 1m above scroll. */}
      <ResumeScrollOrb
        position={[
          HALL_POI_POSITIONS[4][0],
          HALL_POI_POSITIONS[4][1] + 2.0,
          HALL_POI_POSITIONS[4][2],
        ]}
      />
      {/* Floating sign — plank only, no post/chain risers. Positioned SW of
          the resume orb at world (-22, 30, -52) so its painted →
          arrow points NE directly at the orb at world (-15, 30, -55).
          rotationY = 0.404 rad (~23°) → plank face points SE so the
          texture is readable from the canonical camera at (+25, 40, 35). */}
      <Signboard
        position={[
          HALL_POI_POSITIONS[4][0] - 7.0,
          HALL_POI_POSITIONS[4][1] + 2.0,
          HALL_POI_POSITIONS[4][2] + 3.0,
        ]}
        rotationY={0.404}
        text="RESUME"
        scale={2.4}
        floating
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
      {/* Contact signboard — ground-mounted post, west of the beacon orb
          at world (0, 4.2, 45.6). Sign post base at world (-12, 0, 45)
          so the painted → arrow direction (cos 0, 0, -sin 0) = (1, 0, 0)
          aims east toward the orb. Plank face direction (sin 0, 0, cos 0)
          = (0, 0, 1) points south, toward the SW canonical camera at
          (-20, 22, 65) — slight angle keeps the texture readable from
          the default pose. */}
      <Signboard
        position={[
          HALL_POI_POSITIONS[5][0] - 12.0,
          0,
          HALL_POI_POSITIONS[5][2] + 7.0,
        ]}
        rotationY={0}
        text="CONTACT"
        scale={1.5}
      />
      <PoiMarkers />
      <PoiLabels enabled={poiLabels} />
      <Atmosphere lowFidelity={lowFidelity} staticMode={staticMode} />
    </OrbPulseProvider>
  );
};

export default Scene;
