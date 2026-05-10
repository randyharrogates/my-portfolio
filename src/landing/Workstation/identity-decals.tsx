/** @format */

import React, { useMemo } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import {
  portfolioData,
  topNByProficiency,
} from "../../data/portfolio.ts";
import { CHIP_HEX } from "../../styles/terminal-theme.ts";

const ACCENT = "#e8632a";

const STATUS_COLOR: Record<string, string> = {
  available: "#4ade80",
  open: "#e8632a",
  employed: "#60a5fa",
};

export function statusColor(): string {
  return STATUS_COLOR[portfolioData.identity.status] || ACCENT;
}

/** Nameplate text under desk LED strip. */
export const Nameplate: React.FC = () => (
  <Text
    position={[0, -0.082, 0.81]}
    rotation={[-Math.PI / 2, 0, 0]}
    fontSize={0.05}
    color={ACCENT}
    anchorX="center"
    anchorY="middle"
    letterSpacing={0.18}
  >
    {portfolioData.identity.name.toUpperCase()}
  </Text>
);

/** Desk-top photo frame — uses GitHub avatar texture if available, else portrait card. */
interface FramedPhotoProps {
  avatarUrl?: string | null;
}
export const FramedPhoto: React.FC<FramedPhotoProps> = ({ avatarUrl }) => {
  const tex = useMemo(() => {
    if (!avatarUrl) return null;
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    return loader.load(avatarUrl);
  }, [avatarUrl]);

  return (
    <group position={[-0.95, 0.04, 0.45]} rotation={[-0.08, 0.35, 0]}>
      {/* Frame */}
      <mesh castShadow>
        <boxGeometry args={[0.18, 0.22, 0.025]} />
        <meshStandardMaterial
          color="#1a1714"
          roughness={0.6}
          metalness={0.3}
          envMapIntensity={0.8}
        />
      </mesh>
      {/* Mount */}
      <mesh position={[0, 0, 0.014]}>
        <planeGeometry args={[0.15, 0.18]} />
        {tex ? (
          <meshStandardMaterial map={tex} roughness={0.7} />
        ) : (
          <meshStandardMaterial color="#23201d" roughness={0.6} />
        )}
      </mesh>
      <Text
        position={[0, -0.115, 0.014]}
        fontSize={0.018}
        color="#5a5450"
        anchorX="center"
        anchorY="middle"
      >
        {portfolioData.identity.role}
      </Text>
      {/* Easel stand — keeps the frame from floating on the desk surface. */}
      <mesh position={[0, 0, -0.025]} rotation={[0, 0, 0.21]} castShadow>
        <boxGeometry args={[0.04, 0.18, 0.015]} />
        <meshStandardMaterial color="#13110f" roughness={0.7} metalness={0.2} envMapIntensity={0.8} />
      </mesh>
    </group>
  );
};

/** Top-5 tech sticker decals on the laptop / desk corner. */
export const TechStickers: React.FC = () => {
  const top5 = useMemo(
    () => topNByProficiency(portfolioData.techStack, 5),
    []
  );
  return (
    <group position={[-1.4, 0.045, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
      {top5.map((tech, i) => {
        const x = (i - 2) * 0.07;
        return (
          <group key={tech.id} position={[x, 0, 0]}>
            <mesh>
              <circleGeometry args={[0.03, 24]} />
              <meshStandardMaterial
                color={CHIP_HEX[tech.color]}
                emissive={CHIP_HEX[tech.color]}
                emissiveIntensity={0.18}
                roughness={0.7}
              />
            </mesh>
            <Text
              position={[0, 0, 0.001]}
              fontSize={0.013}
              color="#0c0b0a"
              anchorX="center"
              anchorY="middle"
              maxWidth={0.052}
            >
              {tech.name.length > 8 ? tech.name.slice(0, 7) + "…" : tech.name}
            </Text>
          </group>
        );
      })}
    </group>
  );
};

/** Marquee scrolling across a small inset under the bottom-right monitor. */
interface MarqueeProps {
  active: boolean;
}
export const RoleMarquee: React.FC<MarqueeProps> = ({ active }) => {
  const data = portfolioData;
  const text = `${data.identity.role.toUpperCase()} · ${data.identity.yoe} YOE · ${data.interests.join(" · ").toUpperCase()}`;
  // Repeat to make scrolling feel continuous.
  const repeated = `${text}     ·     ${text}`;

  return (
    <group position={[2.18, 0.18, -0.2]} rotation={[0, -Math.PI / 2.4, 0]}>
      <mesh>
        <boxGeometry args={[0.6, 0.06, 0.012]} />
        <meshStandardMaterial color="#0a0908" roughness={0.9} />
      </mesh>
      <Text
        position={[active ? 0 : -0.3, 0, 0.008]}
        fontSize={0.028}
        color="#5a5450"
        anchorX="center"
        anchorY="middle"
        outlineColor={ACCENT}
        outlineWidth={0.0006}
      >
        {repeated}
      </Text>
    </group>
  );
};
