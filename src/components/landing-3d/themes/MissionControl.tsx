/** @format */

import React, { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import type { ThemeComponentProps, TechCategory, TechItem } from "../types.ts";
import { CHIP_HEX, TERMINAL_THEME } from "../colors.ts";
import HoverHalo from "../primitives/HoverHalo.tsx";
import FloatingLabel from "../primitives/FloatingLabel.tsx";
import { setHoverDrill } from "../drill.ts";

const RING_RADII: Record<string, number> = {
  "ai-ml": 2.0,
  cloud: 3.0,
  data: 4.0,
  lang: 4.0,
  infra: 3.0,
};

const RING_SPEEDS: Record<string, number> = {
  "ai-ml": 0.18,
  cloud: 0.13,
  data: 0.09,
  lang: 0.11,
  infra: 0.15,
};

interface SatelliteProps {
  tech: TechItem;
  angleOffset: number;
  radius: number;
  speed: number;
  reducedMotion: boolean;
}

const Satellite: React.FC<SatelliteProps> = ({
  tech,
  angleOffset,
  radius,
  speed,
  reducedMotion,
}) => {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const color = CHIP_HEX[tech.color];
  const size = 0.06 + tech.proficiency * 0.04;

  useFrame((state) => {
    if (!ref.current) return;
    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    const a = angleOffset + t * speed;
    ref.current.position.x = Math.cos(a) * radius;
    ref.current.position.z = Math.sin(a) * radius;
    ref.current.position.y = Math.sin(a * 2) * 0.15;
  });

  return (
    <group
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        setHoverDrill(tech.id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        setHoverDrill(null);
        document.body.style.cursor = "";
      }}
    >
      <HoverHalo hovered={hovered} hoverScale={1.4}>
        <mesh>
          <icosahedronGeometry args={[size, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered ? 1.2 : 0.6}
            roughness={0.4}
          />
        </mesh>
      </HoverHalo>
      <FloatingLabel
        text={tech.name}
        sub={`${tech.years} yrs · ${tech.category}`}
        visible={hovered}
        offset={[0, size + 0.25, 0]}
      />
    </group>
  );
};

const Ring: React.FC<{ radius: number; reducedMotion: boolean; speed: number }> = ({
  radius,
  reducedMotion,
  speed,
}) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current || reducedMotion) return;
    ref.current.rotation.z = state.clock.elapsedTime * speed * 0.3;
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.01, radius + 0.01, 96]} />
      <meshBasicMaterial color={TERMINAL_THEME.line} side={THREE.DoubleSide} transparent opacity={0.6} />
    </mesh>
  );
};

const Core: React.FC<{ name: string }> = ({ name }) => {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    if (matRef.current) {
      matRef.current.emissiveIntensity = 0.7 + Math.sin(state.clock.elapsedTime * 1.5) * 0.2;
    }
  });
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial
          ref={matRef}
          color={TERMINAL_THEME.accent}
          emissive={TERMINAL_THEME.accent}
          emissiveIntensity={0.8}
          roughness={0.3}
        />
      </mesh>
      <Text
        position={[0, -0.7, 0]}
        fontSize={0.18}
        color={TERMINAL_THEME.ink}
        anchorX="center"
      >
        {name}
      </Text>
    </group>
  );
};

const Telemetry: React.FC<{
  yoe: number;
  location: string;
  status: string;
  interests: string[];
  aiTools: string[];
}> = ({ yoe, location, status, interests, aiTools }) => {
  const [tick, setTick] = useState(0);
  const startRef = useRef(Date.now());

  useFrame(() => {
    const now = Date.now();
    if (now - startRef.current > 1000) {
      startRef.current = now;
      setTick((t) => (t + 1) % 1000000);
    }
  });

  const seconds = tick;
  return (
    <Html
      fullscreen
      style={{
        pointerEvents: "none",
        fontFamily: TERMINAL_THEME.font,
        color: TERMINAL_THEME.ink,
        fontSize: 11,
      }}
    >
      <div style={{ position: "absolute", top: 12, left: 12, opacity: 0.85 }}>
        <div style={{ color: TERMINAL_THEME.accent }}>$ telemetry --live</div>
        <div>uptime    : {yoe} yrs +{seconds}s</div>
        <div>location  : <span style={{ color: TERMINAL_THEME.blue }}>{location}</span></div>
        <div>status    : <span style={{ color: TERMINAL_THEME.green }}>● {status}</span></div>
      </div>
      <div style={{ position: "absolute", bottom: 12, right: 12, textAlign: "right", opacity: 0.85 }}>
        <div style={{ color: TERMINAL_THEME.accent }}>$ interests/</div>
        {interests.map((i) => (
          <div key={i}>{i}</div>
        ))}
        <div style={{ color: TERMINAL_THEME.accent, marginTop: 6 }}>$ ai-tools/</div>
        {aiTools.map((t) => (
          <div key={t}>{t}</div>
        ))}
      </div>
    </Html>
  );
};

function getRingForCategory(cat: TechCategory): number {
  return RING_RADII[cat] ?? 3.0;
}
function getSpeedForCategory(cat: TechCategory): number {
  return RING_SPEEDS[cat] ?? 0.12;
}

const MissionControl: React.FC<ThemeComponentProps> = ({ data, reducedMotion }) => {
  // Group satellites by category, distribute angles evenly within group
  const satellites = useMemo(() => {
    const grouped: Record<string, TechItem[]> = {};
    data.techStack.forEach((t) => {
      grouped[t.category] = grouped[t.category] || [];
      grouped[t.category].push(t);
    });
    const out: { tech: TechItem; angleOffset: number; radius: number; speed: number }[] = [];
    Object.entries(grouped).forEach(([cat, items]) => {
      items.forEach((t, idx) => {
        out.push({
          tech: t,
          angleOffset: (idx / items.length) * Math.PI * 2,
          radius: getRingForCategory(cat as TechCategory),
          speed: getSpeedForCategory(cat as TechCategory),
        });
      });
    });
    return out;
  }, [data.techStack]);

  const ringRadii = Array.from(new Set(satellites.map((s) => s.radius))).sort();

  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight position={[0, 0, 0]} intensity={1.5} color={TERMINAL_THEME.accent} distance={10} />
      <directionalLight position={[5, 5, 5]} intensity={0.4} />

      <Core name={data.identity.name} />

      {ringRadii.map((r) => (
        <Ring key={r} radius={r} reducedMotion={reducedMotion} speed={getSpeedForCategory("cloud")} />
      ))}

      {satellites.map(({ tech, angleOffset, radius, speed }) => (
        <Satellite
          key={tech.id}
          tech={tech}
          angleOffset={angleOffset}
          radius={radius}
          speed={speed}
          reducedMotion={reducedMotion}
        />
      ))}

      <Telemetry
        yoe={data.identity.yoe}
        location={data.identity.location}
        status={data.identity.status}
        interests={data.interests}
        aiTools={data.aiTools}
      />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableRotate
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.4}
        target={[0, 0, 0]}
      />
    </>
  );
};

export default MissionControl;
