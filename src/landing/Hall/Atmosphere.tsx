/** @format */

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  HALL_ALCOVE_RADIUS,
  HALL_CEILING_HEIGHT,
} from "../sections.ts";

interface AtmosphereProps {
  /** Low-fidelity mode skips motes + god-ray cone + ring pulsing. */
  lowFidelity: boolean;
  /** Reduced-motion mode further locks animation phase. */
  staticMode: boolean;
}

/** Volumetric-style god ray cone from the dome skylight. Cheap fragment
 *  shader on an additive cone mesh — not true volumetrics, but reads as
 *  shafted light from the dome with the existing postfx pass. */
const GodRay: React.FC<{ staticMode: boolean }> = ({ staticMode }) => {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uStatic: { value: staticMode ? 1 : 0 },
    }),
    [staticMode]
  );

  const geometry = useMemo(() => {
    // Inverted truncated cone, apex at dome skylight, opening downward.
    const g = new THREE.CylinderGeometry(0.4, 2.6, HALL_CEILING_HEIGHT, 24, 1, true);
    return g;
  }, []);

  useFrame((_, delta) => {
    uniforms.uTime.value += delta;
  });

  return (
    <mesh
      geometry={geometry}
      position={[0, HALL_CEILING_HEIGHT / 2 + 0.1, 0]}
      renderOrder={1}
    >
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        vertexShader={/* glsl */ `
          varying vec2 vUv;
          varying float vY;
          void main() {
            vUv = uv;
            vY = position.y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          precision highp float;
          varying vec2 vUv;
          varying float vY;
          uniform float uTime;
          uniform float uStatic;
          void main() {
            // Vertical falloff — strong at top, fading to nothing at floor.
            float vert = smoothstep(-2.8, 2.0, vY);
            // Radial soft edge — the cone sidewalls fade out tangentially.
            float radial = pow(0.5 + 0.5 * sin(vUv.x * 6.28318), 0.5);
            // Mild flicker to suggest dust drifting through the shaft.
            float flicker = uStatic > 0.5 ? 1.0 : (0.85 + 0.15 * sin(uTime * 1.7 + vUv.y * 8.0));
            float a = vert * radial * 0.18 * flicker;
            vec3 col = vec3(1.0, 0.9, 0.7) * a;
            gl_FragColor = vec4(col, a);
          }
        `}
      />
    </mesh>
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
          <meshBasicMaterial color="#4dd0c4" transparent opacity={0.5} />
        </mesh>
      ))}
    </>
  );
};

/** Particle motes drifting through the hub interior. Two budgets — full and
 *  low-fidelity. */
const Motes: React.FC<{ count: number; staticMode: boolean }> = ({
  count,
  staticMode,
}) => {
  const meshRef = useRef<THREE.Points>(null);
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

  useFrame((_, delta) => {
    const pts = meshRef.current;
    if (!pts) return;
    if (staticMode) return;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] += delta * 0.08;
      if (arr[i + 1] > HALL_CEILING_HEIGHT) arr[i + 1] = 0;
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
        size={0.025}
        transparent
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
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
      <Motes
        count={lowFidelity ? 800 : 2400}
        staticMode={staticMode}
      />
    </>
  );
};

export default Atmosphere;
