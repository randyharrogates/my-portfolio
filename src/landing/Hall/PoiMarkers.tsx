/** @format */

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useNavigate } from "react-router-dom";
import {
  float,
  length,
  mix,
  oneMinus,
  positionLocal,
  pow,
  smoothstep,
  uniform,
} from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";
import {
  HALL_ALCOVE_ORDER,
  HALL_POI_POSITIONS,
  HALL_THEMES,
} from "../sections.ts";
import type { SectionId } from "../sections.ts";

/** Sections that have an authored landmark (GLB or procedural). The
 *  PoI marker is suppressed for these so we don't render an orb on top
 *  of the landmark itself. */
const HAS_LANDMARK = new Set<SectionId>(["about", "projects", "skills"]);

interface MarkerProps {
  position: [number, number, number];
  color: string;
  /** Per-marker phase so the bob/pulse doesn't sync across the ring. */
  phase: number;
  /** Optional click handler — fires navigation when the user clicks the orb. */
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

/** Glowing orb floating just above the hub island top. Used as a
 *  navigation marker for the section it represents. The orb has:
 *  - A solid inner sphere with the section's accent colour, lit by a
 *    TSL graph that brightens the centre toward white so the silhouette
 *    against the magenta sky reads.
 *  - A thin outer halo sphere with additive blending — gives a soft
 *    bloom-like glow without depending on a real post-process pass.
 *
 *  The whole rig bobs vertically on a slow sin wave so the marker
 *  feels alive, not painted. */
const Marker: React.FC<MarkerProps> = ({ position, color, phase, onClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  const phaseRef = useRef(phase);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const bob = Math.sin(t * 1.2 + phaseRef.current) * 0.35;
    groupRef.current.position.y = position[1] + bob;
  });

  // Solid inner orb material.
  const innerMaterial = useMemo(() => {
    const uColor = uniform(new THREE.Color(color));
    // Distance from sphere centre in local space; sphere radius is 1.
    const r = length(positionLocal);
    // Lift the centre toward white so the orb has a hot core that
    // reads as a glow against the saturated skybox.
    const coreLift = oneMinus(smoothstep(float(0.0), float(0.85), r));
    const lifted = uColor.add(coreLift.mul(0.6));
    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = lifted;
    mat.fog = false;
    return mat;
  }, [color]);

  // Soft outer halo. Falloff is sharper than the inner orb so the halo
  // reads as a glow ring rather than a second solid sphere.
  const haloMaterial = useMemo(() => {
    const uColor = uniform(new THREE.Color(color));
    const r = length(positionLocal);
    const falloff = pow(
      oneMinus(smoothstep(float(0.6), float(1.0), r)),
      1.6
    );
    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = mix(uColor, uColor.add(0.3), falloff);
    mat.opacityNode = falloff.mul(0.55);
    mat.transparent = true;
    mat.depthWrite = false;
    mat.blending = THREE.AdditiveBlending;
    mat.fog = false;
    return mat;
  }, [color]);

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={onClick}
      onPointerOver={(e) => {
        if (!onClick) return;
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        if (!onClick) return;
        document.body.style.cursor = "";
      }}
    >
      <mesh>
        <sphereGeometry args={[0.55, 24, 16]} />
        <primitive object={innerMaterial} attach="material" />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.4, 24, 16]} />
        <primitive object={haloMaterial} attach="material" />
      </mesh>
    </group>
  );
};

/** Phase 6 — six PoI markers on the hub island top, one per section.
 *  Each is a floating glowing orb tinted with the section's accent
 *  from `HALL_THEMES`. The camera flies to the orb's `poiFocalPose`
 *  when the URL hash matches that section. */
const PoiMarkers: React.FC = () => {
  const navigate = useNavigate();
  const markers = HALL_ALCOVE_ORDER.map((id: SectionId, i) => ({
    id,
    position: HALL_POI_POSITIONS[i],
    color: HALL_THEMES[id].accent,
    phase: i * 0.9,
  })).filter((m) => !HAS_LANDMARK.has(m.id));
  return (
    <>
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={m.position}
          color={m.color}
          phase={m.phase}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/hall/${m.id}`);
          }}
        />
      ))}
    </>
  );
};

export default PoiMarkers;
