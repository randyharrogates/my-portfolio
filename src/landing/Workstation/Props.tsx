/** @format */

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const ACCENT = "#e8632a";

interface KeyboardProps {
  reducedMotion: boolean;
}

/** Mechanical keyboard — primitive build with breathing per-key backlight. */
export const Keyboard: React.FC<KeyboardProps> = ({ reducedMotion }) => {
  const litRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((s) => {
    if (!litRef.current || reducedMotion) return;
    const t = s.clock.elapsedTime;
    litRef.current.emissiveIntensity = 0.4 + (Math.sin(t * 1.0) * 0.5 + 0.5) * 0.7;
  });

  const keys: [number, number][] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 11; col++) {
      keys.push([col, row]);
    }
  }

  return (
    <group position={[0, 0.062, 0.46]}>
      {/* Body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.045, 0.32]} />
        <meshStandardMaterial color="#13110f" roughness={0.6} metalness={0.3} envMapIntensity={0.8} />
      </mesh>
      {/* Underside backlight glow plane */}
      <mesh position={[0, -0.01, 0]}>
        <boxGeometry args={[0.94, 0.004, 0.31]} />
        <meshStandardMaterial
          ref={litRef}
          color={ACCENT}
          emissive={ACCENT}
          emissiveIntensity={0.7}
        />
      </mesh>
      {/* Keys */}
      {keys.map(([col, row]) => {
        const x = -0.41 + col * 0.082;
        const z = -0.12 + row * 0.07;
        return (
          <mesh
            key={`${col}-${row}`}
            position={[x, 0.03, z]}
            castShadow
          >
            <boxGeometry args={[0.06, 0.018, 0.055]} />
            <meshStandardMaterial color="#1c1916" roughness={0.7} />
          </mesh>
        );
      })}
      {/* Spacebar */}
      <mesh position={[0, 0.03, 0.16]} castShadow>
        <boxGeometry args={[0.42, 0.018, 0.045]} />
        <meshStandardMaterial color="#1c1916" roughness={0.7} />
      </mesh>
    </group>
  );
};

/** Trackpad. */
export const Trackpad: React.FC = () => (
  <mesh position={[0.62, 0.07, 0.5]} castShadow>
    <boxGeometry args={[0.26, 0.014, 0.2]} />
    <meshStandardMaterial color="#23201d" roughness={0.4} metalness={0.3} envMapIntensity={0.8} />
  </mesh>
);

/** Mug with rising steam particles. */
interface MugProps {
  reducedMotion: boolean;
}
export const Mug: React.FC<MugProps> = ({ reducedMotion }) => {
  const steamRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(20 * 3);
    for (let i = 0; i < 20; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.04;
      arr[i * 3 + 1] = Math.random() * 0.4;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
    }
    return arr;
  }, []);

  useFrame((s) => {
    if (!steamRef.current || reducedMotion) return;
    const t = s.clock.elapsedTime;
    const arr = steamRef.current.geometry.attributes.position
      .array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] += 0.0035;
      arr[i] += Math.sin(t * 0.8 + i) * 0.0007;
      if (arr[i + 1] > 0.45) {
        arr[i + 1] = 0;
        arr[i] = (Math.random() - 0.5) * 0.04;
        arr[i + 2] = (Math.random() - 0.5) * 0.04;
      }
    }
    steamRef.current.geometry.attributes.position.needsUpdate = true;
    const mat = steamRef.current.material as THREE.PointsMaterial;
    if (mat) mat.opacity = 0.18;
  });

  return (
    <group position={[-1.18, 0.16, 0.42]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.07, 0.06, 0.18, 18]} />
        <meshStandardMaterial color="#c8bfb5" roughness={0.6} envMapIntensity={0.8} />
      </mesh>
      {/* Coffee surface */}
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.062, 0.062, 0.005, 18]} />
        <meshStandardMaterial color="#2a1c12" roughness={0.4} />
      </mesh>
      {/* Handle */}
      <mesh position={[0.085, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.04, 0.012, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#c8bfb5" roughness={0.6} envMapIntensity={0.8} />
      </mesh>
      {/* Steam */}
      <points ref={steamRef} position={[0, 0.1, 0]} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#c8bfb5"
          size={0.018}
          transparent
          opacity={0.18}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
};

/** Notebook (decorative only). */
export const Notebook: React.FC = () => (
  <mesh position={[-0.85, 0.06, 0.55]} rotation={[0, 0.18, 0]} castShadow>
    <boxGeometry args={[0.32, 0.025, 0.22]} />
    <meshStandardMaterial color="#5e2e1d" roughness={0.85} />
  </mesh>
);

/** Server tower with blinking LEDs and rotating fan. */
interface ServerTowerProps {
  reducedMotion: boolean;
  konami: boolean;
}
export const ServerTower: React.FC<ServerTowerProps> = ({
  reducedMotion,
  konami,
}) => {
  const lidRef = useRef<THREE.Group>(null);
  const fanRef = useRef<THREE.Mesh>(null);
  const ledRefs = useRef<THREE.Mesh[]>([]);
  const phasesRef = useRef<number[]>(
    new Array(5).fill(0).map(() => Math.random() * 10)
  );

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (fanRef.current && !reducedMotion) {
      fanRef.current.rotation.z += 0.04;
    }
    ledRefs.current.forEach((m, i) => {
      if (!m) return;
      const phase = phasesRef.current[i];
      const on = ((Math.sin(t * (0.7 + i * 0.3) + phase) + 1) * 0.5) > 0.6;
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = on ? 1.6 : 0.05;
    });
    if (lidRef.current) {
      const target = konami ? -Math.PI / 2 : 0;
      lidRef.current.rotation.x +=
        (target - lidRef.current.rotation.x) * 0.08;
    }
  });

  return (
    <group position={[-2.0, -0.46, -0.4]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.95, 0.5]} />
        <meshStandardMaterial color="#161412" roughness={0.7} metalness={0.2} envMapIntensity={0.8} />
      </mesh>
      {/* Brushed-metal front panel */}
      <mesh position={[0.215, 0, 0]}>
        <boxGeometry args={[0.005, 0.92, 0.48]} />
        <meshStandardMaterial color="#2a2825" roughness={0.4} metalness={0.85} envMapIntensity={0.8} />
      </mesh>
      {/* LEDs */}
      {[0.3, 0.18, 0.06, -0.06, -0.18].map((y, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) ledRefs.current[i] = el;
          }}
          position={[0.22, y, 0.18]}
        >
          <boxGeometry args={[0.005, 0.018, 0.04]} />
          <meshStandardMaterial
            color={i === 0 ? ACCENT : i === 1 ? "#4ade80" : "#60a5fa"}
            emissive={i === 0 ? ACCENT : i === 1 ? "#4ade80" : "#60a5fa"}
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}
      {/* Fan grille (rear/visible side) */}
      <group position={[0.22, -0.3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh ref={fanRef}>
          <ringGeometry args={[0.02, 0.09, 16]} />
          <meshStandardMaterial
            color="#23201d"
            emissive={ACCENT}
            emissiveIntensity={0.18}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* fan blades */}
        {[0, 1, 2, 3, 4].map((b) => (
          <mesh key={b} rotation={[0, 0, (Math.PI * 2 * b) / 5]}>
            <boxGeometry args={[0.085, 0.018, 0.005]} />
            <meshStandardMaterial color="#3a3532" roughness={0.6} />
          </mesh>
        ))}
      </group>
      {/* Lid (opens via konami) */}
      <group ref={lidRef} position={[0, 0.475, 0]}>
        <mesh position={[0, 0.005, 0]}>
          <boxGeometry args={[0.42, 0.012, 0.5]} />
          <meshStandardMaterial color="#1d1a17" roughness={0.6} metalness={0.4} envMapIntensity={0.8} />
        </mesh>
      </group>
      {/* Rubber duck — appears in lid void when konami opens lid */}
      {konami && (
        <group position={[0, 0.45, 0]} scale={0.6}>
          <mesh>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#fdd23a" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshStandardMaterial color="#fdd23a" roughness={0.5} />
          </mesh>
          <mesh position={[0.07, 0.11, 0]} rotation={[0, 0, -0.2]}>
            <coneGeometry args={[0.025, 0.05, 8]} />
            <meshStandardMaterial color={ACCENT} roughness={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
};

/** Server-rack panel that holds the three small monitors on the right. */
export const ServerRackPanel: React.FC = () => (
  <mesh position={[2.18, 0.95, -0.2]} rotation={[0, -Math.PI / 2.4, 0]}>
    <boxGeometry args={[0.7, 1.6, 0.06]} />
    <meshStandardMaterial color="#0e0c0b" roughness={0.85} metalness={0.2} envMapIntensity={0.8} />
  </mesh>
);

/** Office chair with sin-wave micro-sway and konami spin. */
interface ChairProps {
  reducedMotion: boolean;
  konami: boolean;
}
export const Chair: React.FC<ChairProps> = ({ reducedMotion, konami }) => {
  const ref = useRef<THREE.Group>(null);
  const spinRef = useRef(0);

  useFrame((s) => {
    if (!ref.current) return;
    const t = s.clock.elapsedTime;
    if (konami) {
      spinRef.current += 0.18;
      ref.current.rotation.y = spinRef.current;
      if (spinRef.current > Math.PI * 4) spinRef.current = 0;
    } else if (!reducedMotion) {
      ref.current.rotation.y = Math.sin(t * 0.6) * 0.04;
    }
  });

  return (
    <group ref={ref} position={[0, -0.3, 1.55]}>
      {/* Seat */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.55, 0.08, 0.5]} />
        <meshStandardMaterial color="#13110f" roughness={0.7} />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.45, -0.2]} castShadow>
        <boxGeometry args={[0.55, 0.85, 0.06]} />
        <meshStandardMaterial color="#13110f" roughness={0.7} />
      </mesh>
      {/* Arm rests */}
      <mesh position={[-0.31, 0.18, 0]}>
        <boxGeometry args={[0.04, 0.4, 0.32]} />
        <meshStandardMaterial color="#13110f" roughness={0.7} />
      </mesh>
      <mesh position={[0.31, 0.18, 0]}>
        <boxGeometry args={[0.04, 0.4, 0.32]} />
        <meshStandardMaterial color="#13110f" roughness={0.7} />
      </mesh>
      {/* Pedestal */}
      <mesh position={[0, -0.24, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.4, 12]} />
        <meshStandardMaterial color="#1f1c19" roughness={0.4} metalness={0.7} envMapIntensity={0.8} />
      </mesh>
      {/* Wheels */}
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (Math.PI * 2 * i) / 5;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.25, -0.45, Math.sin(a) * 0.25]}
          >
            <sphereGeometry args={[0.04, 10, 10]} />
            <meshStandardMaterial color="#0a0908" roughness={0.5} metalness={0.4} envMapIntensity={0.8} />
          </mesh>
        );
      })}
    </group>
  );
};

