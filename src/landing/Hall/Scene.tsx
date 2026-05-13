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
import WaterfallFoam from "./WaterfallFoam.tsx";
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
      {/* SkillsForgeOrb is now just the lime navigational orb — per
          user, the React-rendered podium (stone cylinder + brass trim
          + lime screen disc) was removed so every static asset is a
          Blender bake. The orb hovers above the existing GLB pedestal
          column (part of `skl_forge_merged`) + screen (`skl_pedestal_
          screen` lime disc) at world (-22, 1.78, -8.5). We mount it at
          world Y=3 so it floats ~1.2m above the pedestal screen. */}
      <SkillsForgeOrb
        position={[
          HALL_POI_POSITIONS[2][0] + 8.0,
          3.0,
          HALL_POI_POSITIONS[2][2] - 2.5,
        ]}
      />
      {/* Waterfall foam cluster — soft white puffy cloud at the base
          of the waterfall column. Procedurally built in React (7 + 1
          overlapping spheres with TSL-animated semi-transparent
          material) so we can iterate without re-baking the GLB. The
          waterfall column lands at world (POI[2].x - 3, ~0, POI[2].z)
          = (-33, 0, -6); foam centres at the pool surface (y=0.2). */}
      <WaterfallFoam
        position={[
          HALL_POI_POSITIONS[2][0] - 3.0,
          0.2,
          HALL_POI_POSITIONS[2][2],
        ]}
      />
      {/* Skills signboard — planted camera-LEFT of the forge+pedestal
          cluster. The user re-prioritized plank-faces-camera over
          arrow-points-at-target (the prior θ = -π/4 made the plank
          turn nearly edge-on to the focal camera). RotationY chosen so
          the plank's local-+Z normal aligns with the sign → camera
          vector. Camera lives at PoI + (31, 10.5, 6.5) = (1, 12.1, 0.5);
          sign is at (-24.5, 0, -11); planar sign→cam = (+25.5, +11.5);
          rotationY = atan2(25.5, 11.5) ≈ 1.15 rad. Scale 1.5 per user. */}
      <Signboard
        position={[
          HALL_POI_POSITIONS[2][0] + 5.5,
          0,
          HALL_POI_POSITIONS[2][2] - 5.0,
        ]}
        rotationY={1.15}
        text="SKILLS"
        scale={1.5}
      />
      <PoiMarkers />
      <Atmosphere lowFidelity={lowFidelity} staticMode={staticMode} />
    </>
  );
};

export default Scene;
