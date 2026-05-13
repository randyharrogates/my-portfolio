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
  sin,
  smoothstep,
  timerLocal,
  uniform,
} from "three/tsl";
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial } from "three/webgpu";

interface SkillsForgeOrbProps {
  /** World position of the BASE of the podium. The orb floats ~2m above. */
  position: [number, number, number];
}

const ORB_COLOR = "#9fe870"; // skills accent (lime — HALL_THEMES.skills)

/** Lime skills marker — a contrasting podium with a glowing lime orb
 *  floating above. Both built procedurally in React so they pop against
 *  the dark carved-stone island that the GLB's pedestal_column merged
 *  into (which made it invisible against the rest of the bake).
 *
 *  Click navigates to /skills.
 */
const SkillsForgeOrb: React.FC<SkillsForgeOrbProps> = ({ position }) => {
  const navigate = useNavigate();
  const groupRef = useRef<THREE.Group>(null);

  // Bob the orb above the podium
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const orb = groupRef.current.children[2]; // the orb group is the 3rd child
    if (orb) {
      orb.position.y = 2.0 + Math.sin(t * 1.3 + 1.2) * 0.18;
    }
  });

  // ============================================================
  // PODIUM — short brass-trim stone cylinder, contrasts with island
  // ============================================================
  const podiumStoneMaterial = useMemo(() => {
    const mat = new MeshStandardNodeMaterial({
      color: new THREE.Color(0.32, 0.30, 0.27),
      roughness: 0.85,
      metalness: 0.0,
    });
    // Subtle lime tint from below — reads as "powered" not just plain stone
    mat.emissiveNode = uniform(new THREE.Color(0x9fe870)).mul(0.08);
    return mat;
  }, []);

  // Brass trim ring (contrasts strongly with both the stone island and the lime orb)
  const brassMaterial = useMemo(() => {
    const mat = new MeshStandardNodeMaterial({
      color: new THREE.Color(0.78, 0.55, 0.18),
      roughness: 0.35,
      metalness: 0.85,
    });
    mat.emissiveNode = uniform(new THREE.Color(0xd9a050)).mul(0.18);
    return mat;
  }, []);

  // Top disc — emissive lime so it reads as a "skill terminal screen"
  const screenMaterial = useMemo(() => {
    const t = timerLocal();
    const r = length(positionLocal);
    // Gentle radial pulse so the screen breathes
    const pulse = sin(t.mul(2.0)).mul(0.5).add(0.5);
    const ring = smoothstep(float(0.55), float(0.85), r);
    const mat = new MeshBasicNodeMaterial();
    const baseLime = uniform(new THREE.Color(ORB_COLOR));
    mat.colorNode = baseLime.add(ring.mul(pulse).mul(0.6));
    mat.emissiveNode = baseLime.add(ring.mul(0.4));
    mat.fog = false;
    return mat;
  }, []);

  // ============================================================
  // ORB — lime sphere, restrained core-lift so it stays LIME not WHITE
  // ============================================================
  const orbInnerMaterial = useMemo(() => {
    const uColor = uniform(new THREE.Color(ORB_COLOR));
    const r = length(positionLocal);
    // Previous version used coreLift × 0.8 → pushed centre to white.
    // Drop to 0.25 so the orb reads as saturated lime, not white.
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
      {/* Podium body — stone cylinder ~1.4m tall, 0.8m radius */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.7, 0.85, 1.4, 12]} />
        <primitive object={podiumStoneMaterial} attach="material" />
      </mesh>
      {/* Brass trim ring on top of stone */}
      <mesh position={[0, 1.42, 0]}>
        <cylinderGeometry args={[0.82, 0.82, 0.10, 18]} />
        <primitive object={brassMaterial} attach="material" />
      </mesh>
      {/* Glowing lime terminal screen on top — bobs separately */}
      <group position={[0, 2.0, 0]}>
        {/* Inner orb (smaller) */}
        <mesh>
          <sphereGeometry args={[0.50, 22, 16]} />
          <primitive object={orbInnerMaterial} attach="material" />
        </mesh>
        {/* Outer halo (bigger, additive) */}
        <mesh>
          <sphereGeometry args={[1.30, 22, 16]} />
          <primitive object={orbHaloMaterial} attach="material" />
        </mesh>
      </group>
      {/* Top emissive disc just below the orb — anchor the floating orb
          visually to the podium */}
      <mesh position={[0, 1.50, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.65, 24]} />
        <primitive object={screenMaterial} attach="material" />
      </mesh>
    </group>
  );
};

export default SkillsForgeOrb;
