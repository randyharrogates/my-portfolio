/** @format */

import React, { useMemo } from "react";
import { Environment } from "@react-three/drei";
import Lighting, { tintForHour } from "./Lighting.tsx";
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
import Dust, { DustBeam } from "./Particles.tsx";
import LightShafts from "./LightShafts.tsx";
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
  const tint = useMemo(() => tintForHour(new Date().getHours()), []);
  return (
    <>
      <color attach="background" args={["#1a120a"]} />
      <fogExp2 attach="fog" args={["#241608", 0.085]} />

      {!lowFidelity && (
        <Environment
          files={`${process.env.PUBLIC_URL}/hdri/warm-evening-1k.hdr`}
          background={false}
          environmentIntensity={0.55}
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
      {!lowFidelity && <LightShafts keyColor={tint.key} />}
    </>
  );
};

export default Scene;
