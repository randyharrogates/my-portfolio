/** @format */

import React from "react";
import Island from "./Island.tsx";
import Atmosphere from "./Atmosphere.tsx";
import Lighting from "./Lighting.tsx";
import Skybox from "./Skybox.tsx";
import GridFloor from "./GridFloor.tsx";
import PoiMarkers from "./PoiMarkers.tsx";
import AboutLandmark from "./AboutLandmark.tsx";
import EnterHouseOrb from "./EnterHouseOrb.tsx";
import ProjectsLandmark from "./ProjectsLandmark.tsx";
import ProjectsTerminalOrb from "./ProjectsTerminalOrb.tsx";
import SkillsLandmark from "./SkillsLandmark.tsx";
import SkillsForgeOrb from "./SkillsForgeOrb.tsx";
import UpperIsland from "./UpperIsland.tsx";
import WaterfallFoam from "./WaterfallFoam.tsx";
import WaterfallMist from "./WaterfallMist.tsx";
import WaterfallSpray from "./WaterfallSpray.tsx";
import WaterfallTSL from "./WaterfallTSL.tsx";
// WaterfallVideo (commit 9c0cc19) was an experimental Cycles-render-as-
// video-billboard. Disabled 2026-05-14 in favour of the new pipeline:
// TSL-displaced mesh + FLIP-baked flow maps. Component file kept in
// source for shader/pattern reference.
// import WaterfallVideo from "./WaterfallVideo.tsx";
import Signboard from "./Signboard.tsx";
import { HALL_POI_POSITIONS } from "../sections.ts";

interface SceneProps {
  lowFidelity: boolean;
  staticMode: boolean;
}

/** Archipelago hub scene: neon-dusk gradient skybox + hub island +
 *  atmosphere motes + lighting rig. Phase 3 style overlay landed
 *  2026-05-12 — replaced the daylight Drakensberg HDRI with a
 *  procedural gradient sphere; rewrote the lighting rig for
 *  neon-on-dark; recoloured fog/motes for the saturated palette.
 */
const Scene: React.FC<SceneProps> = ({ lowFidelity, staticMode }) => {
  return (
    <>
      <Skybox />
      <fog attach="fog" args={["#1a0b30", 160, 360]} />
      <Lighting lowFidelity={lowFidelity} />
      <GridFloor />
      <Island />
      {/* About landmark — house + environment (yard, pond, plants,
          mailbox, path stones) loaded as two separate GLBs so the
          environment can be re-positioned / re-styled / regenerated
          independently of the dwelling. Both sit at the front-centre
          PoI spot (index 0 in HALL_ALCOVE_ORDER); y is dropped to 0
          since the assets bake their own vertical extent. */}
      <AboutLandmark
        position={[HALL_POI_POSITIONS[0][0], 0, HALL_POI_POSITIONS[0][2]]}
      />
      {/* Doorway orb — clicking enters the house i.e. routes to the
          terminal workstation at "/". Positioned just in front of the
          house's +Z (door) face at eye-height so it reads from the
          /hall/about camera pose. Stays small on the wide /hall view. */}
      <EnterHouseOrb
        position={[
          HALL_POI_POSITIONS[0][0],
          2.3,
          HALL_POI_POSITIONS[0][2] + 4.8,
        ]}
      />
      {/* Funky hand-painted signboard, planted to the camera-LEFT of the
          doorway orb. Arrow on the plank visually points to the orb so
          the user reads "ABOUT ME →" then their eye follows the arrow
          straight to the glowing orb. RotationY 0.5 rad ≈ 28°: plank
          face turns toward the /hall/about camera (which sits at +X +Z),
          and the local-+X arrow direction lands on the orb's world
          position to the upper-right. */}
      <Signboard
        position={[
          HALL_POI_POSITIONS[0][0] - 2.5,
          0,
          HALL_POI_POSITIONS[0][2] + 6.0,
        ]}
        rotationY={0.5}
        text="ABOUT ME"
      />
      {/* /projects landmark — crashed mecha-satellite at the east rim.
          The wreck itself is clickable -> /hall/projects close-up. The
          terminal orb sits ~3.8m above the terminal console screen and
          jumps straight to /projects/credit-memo. World position takes
          the PoI's planar (x,z) and grounds y to 0 (asset bakes its
          own vertical extent + crash tilt). */}
      <ProjectsLandmark
        position={[HALL_POI_POSITIONS[1][0], 0, HALL_POI_POSITIONS[1][2]]}
      />
      {/* Terminal orb: hovers above the standalone GROUND pedestal beside
          the wreck. Pedestal was authored in Blender at (9.0, 2.5) on the
          ground with the screen at z=1.62. With Blender's export_yup, the
          Blender (x, y, z) → Three (x, z, -y), so the screen lands in world
          coords at (POI[1].x + 9.0, 1.62, POI[1].z + (-2.5)) =
          (POI[1].x + 9.0, 1.62, POI[1].z - 2.5). Orb sits ~1.4 m above. */}
      <ProjectsTerminalOrb
        position={[
          HALL_POI_POSITIONS[1][0] + 9.0,
          3.0,
          HALL_POI_POSITIONS[1][2] - 2.5,
        ]}
      />
      {/* Projects signboard — same hand-painted plank style as the house
          ABOUT ME sign, but planted to the camera-LEFT of the doorway-
          equivalent (the ground pedestal). Arrow on the plank points
          right-up toward the teal orb hovering over the pedestal. */}
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
      {/* /skills landmark — 3-tier waterfall pouring off the west cliff
          + forge platform (anvil, hammer, tool rack, sword) on the
          bank. Mounted at HALL_POI_POSITIONS[2] = (-30, _, -6). The
          wreck-equivalent (the whole landmark) routes to /hall/skills;
          the lime forge-orb above the pedestal jumps to /skills. */}
      <SkillsLandmark
        position={[HALL_POI_POSITIONS[2][0], 0, HALL_POI_POSITIONS[2][2]]}
      />
      {/* Forge orb: hovers above the standalone GROUND pedestal beside
          the river. Pedestal was authored in Blender at (8.0, 2.5) on
          the ground with the screen at z=1.78. With Blender's export_yup,
          Blender (x, y, z) → Three (x, z, -y), so the screen lands at
          world (POI[2].x + 8.0, 1.78, POI[2].z - 2.5). Orb sits ~1.2 m
          above. */}
      {/* SkillsForgeOrb is just the lime navigational orb. It floats
          ~1.2m above the (relocated) Blender pedestal screen, which
          moved with the rest of the forge group by Δ=(+2.5, 0, -4.5)
          inside SkillsLandmark.tsx so that the entire terminal lands
          where the SKILLS signboard's arrow points. New screen world
          position = POI[2] + (10.5, 1.78, -7) = (-19.5, 1.78, -13);
          orb sits world-Y=3 above that → world (-19.5, 3.0, -13). */}
      <SkillsForgeOrb
        position={[
          HALL_POI_POSITIONS[2][0] + 10.5,
          3.0,
          HALL_POI_POSITIONS[2][2] - 7.0,
        ]}
      />
      {/* Witcher 2-tier waterfall — spills over the east edge of the
          UPPER FLOATING ISLAND (carved spill notch at landmark-local
          x=+22, z=44). Mounted with its TOP at the cliff plateau height
          (y=44 world ≈ y=44 landmark) and its BASE on the ground (y=0).
          Mesh is the 4×36m curved sheet from waterfall-tsl.glb; scaled
          to (1.7, 44/36, 1.0) so it spans the full 44m drop and the
          wider 7m spill at the cliff edge. Shader is the AAA stack
          (multi-layered scrolling normals + multi-stream split via 3 U
          bands + foam cells + flow streaks + fresnel + Beckmann spec).
          Spray + mist add the impact-zone details. */}
      <group
        position={[
          HALL_POI_POSITIONS[2][0] + 22.0,
          0,
          HALL_POI_POSITIONS[2][2],
        ]}
        scale={[1.7, 44 / 36, 1.0]}
      >
        <WaterfallTSL position={[0, 0, 0]} />
      </group>
      {/* TSL-instanced particle spray at the impact zone — 2000 droplets
          following parabolic trajectories from the splash point. */}
      <WaterfallSpray
        position={[
          HALL_POI_POSITIONS[2][0] + 22.0,
          0.5,
          HALL_POI_POSITIONS[2][2],
        ]}
        count={2000}
      />
      {/* Stacked planar mist discs above the impact zone — substitute
          for real volumetric fog (which WebGPU doesn't support). */}
      <WaterfallMist
        position={[
          HALL_POI_POSITIONS[2][0] + 22.0,
          0.0,
          HALL_POI_POSITIONS[2][2],
        ]}
        radius={6.5}
        height={3.0}
      />
      {/* Witcher 2-tier upper floating island authored 2026-05-14 in
          blender/skills-cliff.blend. Replaces the dark low-poly elevated
          portion of skl_ground_merged. Saucer-shaped: ~54×44m at the top
          plateau, tapering down to underside stalactite spikes around
          z_world=12. Pool basin sits on the plateau near x=-3,z=0 in
          landmark-local coords (where the existing waterfall originates).
          Mounted at the skills POI so the GLB's internal landmark-local
          coords align with the rest of the landmark. The redundant
          elevated portion of skl_ground_merged is hidden inside
          SkillsLandmark.tsx via a face-Y filter. */}
      <UpperIsland
        position={[
          HALL_POI_POSITIONS[2][0],
          0,
          HALL_POI_POSITIONS[2][2],
        ]}
      />
      {/* Waterfall foam cluster — soft white puffy cloud at the base
          of the new waterfall position (east edge of upper island). */}
      <WaterfallFoam
        position={[
          HALL_POI_POSITIONS[2][0] + 22.0,
          0.2,
          HALL_POI_POSITIONS[2][2],
        ]}
      />
      {/* Greenery (trees + bushes + rocks) is now Cycles-baked in the
          GLB as three merged meshes: skl_greenery_trees, _bushes,
          _rocks. Each ships its own baseColor + tangent-space normal
          texture; the standard hasBaseTexture branch in convert
          ToNodeMaterials() pipes the bake through emissive at 0.30
          intensity so the props read in the dim scene. */}
      {/* River is now `skl_river_v2` inside landmark-skills.glb —
          Cycles-baked ribbon authored in Blender on 2026-05-13 with
          Voronoi caustic baseColor + tangent-space normal +
          roughness maps. SkillsLandmark's buildRiverV2Material()
          scrolls U on the colour sample at runtime for the flow
          animation; normal/roughness stay static so the surface
          relief is anchored. */}
      {/* Skills signboard — planted camera-LEFT of the relocated
          terminal. Plank faces the focal camera; arrow on the plank
          (local +X) is the visual cue for where to look. Camera now
          at PoI + (36, 12, 7.5) = (6, 13.6, 1.5); sign at (-24.5, 0,
          -11); planar sign→cam = (+30.5, +12.5); rotationY =
          atan2(30.5, 12.5) ≈ 1.18 rad. Scale 1.5 per user. */}
      <Signboard
        position={[
          HALL_POI_POSITIONS[2][0] + 5.5,
          0,
          HALL_POI_POSITIONS[2][2] - 5.0,
        ]}
        rotationY={1.18}
        text="SKILLS"
        scale={1.5}
      />
      <PoiMarkers />
      <Atmosphere lowFidelity={lowFidelity} staticMode={staticMode} />
    </>
  );
};

export default Scene;
