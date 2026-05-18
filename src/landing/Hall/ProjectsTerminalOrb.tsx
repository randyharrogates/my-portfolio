/** @format */

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useNavigate } from "react-router-dom";
import { useOrbPulse } from "./OrbPulseProvider.tsx";
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

interface ProjectsTerminalOrbProps {
  /** World position of the orb. Should hover above the satellite's
   *  terminal console screen so it reads as "the marker for this terminal." */
  position: [number, number, number];
}

const ORB_COLOR = "#4dd0c4"; // projects accent (teal — matches the screen)

/** Teal orb hovering above the crashed-satellite terminal. Clicking
 *  navigates straight to /projects/credit-memo per the user's spec.
 *  Same visual language as the doorway orb (`EnterHouseOrb.tsx`) but
 *  tinted to the projects accent and slightly larger so the link to the
 *  terminal screen reads even at distance.
 */
const ProjectsTerminalOrb: React.FC<ProjectsTerminalOrbProps> = ({ position }) => {
  const navigate = useNavigate();
  const groupRef = useRef<THREE.Group>(null);
  const { pulseActive, markOrbHovered } = useOrbPulse();

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = position[1] + Math.sin(t * 1.4 + 0.6) * 0.22;
    const scale = pulseActive ? 1 + 0.15 * Math.sin(t * 4) : 1;
    groupRef.current.scale.setScalar(scale);
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
    navigate("/projects/credit-memo");
  };

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
        markOrbHovered();
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

export default ProjectsTerminalOrb;
