/** @format */

import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { ThemeComponentProps } from "../types.ts";
import { TERMINAL_THEME } from "../colors.ts";
import TerminalScreen from "../primitives/TerminalScreen.tsx";
import HoverHalo from "../primitives/HoverHalo.tsx";
import FloatingLabel from "../primitives/FloatingLabel.tsx";
import { setHoverDrill } from "../drill.ts";

const STATUS_COLOR: Record<string, string> = {
  available: TERMINAL_THEME.green,
  open: TERMINAL_THEME.accent,
  employed: TERMINAL_THEME.mute,
};

const Monitor: React.FC<{
  typedName: string;
  showCursor: boolean;
  role: string;
}> = ({ typedName, showCursor, role }) => {
  const groupRef = useRef<THREE.Group>(null);
  return (
    <group ref={groupRef} position={[0, 0.6, 0]}>
      {/* Bezel */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[2.9, 2.0, 0.12]} />
        <meshStandardMaterial color="#1a1816" roughness={0.6} />
      </mesh>
      {/* Screen */}
      <TerminalScreen
        position={[0, 0, 0.02]}
        typedName={typedName}
        showCursor={showCursor}
        role={role}
      />
      {/* Stand neck */}
      <mesh position={[0, -1.15, -0.1]}>
        <boxGeometry args={[0.3, 0.35, 0.15]} />
        <meshStandardMaterial color="#2a2724" roughness={0.7} />
      </mesh>
      {/* Stand base */}
      <mesh position={[0, -1.4, -0.1]}>
        <boxGeometry args={[0.9, 0.08, 0.5]} />
        <meshStandardMaterial color="#2a2724" roughness={0.7} />
      </mesh>
    </group>
  );
};

interface BookProps {
  position: [number, number, number];
  rotation: [number, number, number];
  short: string;
  full: string;
  domId: string;
  color: string;
}

const Book: React.FC<BookProps> = ({ position, rotation, short, full, domId, color }) => {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        setHoverDrill(domId);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        setHoverDrill(null);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        const el = document.querySelector<HTMLElement>(`[data-cert-id="${domId}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }}
    >
      <HoverHalo hovered={hovered} hoverScale={1.08}>
        <mesh>
          <boxGeometry args={[0.9, 0.18, 0.65]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        {/* Spine label band */}
        <mesh position={[0, 0.091, 0]}>
          <boxGeometry args={[0.85, 0.005, 0.62]} />
          <meshStandardMaterial color="#0c0b0a" />
        </mesh>
      </HoverHalo>
      <FloatingLabel text={short} sub={full} visible={hovered} offset={[0, 0.4, 0]} />
    </group>
  );
};

const Mug: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    <mesh>
      <cylinderGeometry args={[0.18, 0.16, 0.32, 24]} />
      <meshStandardMaterial color="#3a2520" roughness={0.5} />
    </mesh>
    {/* Handle */}
    <mesh position={[0.22, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
      <torusGeometry args={[0.1, 0.03, 8, 16]} />
      <meshStandardMaterial color="#3a2520" roughness={0.5} />
    </mesh>
    {/* Coffee */}
    <mesh position={[0, 0.13, 0]}>
      <cylinderGeometry args={[0.16, 0.16, 0.02, 24]} />
      <meshStandardMaterial color="#0a0605" roughness={0.2} />
    </mesh>
  </group>
);

const StatusLED: React.FC<{ status: string }> = ({ status }) => {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const color = STATUS_COLOR[status] || TERMINAL_THEME.mute;

  useFrame((state) => {
    if (matRef.current) {
      const t = state.clock.elapsedTime;
      matRef.current.emissiveIntensity = 0.6 + Math.sin(t * 2) * 0.25;
    }
  });

  return (
    <mesh ref={ref} position={[1.4, 1.4, -0.6]}>
      <sphereGeometry args={[0.06, 16, 16]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        emissive={color}
        emissiveIntensity={0.7}
      />
    </mesh>
  );
};

const Resume: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position} rotation={[-Math.PI / 2.1, 0, -0.2]}>
    <mesh>
      <planeGeometry args={[0.9, 1.2]} />
      <meshStandardMaterial color="#e8e0d6" roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
    {/* fake text lines */}
    {[0.42, 0.32, 0.22, 0.05, -0.05, -0.15, -0.32, -0.42].map((y, i) => (
      <mesh key={i} position={[0, y, 0.001]}>
        <planeGeometry args={[i === 0 ? 0.5 : 0.7, 0.018]} />
        <meshStandardMaterial color="#3a3532" />
      </mesh>
    ))}
  </group>
);

const Desk: React.FC = () => (
  <mesh position={[0, -0.95, 0]} receiveShadow>
    <boxGeometry args={[6, 0.1, 3]} />
    <meshStandardMaterial color="#1a1614" roughness={0.85} />
  </mesh>
);

const TerminalWorkstation: React.FC<ThemeComponentProps> = ({
  data,
  typedName,
  showCursor,
  reducedMotion,
}) => {
  const sceneRef = useRef<THREE.Group>(null);
  const startTime = useRef(performance.now() / 1000);

  useFrame(() => {
    if (!sceneRef.current || reducedMotion) return;
    const t = performance.now() / 1000 - startTime.current;
    sceneRef.current.rotation.y = Math.sin(t * 0.4) * 0.08;
  });

  // Place each cert as a book on the desk, deterministic positions
  const books = data.certifications.map((cert, idx) => {
    const x = -1.7 + idx * 0.05;
    const y = -0.78 + idx * 0.18;
    const z = 0.6;
    const colorByIdx = [TERMINAL_THEME.accent, TERMINAL_THEME.blue, TERMINAL_THEME.purple, TERMINAL_THEME.green];
    return (
      <Book
        key={cert.id}
        position={[x, y, z]}
        rotation={[0, 0.15, 0]}
        short={cert.short}
        full={cert.full}
        domId={cert.domId || cert.id}
        color={colorByIdx[idx % colorByIdx.length]}
      />
    );
  });

  return (
    <>
      {/* Lights */}
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[-3, 4, 2]}
        intensity={1.3}
        color={TERMINAL_THEME.accent}
      />
      <pointLight position={[0, 1.2, 1.5]} intensity={0.4} color={TERMINAL_THEME.blue} />

      <group ref={sceneRef}>
        <Desk />
        <Monitor typedName={typedName} showCursor={showCursor} role={data.identity.role} />
        {books}
        <Mug position={[1.3, -0.74, 0.6]} />
        <Resume position={[-1.4, -0.89, -0.4]} />
        <StatusLED status={data.identity.status} />
      </group>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableRotate
        autoRotate={false}
        target={[0, 0.2, 0]}
        maxPolarAngle={Math.PI / 2.05}
        minPolarAngle={Math.PI / 3.5}
        rotateSpeed={0.4}
      />
    </>
  );
};

export default TerminalWorkstation;
