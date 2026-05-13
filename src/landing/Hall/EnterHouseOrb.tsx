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

interface EnterHouseOrbProps {
  /** World position to place the orb (near the house door). */
  position: [number, number, number];
}

const DOOR_ORB_COLOR = "#ffb05a";

/** Small warm-amber orb that sits at the house doorway on `/hall/about`.
 *  Clicking it navigates to `/` (the terminal-style workstation). Mirrors
 *  the PoiMarkers style so it reads as part of the same orb-language,
 *  but smaller (radius 0.32 / halo 0.85) so it doesn't compete with the
 *  navigation orbs on the wide hub view.
 */
const EnterHouseOrb: React.FC<EnterHouseOrbProps> = ({ position }) => {
  const navigate = useNavigate();
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = position[1] + Math.sin(t * 1.5) * 0.18;
  });

  const innerMaterial = useMemo(() => {
    const uColor = uniform(new THREE.Color(DOOR_ORB_COLOR));
    const r = length(positionLocal);
    const coreLift = oneMinus(smoothstep(float(0.0), float(0.85), r));
    const lifted = uColor.add(coreLift.mul(0.8));
    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = lifted;
    mat.fog = false;
    return mat;
  }, []);

  const haloMaterial = useMemo(() => {
    const uColor = uniform(new THREE.Color(DOOR_ORB_COLOR));
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
    navigate("/");
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
        <sphereGeometry args={[0.32, 20, 14]} />
        <primitive object={innerMaterial} attach="material" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.85, 20, 14]} />
        <primitive object={haloMaterial} attach="material" />
      </mesh>
    </group>
  );
};

export default EnterHouseOrb;
