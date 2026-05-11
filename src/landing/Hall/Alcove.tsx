/** @format */

import React, { useMemo, useState, useCallback } from "react";
import * as THREE from "three";
import {
  HALL_ALCOVE_ORDER,
  HALL_CEILING_HEIGHT,
  HALL_THEMES,
  alcoveCentre,
  alcoveFacing,
} from "../sections.ts";
import type { SectionId } from "../sections.ts";
import Hologram from "./Hologram.tsx";
import type { CanvasContent } from "./HologramContent/canvas-content.ts";
import AboutTimeline from "./HologramContent/AboutTimeline.tsx";
import ProjectTiles from "./HologramContent/ProjectTiles.tsx";
import SkillConstellation from "./HologramContent/SkillConstellation.tsx";
import BlogFeed from "./HologramContent/BlogFeed.tsx";
import ScrollingResume from "./HologramContent/ScrollingResume.tsx";
import ContactArray from "./HologramContent/ContactArray.tsx";

interface AlcoveProps {
  id: SectionId;
  onSelect: (id: SectionId) => void;
  hovered: boolean;
  onHoverChange: (hovered: boolean) => void;
  /** Reduced-motion: lock hologram scanlines/flicker. */
  staticMode?: boolean;
}

const CONTENT_BY_ID: Record<
  SectionId,
  React.FC<{ onTextureReady: (tex: CanvasContent) => void }>
> = {
  about: AboutTimeline,
  projects: ProjectTiles,
  skills: SkillConstellation,
  blog: BlogFeed,
  resume: ScrollingResume,
  contact: ContactArray,
};

/** A single alcove placeholder: arch + back wall + mounted hologram screen.
 *  Geometry positioned in world-space at the alcove's slot around the hub,
 *  rotated so the opening faces the hub centre.
 *
 *  The arch is intentionally simple — at Phase 4 swap-in time the entire
 *  arch + back wall becomes a single `useGLTF` load and this file shrinks
 *  to "load model, mount hologram, capture click".
 */
const Alcove: React.FC<AlcoveProps> = ({
  id,
  onSelect,
  hovered,
  onHoverChange,
  staticMode = false,
}) => {
  const idx = HALL_ALCOVE_ORDER.indexOf(id);
  const centre = alcoveCentre(idx);
  const yaw = alcoveFacing(idx);
  const theme = HALL_THEMES[id];
  const [tex, setTex] = useState<CanvasContent | null>(null);
  const handleTexture = useCallback((c: CanvasContent) => setTex(c), []);
  const ContentRenderer = CONTENT_BY_ID[id];

  const backWallGeom = useMemo(
    () => new THREE.PlaneGeometry(3.8, HALL_CEILING_HEIGHT - 0.1),
    []
  );
  const sideWallGeom = useMemo(
    () => new THREE.PlaneGeometry(2.0, HALL_CEILING_HEIGHT - 0.1),
    []
  );
  const floorGeom = useMemo(() => {
    const g = new THREE.PlaneGeometry(3.8, 2.4);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const archGeom = useMemo(() => {
    const shape = new THREE.Shape();
    const w = 3.6;
    const h = HALL_CEILING_HEIGHT - 0.6;
    shape.moveTo(-w / 2, 0);
    shape.lineTo(-w / 2, h * 0.55);
    shape.quadraticCurveTo(-w / 2, h, 0, h);
    shape.quadraticCurveTo(w / 2, h, w / 2, h * 0.55);
    shape.lineTo(w / 2, 0);
    shape.lineTo(w / 2 + 0.18, 0);
    shape.lineTo(w / 2 + 0.18, h * 0.55);
    shape.quadraticCurveTo(w / 2 + 0.18, h + 0.18, 0, h + 0.18);
    shape.quadraticCurveTo(-w / 2 - 0.18, h + 0.18, -w / 2 - 0.18, h * 0.55);
    shape.lineTo(-w / 2 - 0.18, 0);
    shape.lineTo(-w / 2, 0);
    return new THREE.ShapeGeometry(shape);
  }, []);

  // Distance from hub centre to alcove geometry.
  const wallDepth = 2.2;

  return (
    <group position={[centre[0], 0, centre[2]]} rotation={[0, yaw, 0]}>
      {/* Floor */}
      <mesh
        geometry={floorGeom}
        position={[0, 0.02, -wallDepth / 2 - 0.6]}
        receiveShadow
      >
        <meshStandardMaterial
          color="#13202a"
          metalness={0.2}
          roughness={0.55}
        />
      </mesh>

      {/* Back wall — content holo mounts on this */}
      <mesh
        geometry={backWallGeom}
        position={[0, (HALL_CEILING_HEIGHT - 0.1) / 2, -wallDepth - 0.6]}
        receiveShadow
      >
        <meshStandardMaterial
          color="#0a1a1d"
          metalness={0.3}
          roughness={0.7}
          emissive={theme.accent}
          emissiveIntensity={hovered ? 0.08 : 0.04}
        />
      </mesh>

      {/* Two side walls — angled so the alcove reads as a half-hex pavilion */}
      <mesh
        geometry={sideWallGeom}
        position={[-1.7, (HALL_CEILING_HEIGHT - 0.1) / 2, -wallDepth / 2 - 0.3]}
        rotation={[0, Math.PI / 4, 0]}
      >
        <meshStandardMaterial
          color="#0d2024"
          metalness={0.3}
          roughness={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        geometry={sideWallGeom}
        position={[1.7, (HALL_CEILING_HEIGHT - 0.1) / 2, -wallDepth / 2 - 0.3]}
        rotation={[0, -Math.PI / 4, 0]}
      >
        <meshStandardMaterial
          color="#0d2024"
          metalness={0.3}
          roughness={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Arch silhouette on the hub-facing side */}
      <mesh geometry={archGeom} position={[0, 0, 0.05]}>
        <meshStandardMaterial
          color="#6f4d24"
          metalness={0.85}
          roughness={0.3}
          emissive={theme.accent}
          emissiveIntensity={hovered ? 0.18 : 0.06}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Hologram screen mounted on back wall, slightly forward of it. The
       *  default PlaneGeometry normal points +Z (toward the arch / camera),
       *  so no rotation needed — the alcove group's yaw places it correctly. */}
      <group position={[0, 1.55, -wallDepth - 0.45]}>
        <Hologram
          contentTexture={tex?.texture ?? null}
          color={theme.hologramColor}
          size={[2.6, 1.5]}
          curvature={0.22}
          staticMode={staticMode}
        />
      </group>
      <ContentRenderer onTextureReady={handleTexture} />

      {/* Hit volume for click + hover. Roughly the alcove footprint. */}
      <mesh
        position={[0, 1.2, -wallDepth / 2 - 0.3]}
        visible={false}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverChange(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHoverChange(false);
        }}
      >
        <boxGeometry args={[3.6, 3.4, 2.5]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Practical fill light — warm tungsten low on the back wall, gives
       *  the hologram silhouette separation from the wall behind. */}
      <pointLight
        position={[0, 0.8, -wallDepth - 0.55]}
        intensity={hovered ? 0.65 : 0.4}
        color="#f4d8a8"
        distance={4.5}
        decay={2}
      />
    </group>
  );
};

export default Alcove;

/** Visible-from-hub silhouette for ALL alcoves. Manages per-alcove hover
 *  state in one place so only one hologram is "highlighted" at a time. */
interface AlcovesProps {
  onSelect: (id: SectionId) => void;
  hoveredId: SectionId | null;
  onHoverChange: (id: SectionId | null) => void;
  staticMode?: boolean;
}

export const Alcoves: React.FC<AlcovesProps> = ({
  onSelect,
  hoveredId,
  onHoverChange,
  staticMode,
}) => {
  return (
    <>
      {HALL_ALCOVE_ORDER.map((id) => (
        <Alcove
          key={id}
          id={id}
          onSelect={onSelect}
          hovered={hoveredId === id}
          onHoverChange={(h) => onHoverChange(h ? id : null)}
          staticMode={staticMode}
        />
      ))}
    </>
  );
};
