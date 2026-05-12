/** @format */

import React from "react";
import { Environment } from "@react-three/drei";
import Hub from "./Hub.tsx";
import { Alcoves } from "./Alcove.tsx";
import Atmosphere from "./Atmosphere.tsx";
import Lighting from "./Lighting.tsx";
import Entrance from "./Entrance.tsx";
import type { SectionId } from "../sections.ts";

// Session 22: custom Wakandan-dusk HDRI baked via
// `blender/scripts/atmo/skybox-bake.py`. Deep navy zenith → warm
// magenta horizon band → amber sun glow → dark base. Replaces the
// previous Drakensberg mountain photo for a cinematic dusk feel.
const VISTA_HDRI = `${process.env.PUBLIC_URL}/hdri/hall-vista.hdr`;

interface SceneProps {
  hoveredId: SectionId | null;
  onAlcoveHover: (id: SectionId | null) => void;
  onAlcoveSelect: (id: SectionId) => void;
  lowFidelity: boolean;
  staticMode: boolean;
  /** True while the door+hallway prologue is mounted (intro or entering). */
  showEntrance: boolean;
  /** True only during the intro phase — door is intact and clickable. */
  entranceClosed: boolean;
  /** Fires when the user clicks the door or activates the keyboard fallback. */
  onEnterDoor: () => void;
}

/** Composes hub + 6 alcoves + atmosphere + lighting + scene-level fog.
 *  Mounted inside a single Canvas in HallLanding. */
const Scene: React.FC<SceneProps> = ({
  hoveredId,
  onAlcoveHover,
  onAlcoveSelect,
  lowFidelity,
  staticMode,
  showEntrance,
  entranceClosed,
  onEnterDoor,
}) => {
  return (
    <>
      {/* Session 26 daylight Drakensberg HDRI as both scene background AND
          IBL. backgroundIntensity 0.65 keeps the daylight punchy through
          the arched windows without blowing out the highlights;
          environmentIntensity 0.55 keeps the interior cool + dim —
          matching the reference's dramatic interior/exterior contrast. */}
      {!lowFidelity && (
        <Environment
          files={VISTA_HDRI}
          background
          backgroundBlurriness={0.08}
          backgroundIntensity={0.65}
          environmentIntensity={0.55}
        />
      )}
      {/* Fallback for low-fidelity mode where Environment is skipped — solid
          cool grey so the dome glass doesn't render against transparent. */}
      {lowFidelity && <color attach="background" args={["#5a6b7a"]} />}
      {/* Cool atmospheric haze fog matching the daylight palette; far pushed
       *  past the outer wall + 30 m corridor so they stay readable from the
       *  boot pose. */}
      <fog attach="fog" args={["#8090a0", 22, 90]} />
      <Lighting lowFidelity={lowFidelity} />
      <Hub />
      <Alcoves
        onSelect={onAlcoveSelect}
        hoveredId={hoveredId}
        onHoverChange={onAlcoveHover}
        staticMode={staticMode}
      />
      <Atmosphere lowFidelity={lowFidelity} staticMode={staticMode} />
      {showEntrance && (
        <Entrance closed={entranceClosed} onEnter={onEnterDoor} />
      )}
      {/* Background floor extension for off-camera framing — solid dark plane
       *  well below the hub so god-ray cone clips into something instead of
       *  disappearing into the fog. */}
      <mesh
        position={[0, -0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#05080a" roughness={1} metalness={0} />
      </mesh>
    </>
  );
};

export default Scene;
