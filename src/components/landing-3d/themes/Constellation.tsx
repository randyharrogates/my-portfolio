/** @format */

import React, { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { ThemeComponentProps, TechItem, TechEdge } from "../types.ts";
import { CHIP_HEX, TERMINAL_THEME } from "../colors.ts";
import HoverHalo from "../primitives/HoverHalo.tsx";
import FloatingLabel from "../primitives/FloatingLabel.tsx";
import { setHoverDrill } from "../drill.ts";
import { deterministicHash, topNByProficiency } from "../data.ts";

function hashedPosition(id: string, radius: number): [number, number, number] {
  // Stable Fibonacci-sphere-ish placement seeded by tech id
  const h = deterministicHash(id);
  const u = (h & 0xffff) / 0xffff; // 0..1
  const v = ((h >>> 16) & 0xffff) / 0xffff;
  const phi = Math.acos(2 * u - 1);
  const theta = 2 * Math.PI * v;
  const r = radius * (0.7 + ((h >>> 8) & 0xff) / 0xff * 0.3);
  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
  ];
}

interface NodeProps {
  tech: TechItem;
  position: [number, number, number];
  hoveredId: string | null;
  neighborIds: Set<string>;
  setHoveredId: (id: string | null) => void;
}

const Node: React.FC<NodeProps> = ({ tech, position, hoveredId, neighborIds, setHoveredId }) => {
  const isHovered = hoveredId === tech.id;
  const isNeighbor = hoveredId !== null && neighborIds.has(tech.id);
  const isFaded = hoveredId !== null && !isHovered && !isNeighbor;

  const color = CHIP_HEX[tech.color];
  const size = 0.08 + tech.proficiency * 0.04;
  const opacity = isFaded ? 0.2 : 1;
  const emissiveIntensity = isHovered ? 1.4 : isNeighbor ? 0.9 : 0.5;

  return (
    <group
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredId(tech.id);
        setHoverDrill(tech.id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHoveredId(null);
        setHoverDrill(null);
        document.body.style.cursor = "";
      }}
    >
      <HoverHalo hovered={isHovered} hoverScale={1.25}>
        <mesh>
          <icosahedronGeometry args={[size, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={emissiveIntensity}
            transparent
            opacity={opacity}
            roughness={0.3}
          />
        </mesh>
      </HoverHalo>
      <FloatingLabel
        text={tech.name}
        sub={`${tech.years} yrs · proficiency ${tech.proficiency}/5`}
        visible={isHovered}
        offset={[0, size + 0.3, 0]}
      />
    </group>
  );
};

interface EdgeProps {
  start: [number, number, number];
  end: [number, number, number];
  thickness: number;
  color: string;
  faded: boolean;
  bright: boolean;
}

const Edge: React.FC<EdgeProps> = ({ start, end, thickness, color, faded, bright }) => {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([...start, ...end], 3));
    return g;
  }, [start, end]);

  const opacity = faded ? 0.05 : bright ? 0.95 : 0.4;

  return (
    <line>
      <primitive attach="geometry" object={geom} />
      <lineBasicMaterial
        color={color}
        linewidth={thickness}
        transparent
        opacity={opacity}
      />
    </line>
  );
};

const Constellation: React.FC<ThemeComponentProps> = ({ data, reducedMotion, lowPerf }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Mobile / low-perf: downsample to top-15 by proficiency
  const visibleStack = useMemo(
    () => (lowPerf ? topNByProficiency(data.techStack, 15) : data.techStack),
    [data.techStack, lowPerf]
  );
  const visibleIds = useMemo(() => new Set(visibleStack.map((t) => t.id)), [visibleStack]);

  const positions = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    visibleStack.forEach((t) => {
      map.set(t.id, hashedPosition(t.id, 3.5));
    });
    return map;
  }, [visibleStack]);

  const visibleEdges: TechEdge[] = useMemo(
    () => data.techEdges.filter((e) => visibleIds.has(e.a) && visibleIds.has(e.b)),
    [data.techEdges, visibleIds]
  );

  // Adjacency for hover transitive-fade
  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    visibleEdges.forEach((e) => {
      if (!map.has(e.a)) map.set(e.a, new Set());
      if (!map.has(e.b)) map.set(e.b, new Set());
      map.get(e.a)!.add(e.b);
      map.get(e.b)!.add(e.a);
    });
    return map;
  }, [visibleEdges]);

  const neighborIds = useMemo(
    () => (hoveredId ? adjacency.get(hoveredId) || new Set<string>() : new Set<string>()),
    [hoveredId, adjacency]
  );

  useFrame((_, delta) => {
    if (groupRef.current && !reducedMotion) {
      groupRef.current.rotation.y += delta * 0.06;
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 5]} intensity={0.6} color={TERMINAL_THEME.accent} />

      <group ref={groupRef}>
        {visibleEdges.map((e) => {
          const start = positions.get(e.a);
          const end = positions.get(e.b);
          if (!start || !end) return null;
          const thickness = Math.min(5, Math.max(1, e.projectIds.length));
          const isHoveredEdge =
            hoveredId !== null && (e.a === hoveredId || e.b === hoveredId);
          const faded = hoveredId !== null && !isHoveredEdge;
          return (
            <Edge
              key={`${e.a}-${e.b}`}
              start={start}
              end={end}
              thickness={thickness}
              color={TERMINAL_THEME.line}
              faded={faded}
              bright={isHoveredEdge}
            />
          );
        })}

        {visibleStack.map((t) => {
          const pos = positions.get(t.id);
          if (!pos) return null;
          return (
            <Node
              key={t.id}
              tech={t}
              position={pos}
              hoveredId={hoveredId}
              neighborIds={neighborIds}
              setHoveredId={setHoveredId}
            />
          );
        })}
      </group>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableRotate
        autoRotate={false}
        target={[0, 0, 0]}
      />
    </>
  );
};

export default Constellation;
