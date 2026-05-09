/** @format */

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TERMINAL_THEME } from "../../../styles/terminal-theme.ts";

interface Props {
  lowPerf: boolean;
  reducedMotion: boolean;
}

interface NodeDef {
  id: number;
  x: number;
  y: number;
  z: number;
  size: number;
  accent: boolean;
}

// Deterministic seeded PRNG so the layout is identical across reloads
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AgentGraph: React.FC<Props> = ({ lowPerf, reducedMotion }) => {
  const nodeCount = lowPerf ? 22 : 38;
  const root = useRef<THREE.Group>(null);

  const { nodes, edges } = useMemo(() => {
    const rand = mulberry32(7);
    const ns: NodeDef[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const r = 3 + rand() * 4.5;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      ns.push({
        id: i,
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta) * 0.7,
        z: r * Math.cos(phi) - 2,
        size: 0.04 + rand() * 0.06,
        accent: rand() < 0.12, // ~12% are orange
      });
    }
    // Build edges: connect each node to nearest 1-2 neighbours
    const es: [number, number][] = [];
    const seen = new Set<string>();
    for (const a of ns) {
      const others = ns
        .filter((b) => b.id !== a.id)
        .map((b) => ({
          b,
          d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2,
        }))
        .sort((p, q) => p.d - q.d)
        .slice(0, 2);
      for (const { b } of others) {
        const key = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        es.push([a.id, b.id]);
      }
    }
    return { nodes: ns, edges: es };
  }, [nodeCount]);

  // Pre-built edge buffer (nodes are rendered as individual meshes — count is small)
  const edgePositions = useMemo(() => {
    const arr: number[] = [];
    for (const [a, b] of edges) {
      const na = nodes[a];
      const nb = nodes[b];
      arr.push(na.x, na.y, na.z, nb.x, nb.y, nb.z);
    }
    return new Float32Array(arr);
  }, [edges, nodes]);

  useFrame((_, delta) => {
    if (!root.current || reducedMotion) return;
    // Very slow drift
    root.current.rotation.y += delta * 0.02;
    root.current.rotation.x = Math.sin(performance.now() * 0.00006) * 0.08;
  });

  const accentHex = TERMINAL_THEME.accent;
  const muteHex = TERMINAL_THEME.mute;
  const lineHex = TERMINAL_THEME.line;

  return (
    <group ref={root}>
      {/* Edges */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[edgePositions, 3]}
            count={edgePositions.length / 3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={lineHex} transparent opacity={0.32} />
      </lineSegments>

      {/* Nodes — instanced point sprites for cheapness */}
      {nodes.map((n) => (
        <mesh key={n.id} position={[n.x, n.y, n.z]}>
          <sphereGeometry args={[n.size, 8, 8]} />
          <meshBasicMaterial
            color={n.accent ? accentHex : muteHex}
            transparent
            opacity={n.accent ? 0.85 : 0.55}
          />
        </mesh>
      ))}
    </group>
  );
};

export default AgentGraph;
