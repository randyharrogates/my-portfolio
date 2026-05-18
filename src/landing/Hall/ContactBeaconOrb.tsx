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

interface ContactBeaconOrbProps {
  /** World position where the orb floats. The orb bobs ±0.18m around this. */
  position: [number, number, number];
}

const ORB_COLOR = "#4ddfff";

/** Cyan contact-beacon orb hovering above the brazier at the jetty tip of
 *  the /contact landmark. Click → navigates to /contact. Two-sphere
 *  inner + halo composition, additive blending for the halo, matches the
 *  SkillsForgeOrb pattern. The orb IS the broadcast signal that the
 *  brazier "lights" — the visual story is that this beacon is the
 *  destination for the messages the visitor sends.
 */
const ContactBeaconOrb: React.FC<ContactBeaconOrbProps> = ({ position }) => {
  const navigate = useNavigate();
  const orbRef = useRef<THREE.Group>(null);
  const { pulseActive, markOrbHovered } = useOrbPulse();

  useFrame((state) => {
    if (!orbRef.current) return;
    const t = state.clock.elapsedTime;
    orbRef.current.position.y = position[1] + Math.sin(t * 1.3 + 0.4) * 0.18;
    const scale = pulseActive ? 1 + 0.15 * Math.sin(t * 4) : 1;
    orbRef.current.scale.setScalar(scale);
  });

  const orbInnerMaterial = useMemo(() => {
    const uColor = uniform(new THREE.Color(ORB_COLOR));
    const r = length(positionLocal);
    const coreLift = oneMinus(smoothstep(float(0.0), float(0.85), r));
    const lifted = uColor.add(coreLift.mul(0.25));
    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = lifted;
    mat.fog = false;
    return mat;
  }, []);

  const orbHaloMaterial = useMemo(() => {
    const uColor = uniform(new THREE.Color(ORB_COLOR));
    const r = length(positionLocal);
    const falloff = pow(
      oneMinus(smoothstep(float(0.6), float(1.0), r)),
      1.6
    );
    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = uColor.add(falloff.mul(0.3));
    mat.opacityNode = falloff.mul(0.75);
    mat.transparent = true;
    mat.depthWrite = false;
    mat.blending = THREE.AdditiveBlending;
    mat.fog = false;
    return mat;
  }, []);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    navigate("/contact");
  };

  return (
    <group
      ref={orbRef}
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
        <sphereGeometry args={[0.50, 22, 16]} />
        <primitive object={orbInnerMaterial} attach="material" />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.30, 22, 16]} />
        <primitive object={orbHaloMaterial} attach="material" />
      </mesh>
    </group>
  );
};

export default ContactBeaconOrb;
