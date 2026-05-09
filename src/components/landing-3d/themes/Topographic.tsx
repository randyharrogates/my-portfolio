/** @format */

import React, { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import type { Role, ThemeComponentProps } from "../types.ts";
import { TERMINAL_THEME } from "../colors.ts";
import HoverHalo from "../primitives/HoverHalo.tsx";
import FloatingLabel from "../primitives/FloatingLabel.tsx";
import { setHoverDrill } from "../drill.ts";

const TERRAIN_SIZE = 8;
const TERRAIN_SEG = 48;

function pseudoNoise(x: number, z: number): number {
  // Cheap multi-octave sine noise — deterministic, no deps
  const a = Math.sin(x * 0.6) * Math.cos(z * 0.5);
  const b = Math.sin(x * 1.3 + 1.2) * Math.cos(z * 1.1 + 0.7) * 0.5;
  const c = Math.sin(x * 2.4 + 2.1) * Math.cos(z * 2.0 + 1.4) * 0.25;
  return a + b + c;
}

const Terrain: React.FC = () => {
  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEG, TERRAIN_SEG);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = pseudoNoise(x, z) * 0.25;
      pos.setY(i, y);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <mesh geometry={geom} receiveShadow>
      <meshStandardMaterial
        color="#1a1614"
        roughness={0.95}
        flatShading
        wireframe={false}
      />
    </mesh>
  );
};

const ContourLines: React.FC = () => {
  // Generate horizontal contour rings at fixed elevations
  const lines = useMemo(() => {
    const elevations = [-0.1, 0.0, 0.1, 0.2];
    return elevations.map((elev) => {
      const points: THREE.Vector3[] = [];
      const half = TERRAIN_SIZE / 2;
      const seg = 80;
      for (let i = 0; i < seg; i++) {
        for (let j = 0; j < seg; j++) {
          const x = -half + (i / (seg - 1)) * TERRAIN_SIZE;
          const z = -half + (j / (seg - 1)) * TERRAIN_SIZE;
          const y = pseudoNoise(x, z) * 0.25;
          if (Math.abs(y - elev) < 0.012) {
            points.push(new THREE.Vector3(x, elev + 0.005, z));
          }
        }
      }
      const g = new THREE.BufferGeometry().setFromPoints(points);
      return { geom: g, elev };
    });
  }, []);

  return (
    <>
      {lines.map(({ geom, elev }, i) => (
        <points key={i} geometry={geom}>
          <pointsMaterial
            color={TERMINAL_THEME.mute}
            size={0.025}
            transparent
            opacity={0.4}
          />
        </points>
      ))}
    </>
  );
};

interface PinTowerProps {
  role: Role;
  x: number;
  height: number;
}

const PinTower: React.FC<PinTowerProps> = ({ role, x, height }) => {
  const [hovered, setHovered] = useState(false);
  const color = TERMINAL_THEME.accent;

  const yearLabel = role.endYear
    ? `${role.startYear}–${role.endYear}`
    : `${role.startYear}–now`;

  return (
    <group
      position={[x, 0, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        setHoverDrill(role.domId || role.id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        setHoverDrill(null);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        const el = document.querySelector<HTMLElement>(
          `[data-role-id="${role.domId || role.id}"]`
        );
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }}
    >
      <HoverHalo hovered={hovered} hoverScale={1.15}>
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[0.18, height, 0.18]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered ? 0.7 : 0.25}
            roughness={0.5}
          />
        </mesh>
        {/* Cap */}
        <mesh position={[0, height + 0.12, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>
      </HoverHalo>
      <FloatingLabel
        text={role.title}
        sub={yearLabel}
        visible={hovered}
        offset={[0, height + 0.5, 0]}
      />
      <Text
        position={[0, -0.3, 0.12]}
        fontSize={0.12}
        color={TERMINAL_THEME.mute}
        anchorX="center"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {`'${String(role.startYear).slice(2)}`}
      </Text>
    </group>
  );
};

const Topographic: React.FC<ThemeComponentProps> = ({ data, reducedMotion }) => {
  const groupRef = useRef<THREE.Group>(null);

  const yearRange = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYears = data.roles.map((r) => r.startYear);
    const endYears = data.roles.map((r) => r.endYear ?? currentYear);
    const minY = Math.min(...startYears);
    const maxY = Math.max(...endYears);
    return { minY, maxY };
  }, [data.roles]);

  const towers = useMemo(() => {
    const half = TERRAIN_SIZE / 2 - 0.5;
    const span = yearRange.maxY - yearRange.minY || 1;
    const currentYear = new Date().getFullYear();
    return data.roles.map((role) => {
      const t = (role.startYear - yearRange.minY) / span;
      const x = -half + t * (TERRAIN_SIZE - 1);
      const tenure = (role.endYear ?? currentYear) - role.startYear || 1;
      const height = 0.4 + Math.min(2.2, tenure * 0.3 + role.scope * 0.2);
      return { role, x, height };
    });
  }, [data.roles, yearRange]);

  useFrame((state) => {
    if (groupRef.current && !reducedMotion) {
      const t = state.clock.elapsedTime;
      groupRef.current.rotation.y = Math.sin(t * 0.05) * 0.3;
    }
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[-4, 4, 2]}
        intensity={1.2}
        color="#f5b06b"
        castShadow
      />
      <hemisphereLight color={"#3a2520"} groundColor={"#0c0b0a"} intensity={0.3} />

      <group ref={groupRef} position={[0, -0.2, 0]} rotation={[0, 0, 0]}>
        <Terrain />
        <ContourLines />
        {towers.map(({ role, x, height }) => (
          <PinTower key={role.id} role={role} x={x} height={height} />
        ))}
      </group>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableRotate
        autoRotate={false}
        target={[0, 0.2, 0]}
        maxPolarAngle={Math.PI / 2.05}
        minPolarAngle={Math.PI / 6}
      />
    </>
  );
};

export default Topographic;
