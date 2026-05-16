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

interface ResumeScrollOrbProps {
  /** World position to place the orb (above the Akademiya floating scroll). */
  position: [number, number, number];
}

const SCROLL_ORB_COLOR = "#4ddfff";

/** Cyan-magic orb hovering above the resume landmark's floating Akademiya
 *  scroll. Clicking navigates to /hall/resume. Same Sumeru cyan-magic palette
 *  as the BlogTomeOrb so all magical-knowledge landmarks read as one family.
 */
const ResumeScrollOrb: React.FC<ResumeScrollOrbProps> = ({ position }) => {
  const navigate = useNavigate();
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = position[1] + Math.sin(t * 1.3) * 0.2;
  });

  const innerMaterial = useMemo(() => {
    const uColor = uniform(new THREE.Color(SCROLL_ORB_COLOR));
    const r = length(positionLocal);
    const coreLift = oneMinus(smoothstep(float(0.0), float(0.85), r));
    const lifted = uColor.add(coreLift.mul(0.8));
    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = lifted;
    mat.fog = false;
    return mat;
  }, []);

  const haloMaterial = useMemo(() => {
    const uColor = uniform(new THREE.Color(SCROLL_ORB_COLOR));
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
    navigate("/hall/resume");
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
        <sphereGeometry args={[0.36, 20, 14]} />
        <primitive object={innerMaterial} attach="material" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.95, 20, 14]} />
        <primitive object={haloMaterial} attach="material" />
      </mesh>
    </group>
  );
};

export default ResumeScrollOrb;
