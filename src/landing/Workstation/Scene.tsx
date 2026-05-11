/** @format */

import React, { useMemo } from "react";
import { ContactShadows } from "@react-three/drei";
import Lighting, { tintForHour } from "./Lighting.tsx";
import Desk from "./Desk.tsx";
import Monitor from "./Monitor.tsx";
import Room from "./Room.tsx";
import {
  Keyboard,
  Trackpad,
  Mug,
  Notebook,
  ServerTower,
  ServerRackPanel,
  Chair,
} from "./Props.tsx";
import Plant from "./Plant.tsx";
import Dust from "./Particles.tsx";
import { SECTIONS } from "../sections.ts";
import {
  Nameplate,
  FramedPhoto,
  TechStickers,
  RoleMarquee,
} from "./identity-decals.tsx";

interface SceneProps {
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  onClickSection: (id: string) => void;
  flashAmount: number;
  matrixRain: boolean;
  reducedMotion: boolean;
  konami: boolean;
  avatarUrl?: string | null;
  ambientActive: boolean;
  keyboardFocusedId: string | null;
  registerMonitorButton: (id: string, el: HTMLButtonElement | null) => void;
}

const Scene: React.FC<SceneProps> = ({
  hoveredId,
  setHoveredId,
  onClickSection,
  flashAmount,
  matrixRain,
  reducedMotion,
  konami,
  avatarUrl,
  ambientActive,
  keyboardFocusedId,
  registerMonitorButton,
}) => {
  const tint = useMemo(() => tintForHour(new Date().getHours()), []);
  return (
    <>
      <color attach="background" args={["#1a120a"]} />
      <fogExp2 attach="fog" args={["#241608", 0.11]} />

      <Lighting />

      <Room tint={tint} reducedMotion={reducedMotion} />

      {/* Real grounding under the whole workstation. Captures chair, plant,
       *  monitor stalks, mug, etc., onto the floor. */}
      <ContactShadows
        position={[0, -0.905, 0]}
        scale={10}
        blur={2}
        far={2}
        opacity={0.45}
        frames={1}
        resolution={256}
      />

      <Desk />
      <Keyboard reducedMotion={reducedMotion} />
      <Trackpad />
      <Mug reducedMotion={reducedMotion} />
      <Notebook />
      <ServerTower reducedMotion={reducedMotion} konami={konami} />
      <ServerRackPanel />
      <Chair reducedMotion={reducedMotion} konami={konami} />
      <Plant reducedMotion={reducedMotion} />

      <Nameplate />
      <FramedPhoto avatarUrl={avatarUrl} />
      <TechStickers />
      <RoleMarquee active={!matrixRain} />

      {SECTIONS.map((cfg, i) => (
        <Monitor
          key={cfg.id}
          cfg={cfg}
          hovered={hoveredId === cfg.id}
          flashAmount={hoveredId === cfg.id ? flashAmount : 0}
          matrixRain={matrixRain}
          reducedMotion={reducedMotion}
          onPointerOver={() => setHoveredId(cfg.id)}
          onPointerOut={() => setHoveredId(null)}
          onClick={() => onClickSection(cfg.id)}
          a11yTabIndex={i + 1}
          registerButton={registerMonitorButton}
          keyboardFocused={keyboardFocusedId === cfg.id}
        />
      ))}

      <Dust active={ambientActive} reducedMotion={reducedMotion} />
    </>
  );
};

export default Scene;
