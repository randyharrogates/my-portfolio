/** @format */

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { TimeOfDayTint } from "./Lighting.tsx";

interface RoomProps {
  tint: TimeOfDayTint;
  reducedMotion: boolean;
}

/**
 * Implied half-room: warm-grey back wall built from four strips around a
 * rectangular window opening, with a darker frame, an emissive exterior
 * gradient plane visible through the cutout, ~400 twinkling city-light
 * specks, and an optional moon. Glass pane in front (transmission) handles
 * subtle refraction. Replaces the flat back wall that used to live in
 * Desk.tsx so the scene gets a real anchor past the monitor row.
 *
 * Wall layout (centered at origin, z = WALL_Z):
 *   - total: 8 wide × 4 tall, y from -0.4 to 3.6
 *   - window: 3 wide × 1.8 tall, centered at y = 1.6
 *
 * Strips:
 *   top    — width 8, height 1.1, centerY = 3.05
 *   bottom — width 8, height 1.1, centerY = 0.15
 *   left   — width 2.5, height 1.8, centerX = -2.75
 *   right  — width 2.5, height 1.8, centerX =  2.75
 */

const WALL_Z = -1.2;
const WALL_COLOR = "#1b1611";
const FRAME_COLOR = "#0b0908";

/** Exterior gradient + ~400 city-light specks behind the window. Gradient
 *  picks up the time-of-day tint so the view outside matches the interior. */
const ExteriorSky: React.FC<{ tint: TimeOfDayTint; reducedMotion: boolean }> = ({
  tint,
  reducedMotion,
}) => {
  const lightsRef = useRef<THREE.Points>(null);

  // Gradient material: two-color vertical gradient from horizon (warm tint)
  // up to deep indigo/sky. Self-emissive so it reads regardless of lighting.
  const gradientMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uHorizon: { value: new THREE.Color(tint.rim) },
        uSky: { value: new THREE.Color("#0a0a18") },
        uIntensity: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uHorizon;
        uniform vec3 uSky;
        uniform float uIntensity;
        varying vec2 vUv;
        void main() {
          // y=0 is bottom (horizon), y=1 is top (sky)
          float t = smoothstep(0.0, 0.7, vUv.y);
          vec3 col = mix(uHorizon * 0.85, uSky, t);
          gl_FragColor = vec4(col * uIntensity, 1.0);
        }
      `,
      depthWrite: false,
    });
  }, [tint.rim]);

  // City lights — 400 instanced Points in a wide horizon band, far behind the
  // window so the wall clips off-window specks. Twinkle via per-point seeds.
  const COUNT = 400;
  const { positions, sizes, seeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    const seeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      // Spread across the window opening width with some overshoot so the
      // gradient edges aren't visibly bare.
      positions[i * 3] = (Math.random() - 0.5) * 3.6;
      // Concentrate near the horizon line (lower third of window).
      const yBias = Math.pow(Math.random(), 2.2);
      positions[i * 3 + 1] = 0.7 + yBias * 1.6;
      positions[i * 3 + 2] = -0.05 - Math.random() * 0.1;
      sizes[i] = 0.4 + Math.random() * 1.6;
      seeds[i] = Math.random() * 100;
    }
    return { positions, sizes, seeds };
  }, []);

  const lightMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("#ffd29a") },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aSeed;
        varying float vSeed;
        varying float vTwinkle;
        uniform float uTime;
        void main() {
          vSeed = aSeed;
          float tw = 0.5 + 0.5 * sin(uTime * 1.2 + aSeed * 6.28);
          vTwinkle = tw;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * (220.0 / -mv.z) * (0.7 + 0.6 * tw);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vSeed;
        varying float vTwinkle;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float falloff = smoothstep(0.5, 0.0, d);
          // Subtle warm/cool shift per-seed (some lights warm sodium, some cool)
          vec3 tinted = mix(uColor, vec3(0.7, 0.85, 1.0), step(0.7, fract(vSeed * 7.31)));
          gl_FragColor = vec4(tinted * (0.6 + 0.6 * vTwinkle) * falloff, falloff);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  useFrame((s) => {
    if (reducedMotion) return;
    lightMat.uniforms.uTime.value = s.clock.elapsedTime;
  });

  return (
    <group position={[0, 1.6, WALL_Z - 0.25]}>
      {/* Far gradient sky */}
      <mesh position={[0, 0, -0.05]} material={gradientMat}>
        <planeGeometry args={[4.2, 2.4]} />
      </mesh>
      {/* City lights */}
      <points ref={lightsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={COUNT}
            array={positions}
            itemSize={3}
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-aSize"
            count={COUNT}
            array={sizes}
            itemSize={1}
            args={[sizes, 1]}
          />
          <bufferAttribute
            attach="attributes-aSeed"
            count={COUNT}
            array={seeds}
            itemSize={1}
            args={[seeds, 1]}
          />
        </bufferGeometry>
        <primitive object={lightMat} attach="material" />
      </points>
      {/* Moon — emissive sphere upper-right of window, contributes to bloom */}
      <mesh position={[1.1, 0.9, -0.08]}>
        <sphereGeometry args={[0.09, 24, 24]} />
        <meshBasicMaterial color={"#f4e8c8"} toneMapped={false} />
      </mesh>
      {/* Moon halo */}
      <mesh position={[1.1, 0.9, -0.06]}>
        <circleGeometry args={[0.22, 32]} />
        <meshBasicMaterial
          color={"#f4e8c8"}
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

const Room: React.FC<RoomProps> = ({ tint, reducedMotion }) => {
  const wallMat = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: WALL_COLOR,
      roughness: 0.85,
      metalness: 0.05,
      envMapIntensity: 0.45,
      clearcoat: 0,
    });
    return mat;
  }, []);

  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: FRAME_COLOR,
        roughness: 0.8,
        metalness: 0.3,
      }),
    []
  );

  const glassMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.04,
      }),
    []
  );

  return (
    <group>
      {/* Wall strips around the window opening */}
      <mesh position={[0, 3.05, WALL_Z]} receiveShadow material={wallMat}>
        <planeGeometry args={[8, 1.1]} />
      </mesh>
      <mesh position={[0, 0.15, WALL_Z]} receiveShadow material={wallMat}>
        <planeGeometry args={[8, 1.1]} />
      </mesh>
      <mesh position={[-2.75, 1.6, WALL_Z]} receiveShadow material={wallMat}>
        <planeGeometry args={[2.5, 1.8]} />
      </mesh>
      <mesh position={[2.75, 1.6, WALL_Z]} receiveShadow material={wallMat}>
        <planeGeometry args={[2.5, 1.8]} />
      </mesh>

      {/* Window frame — four thin strips around the cutout */}
      <mesh position={[0, 2.5, WALL_Z + 0.02]} material={frameMat}>
        <boxGeometry args={[3.12, 0.06, 0.04]} />
      </mesh>
      <mesh position={[0, 0.7, WALL_Z + 0.02]} material={frameMat}>
        <boxGeometry args={[3.12, 0.06, 0.04]} />
      </mesh>
      <mesh position={[-1.53, 1.6, WALL_Z + 0.02]} material={frameMat}>
        <boxGeometry args={[0.06, 1.8, 0.04]} />
      </mesh>
      <mesh position={[1.53, 1.6, WALL_Z + 0.02]} material={frameMat}>
        <boxGeometry args={[0.06, 1.8, 0.04]} />
      </mesh>
      {/* Horizontal mullion at mid-height — gives the window a real-world divide */}
      <mesh position={[0, 1.6, WALL_Z + 0.025]} material={frameMat}>
        <boxGeometry args={[3.0, 0.03, 0.025]} />
      </mesh>

      {/* Exterior view behind window */}
      <ExteriorSky tint={tint} reducedMotion={reducedMotion} />

      {/* Glass pane in front of window opening */}
      <mesh position={[0, 1.6, WALL_Z + 0.04]} material={glassMat}>
        <planeGeometry args={[2.98, 1.78]} />
      </mesh>
    </group>
  );
};

export default Room;
