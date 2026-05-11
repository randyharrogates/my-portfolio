/** @format */

import React from "react";
import Hub from "./Hub.tsx";
import { Alcoves } from "./Alcove.tsx";
import Atmosphere from "./Atmosphere.tsx";
import Lighting from "./Lighting.tsx";
import Entrance from "./Entrance.tsx";
import type { SectionId } from "../sections.ts";

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
      <fog attach="fog" args={["#0a1014", 8, 28]} />
      <color attach="background" args={["#06090b"]} />
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
