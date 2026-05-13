/** @format */

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useNavigate } from "react-router-dom";
import {
  float,
  length,
  oneMinus,
  positionLocal,
  pow,
  smoothstep,
  uniform,
} from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";

interface SkillsForgeOrbProps {
  /** World position of the orb. Should hover above the standalone
   *  ground pedestal beside the river so it reads as "the marker for
   *  this forge." */
  position: [number, number, number];
}

const ORB_COLOR = "#9fe870"; // skills accent (lime — matches HALL_THEMES.skills)

/** Lime orb hovering above the skills landmark's forge pedestal.
 *  Clicking navigates straight to /skills per the existing pattern.
 *  Same visual language as `EnterHouseOrb.tsx` / `ProjectsTerminalOrb.tsx`
 *  but tinted to the skills accent.
 */
const SkillsForgeOrb: React.FC<SkillsForgeOrbProps> = ({ position }) => {
  const navigate = useNavigate();
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = position[1] + Math.sin(t * 1.3 + 1.2) * 0.22;
  });

  const innerMaterial = useMemo(() => {
    const uColor = uniform(new THREE.Color(ORB_COLOR));
    const r = length(positionLocal);
    const coreLift = oneMinus(smoothstep(float(0.0), float(0.85), r));
    const lifted = uColor.add(coreLift.mul(0.8));
    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = lifted;
    mat.fog = false;
    return mat;
  }, []);

  const haloMaterial = useMemo(() => {
    const uColor = uniform(new THREE.Color(ORB_COLOR));
    const r = length(positionLocal);
    const falloff = pow(
      oneMinus(smoothstep(float(0.6), float(1.0), r)),
      1.6
    );
    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = uColor.add(falloff.mul(0.4));
    mat.opacityNode = falloff.mul(0.65);
    mat.transparent = true;
    mat.depthWrite = false;
    mat.blending = THREE.AdditiveBlending;
    mat.fog = false;
    return mat;
  }, []);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    navigate("/skills");
  };

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <mesh>
        <sphereGeometry args={[0.40, 22, 16]} />
        <primitive object={innerMaterial} attach="material" />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.05, 22, 16]} />
        <primitive object={haloMaterial} attach="material" />
      </mesh>
    </group>
  );
};

export default SkillsForgeOrb;
