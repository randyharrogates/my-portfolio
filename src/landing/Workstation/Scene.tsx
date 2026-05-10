/** @format */

import React from "react";
import { Environment } from "@react-three/drei";
import Lighting from "./Lighting.tsx";
import Desk from "./Desk.tsx";
import Monitor from "./Monitor.tsx";
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
import Dust, { DustBeam } from "./Particles.tsx";
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
  lowFidelity: boolean;
  ambientActive: boolean;
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
  lowFidelity,
  ambientActive,
}) => {
  return (
    <>
      <color attach="background" args={["#070605"]} />
      <fog attach="fog" args={["#0a0807", 8, 22]} />

      {!lowFidelity && (
        <Environment
          preset="apartment"
          background={false}
          environmentIntensity={0.35}
        />
      )}

      <Lighting lowFidelity={lowFidelity} />

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

      {SECTIONS.map((cfg) => (
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
        />
      ))}

      <Dust active={ambientActive} reducedMotion={reducedMotion} />
      {!lowFidelity && (
        <DustBeam active={ambientActive} reducedMotion={reducedMotion} />
      )}
    </>
  );
};

export default Scene;
