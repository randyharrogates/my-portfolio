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
  /** World position where the orb floats. The orb bobs ±0.18m around this. */
  position: [number, number, number];
}

const ORB_COLOR = "#9fe870";

/** Lime skills marker — a single glowing orb that hovers above the
 *  Blender-baked pedestal column + lime screen (`skl_pedestal_screen`
 *  in landmark-skills.glb). Per user 2026-05-13: every static asset
 *  must be a Blender bake, so the previous procedural podium (stone
 *  cylinder + brass trim + emissive screen disc) was stripped. All
 *  that remains here is the orb itself — it's the click target that
 *  jumps to /skills.
 */
const SkillsForgeOrb: React.FC<SkillsForgeOrbProps> = ({ position }) => {
  const navigate = useNavigate();
  const orbRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!orbRef.current) return;
    const t = state.clock.elapsedTime;
    orbRef.current.position.y = Math.sin(t * 1.3 + 1.2) * 0.18;
  });

  const orbInnerMaterial = useMemo(() => {
    const uColor = uniform(new THREE.Color(ORB_COLOR));
    const r = length(positionLocal);
    // Core-lift kept restrained (0.25) so the centre reads as
    // saturated lime, not washed white.
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
    navigate("/skills");
  };

  return (
    <group
      ref={orbRef}
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

export default SkillsForgeOrb;
