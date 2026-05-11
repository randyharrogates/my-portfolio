/** @format */

import React, { useMemo } from "react";
import { Environment, ContactShadows, SoftShadows } from "@react-three/drei";
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
  mobileLowFi: boolean;
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
  lowFidelity,
  mobileLowFi,
  ambientActive,
  keyboardFocusedId,
  registerMonitorButton,
}) => {
  const tint = useMemo(() => tintForHour(new Date().getHours()), []);
  return (
    <>
      <color attach="background" args={[lowFidelity ? "#2a1c12" : "#1a120a"]} />
      <fogExp2
        attach="fog"
        args={[lowFidelity ? "#3a2418" : "#241608", lowFidelity ? 0.06 : 0.11]}
      />

      {!lowFidelity && (
        <Environment
          files={`${process.env.PUBLIC_URL}/hdri/warm-evening-1k.hdr`}
          background={false}
          environmentIntensity={1.15}
        />
      )}

      {/* PCSS-style soft shadows: contact-distance penumbra (tight at the
       *  foot of a desk leg, soft at the floor). Mutates the shadow shader
       *  globally so all shadow-casting lights pick it up. Gated to non-
       *  lowFidelity since the extra sampling has a per-frame cost. */}
      {!lowFidelity && <SoftShadows size={25} focus={0.5} samples={8} />}

      <Lighting lowFidelity={lowFidelity} />

      <Room tint={tint} lowFidelity={lowFidelity} reducedMotion={reducedMotion} />

      {/* Real grounding under the whole workstation. Captures chair, plant,
       *  monitor stalks, mug, etc., onto the floor. Cheaper than baking
       *  shadow maps and reads as proper contact. */}
      <ContactShadows
        position={[0, -0.905, 0]}
        scale={10}
        blur={2}
        far={2}
        opacity={0.45}
        frames={lowFidelity ? 1 : 20}
        resolution={lowFidelity ? 256 : 384}
      />

      <Desk lowFidelity={lowFidelity} reducedMotion={reducedMotion} />
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

      {!mobileLowFi && (
        <Dust active={ambientActive} reducedMotion={reducedMotion} />
      )}
      {!lowFidelity && (
        <DustBeam active={ambientActive} reducedMotion={reducedMotion} />
      )}
      {!lowFidelity && <LightShafts keyColor={tint.key} />}
    </>
  );
};

export default Scene;
