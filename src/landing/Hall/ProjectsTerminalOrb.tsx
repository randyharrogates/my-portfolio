/** @format */

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useNavigate } from "react-router-dom";
import { Billboard } from "@react-three/drei";
import { useOrbPulse } from "./OrbPulseProvider.tsx";
import {
  abs,
  float,
  length,
  oneMinus,
  positionLocal,
  pow,
  smoothstep,
  uniform,
  uv,
} from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";

interface ProjectsTerminalOrbProps {
  /** World position of the orb. Should hover above the satellite's
   *  terminal console screen so it reads as "the marker for this terminal." */
  position: [number, number, number];
}

const ORB_COLOR = "#c06fe0"; // case-studies accent (pink-indigo glow)

/** Pink-indigo orb hovering above the crashed-satellite terminal. Clicking
 *  navigates straight to /projects/credit-memo per the user's spec.
 *
 *  The glow is built from camera-facing billboard planes with a true
 *  radial-gradient (`uv`-based) falloff — NOT additive sphere shells. A
 *  sphere shell can't carry a gradient: every surface fragment sits at
 *  `length(positionLocal) == radius`, so a `smoothstep` on it evaluates
 *  to a flat constant (and to exactly 0 once the radius leaves the
 *  smoothstep window — which is why the earlier sphere-halo never
 *  glowed). Billboard planes face the camera and gradient across their
 *  UVs, so they read as a soft glowing aura plus an expanding sonar ring
 *  even from the wide hub-overview camera. Glow planes opt out of
 *  raycasting so the click target stays the size of the inner core. */
const ProjectsTerminalOrb: React.FC<ProjectsTerminalOrbProps> = ({ position }) => {
  const navigate = useNavigate();
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const { pulseActive, markOrbHovered } = useOrbPulse();

  // Continuous radiate pulse — breathes the glow brightness so the orb
  // reads as an energy source even after the first-visit scale pulse ends.
  const uRadiate = useMemo(() => uniform(1), []);
  // Drives the expanding sonar-ring billboard: opacity fades as it grows.
  const uRingOpacity = useMemo(() => uniform(0), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = position[1] + Math.sin(t * 1.4 + 0.6) * 0.22;
    const scale = pulseActive ? 1 + 0.15 * Math.sin(t * 4) : 1;
    groupRef.current.scale.setScalar(scale);
    uRadiate.value = 1 + 0.4 * Math.sin(t * 2.2);
    // Sonar ring: the billboard plane scales 1×→3× over 2.6s then
    // restarts, fading out as it grows so the orb visibly radiates.
    const cycle = (t / 2.6) % 1;
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + cycle * 2.0);
    }
    uRingOpacity.value = (1 - cycle) * 1.4;
  });

  /** Solid inner ball — bright enough to clear the 0.85 bloom threshold
   *  (see Postprocessing.tsx) so the core itself reads as lit. */
  const innerMaterial = useMemo(() => {
    const uColor = uniform(new THREE.Color(ORB_COLOR));
    const r = length(positionLocal);
    const coreLift = oneMinus(smoothstep(float(0.0), float(0.85), r));
    const lifted = uColor.add(coreLift.mul(uRadiate.mul(0.55))).mul(1.55);
    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = lifted;
    mat.fog = false;
    return mat;
  }, [uRadiate]);

  /** Soft circular aura — radial gradient across the billboard plane's
   *  UVs, brightest at the centre and fading to nothing by the rim. */
  const glowMaterial = useMemo(() => {
    const uColor = uniform(new THREE.Color(ORB_COLOR));
    const d = length(uv().sub(0.5)); // 0 at centre, 0.5 at edge midpoints
    const glow = pow(oneMinus(smoothstep(float(0.0), float(0.5), d)), 1.7);
    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = uColor.add(glow.mul(uRadiate.mul(0.9)));
    mat.opacityNode = glow.mul(uRadiate.mul(0.95));
    mat.transparent = true;
    mat.depthWrite = false;
    mat.blending = THREE.AdditiveBlending;
    mat.side = THREE.DoubleSide;
    mat.fog = false;
    return mat;
  }, [uRadiate]);

  /** Expanding sonar ring — a thin bright band on the billboard plane,
   *  hollow inside and out. The plane is scaled up over time. */
  const ringMaterial = useMemo(() => {
    const uColor = uniform(new THREE.Color(ORB_COLOR));
    const d = length(uv().sub(0.5));
    const band = oneMinus(
      smoothstep(float(0.0), float(0.08), abs(d.sub(float(0.4))))
    );
    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = uColor.add(band.mul(1.2));
    mat.opacityNode = band.mul(uRingOpacity);
    mat.transparent = true;
    mat.depthWrite = false;
    mat.blending = THREE.AdditiveBlending;
    mat.side = THREE.DoubleSide;
    mat.fog = false;
    return mat;
  }, [uRingOpacity]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    navigate("/projects/twc");
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
        <sphereGeometry args={[0.55, 22, 16]} />
        <primitive object={innerMaterial} attach="material" />
      </mesh>
      <Billboard>
        <mesh raycast={() => null} renderOrder={2}>
          <planeGeometry args={[3.4, 3.4]} />
          <primitive object={glowMaterial} attach="material" />
        </mesh>
        <mesh ref={ringRef} raycast={() => null} renderOrder={3}>
          <planeGeometry args={[1.7, 1.7]} />
          <primitive object={ringMaterial} attach="material" />
        </mesh>
      </Billboard>
    </group>
  );
};

export default ProjectsTerminalOrb;
