/** @format */

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  HALL_ALCOVE_RADIUS,
  HALL_CEILING_HEIGHT,
} from "../sections.ts";

const MOTE_SPRITE = `${process.env.PUBLIC_URL}/textures/hall/mote-sprite.png`;

interface AtmosphereProps {
  /** Low-fidelity mode skips motes + god-ray cone + ring pulsing. */
  lowFidelity: boolean;
  /** Reduced-motion mode further locks animation phase. */
  staticMode: boolean;
}

/** Volumetric-style god ray cone from the dome skylight. Cheap fragment
 *  shader on a pair of additive cone meshes — not true volumetrics, but
 *  reads as shafted light from the dome. Phase 6 polish: tighter
 *  outer cone matching the Session 20 skylight aperture, plus a brighter
 *  inner "core" cone for a focused central beam. */
const GodRay: React.FC<{ staticMode: boolean }> = ({ staticMode }) => {
  const uniformsOuter = useMemo(
    () => ({
      uTime: { value: 0 },
      uStatic: { value: staticMode ? 1 : 0 },
      uIntensity: { value: 0.18 },
    }),
    [staticMode]
  );
  const uniformsCore = useMemo(
    () => ({
      uTime: { value: 0 },
      uStatic: { value: staticMode ? 1 : 0 },
      uIntensity: { value: 0.42 },
    }),
    [staticMode]
  );

  // Outer cone: matches the dome skylight inner aperture (~2 m at 2× scale)
  // tapering to 4 m at floor — tight enough to read as a "shaft" rather
  // than a wide glow.
  const outerGeom = useMemo(
    () => new THREE.CylinderGeometry(1.8, 4.0, HALL_CEILING_HEIGHT, 32, 1, true),
    []
  );
  // Core cone: thin focused beam from the aperture, ~1.5 m wide at floor.
  const coreGeom = useMemo(
    () => new THREE.CylinderGeometry(0.5, 1.5, HALL_CEILING_HEIGHT, 24, 1, true),
    []
  );

  useFrame((_, delta) => {
    uniformsOuter.uTime.value += delta;
    uniformsCore.uTime.value += delta;
  });

  const fragmentShader = /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    varying float vY;
    uniform float uTime;
    uniform float uStatic;
    uniform float uIntensity;
    void main() {
      // Vertical falloff — strong at top (near aperture), fading to
      // ~30% at floor. Cubic ease for a soft transition.
      float t = clamp((vY + 14.0) / 28.0, 0.0, 1.0); // [0, 1] floor → ceiling
      float vert = mix(0.30, 1.0, t * t * (3.0 - 2.0 * t));
      // Radial soft edge — the cone sidewalls fade out tangentially.
      float radial = pow(0.5 + 0.5 * sin(vUv.x * 6.28318), 0.5);
      // Mild dust flicker to suggest motes drifting through the shaft.
      float flicker = uStatic > 0.5 ? 1.0 : (0.88 + 0.12 * sin(uTime * 1.7 + vUv.y * 8.0));
      float a = vert * radial * uIntensity * flicker;
      // Warm tungsten tint matching the alcove fill light.
      vec3 col = vec3(1.0, 0.88, 0.66) * a;
      gl_FragColor = vec4(col, a);
    }
  `;
  const vertexShader = /* glsl */ `
    varying vec2 vUv;
    varying float vY;
    void main() {
      vUv = uv;
      vY = position.y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  return (
    <group position={[0, HALL_CEILING_HEIGHT / 2 + 0.1, 0]} renderOrder={1}>
      <mesh geometry={outerGeom}>
        <shaderMaterial
          uniforms={uniformsOuter}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
        />
      </mesh>
      <mesh geometry={coreGeom}>
        <shaderMaterial
          uniforms={uniformsCore}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
        />
      </mesh>
    </group>
  );
};

/** Three concentric pulsing emissive rings on the hub floor. */
const FloorGlowRings: React.FC<{ staticMode: boolean }> = ({ staticMode }) => {
  const refs = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  useFrame((_, delta) => {
    refs.current.forEach((m, i) => {
      if (!m) return;
      const mat = m.material as THREE.MeshBasicMaterial;
      if (staticMode) {
        mat.opacity = 0.5;
        return;
      }
      const phase = performance.now() * 0.0006 + i * 0.7;
      mat.opacity = 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(phase));
    });
  });
  return (
    <>
      {[1.2, 1.8, 2.4].map((radius, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[0, 0.03, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          {/* 6 segments → hex outline matches the hub floor's six-fold motif */}
          <ringGeometry args={[radius, radius + 0.04, 6]} />
          <meshBasicMaterial color="#4ed4a0" transparent opacity={0.5} />
        </mesh>
      ))}
    </>
  );
};

/** Particle motes drifting through the hub interior. Two budgets — full and
 *  low-fidelity. Phase 6 polish: each particle samples a radial-gradient
 *  sprite texture so motes read as soft glowing dust instead of square
 *  pixels; per-particle horizontal drift (sin / cos seeded by index)
 *  gives the air a faint convection without uniform vertical flow. */
const Motes: React.FC<{ count: number; staticMode: boolean }> = ({
  count,
  staticMode,
}) => {
  const sprite = useTexture(MOTE_SPRITE);
  sprite.colorSpace = THREE.SRGBColorSpace;

  const meshRef = useRef<THREE.Points>(null);
  const driftPhase = useMemo(() => {
    // Per-particle drift phase in [0, 2π) — varies the horizontal sway.
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = Math.random() * Math.PI * 2;
    return arr;
  }, [count]);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = HALL_ALCOVE_RADIUS * 0.85 * Math.sqrt(Math.random());
      const a = Math.random() * Math.PI * 2;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = Math.random() * HALL_CEILING_HEIGHT;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  }, [count]);
  const tRef = useRef(0);

  useFrame((_, delta) => {
    const pts = meshRef.current;
    if (!pts) return;
    if (staticMode) return;
    tRef.current += delta;
    const t = tRef.current;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const idx = i / 3;
      const phase = driftPhase[idx];
      arr[i + 1] += delta * 0.08;
      if (arr[i + 1] > HALL_CEILING_HEIGHT) arr[i + 1] = 0;
      // Faint horizontal drift — 4 cm amplitude, period ~16 s, varied
      // per particle by phase. Adds a sense of slow air movement
      // without overwhelming the vertical rise.
      arr[i]     += Math.sin(t * 0.4 + phase) * delta * 0.04;
      arr[i + 2] += Math.cos(t * 0.4 + phase) * delta * 0.04;
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#f4d8a8"
        map={sprite}
        alphaMap={sprite}
        size={0.18}
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

/** Hub floor mat that catches the depth haze — invisible but extends the
 *  scene bounds so exponential fog has a believable far edge. */
const FogPlane: React.FC = () => (
  <mesh
    rotation={[-Math.PI / 2, 0, 0]}
    position={[0, 0.005, 0]}
    receiveShadow
  >
    <circleGeometry args={[HALL_ALCOVE_RADIUS * 1.4, 48]} />
    <meshStandardMaterial
      color="#08121a"
      roughness={0.9}
      metalness={0.05}
    />
  </mesh>
);

/** Composite atmosphere layer. Mounted as a sibling of Hub + Alcoves. */
const Atmosphere: React.FC<AtmosphereProps> = ({ lowFidelity, staticMode }) => {
  return (
    <>
      <FogPlane />
      <FloorGlowRings staticMode={staticMode} />
      {!lowFidelity && <GodRay staticMode={staticMode} />}
      {/* Session 27: mote count halved 6000→1500 / 2000→800 to free
       *  the per-frame Float32 churn. The shaft of light from any
       *  single window is no longer the focal moment — the archipelago
       *  vista is. */}
      <Motes
        count={lowFidelity ? 800 : 1500}
        staticMode={staticMode}
      />
    </>
  );
};

export default Atmosphere;
