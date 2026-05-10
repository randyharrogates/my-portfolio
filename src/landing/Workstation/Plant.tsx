/** @format */

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface PlantProps {
  reducedMotion: boolean;
}

/** Stylized monstera-ish plant built from primitives (no GLTF). */
const Plant: React.FC<PlantProps> = ({ reducedMotion }) => {
  const ref = useRef<THREE.Group>(null);

  // Generate a deterministic set of leaves
  const leaves = useMemo(() => {
    const result: {
      angle: number;
      height: number;
      tilt: number;
      scale: number;
    }[] = [];
    for (let i = 0; i < 9; i++) {
      result.push({
        angle: (Math.PI * 2 * i) / 9 + (i % 2) * 0.3,
        height: 0.5 + (i % 4) * 0.16,
        tilt: 0.25 + (i % 3) * 0.18,
        scale: 0.85 + (i % 3) * 0.18,
      });
    }
    return result;
  }, []);

  useFrame((s) => {
    if (!ref.current || reducedMotion) return;
    const t = s.clock.elapsedTime;
    ref.current.rotation.y = Math.sin(t * 0.3) * 0.03;
    ref.current.children.forEach((leaf, i) => {
      if ("rotation" in leaf) {
        leaf.rotation.x =
          (leaves[i % leaves.length]?.tilt ?? 0.2) +
          Math.sin(t * 0.6 + i) * 0.025;
      }
    });
  });

  return (
    <group position={[1.3, 0.04, -0.6]}>
      {/* Pot */}
      <mesh castShadow>
        <cylinderGeometry args={[0.13, 0.1, 0.18, 18]} />
        <meshStandardMaterial color="#3a2218" roughness={0.85} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.085, 0]}>
        <cylinderGeometry args={[0.122, 0.122, 0.012, 18]} />
        <meshStandardMaterial color="#0e0a07" roughness={1.0} />
      </mesh>

      {/* Leaves */}
      <group ref={ref} position={[0, 0.1, 0]}>
        {leaves.map((leaf, i) => {
          const x = Math.cos(leaf.angle) * 0.06;
          const z = Math.sin(leaf.angle) * 0.06;
          return (
            <group
              key={i}
              position={[x, leaf.height, z]}
              rotation={[leaf.tilt, leaf.angle, 0]}
            >
              {/* Stem */}
              <mesh position={[0, -leaf.height / 2, 0]}>
                <cylinderGeometry
                  args={[0.005, 0.007, leaf.height, 6]}
                />
                <meshStandardMaterial color="#3e5a26" roughness={0.7} />
              </mesh>
              {/* Leaf blade */}
              <mesh
                position={[0, 0, 0]}
                rotation={[Math.PI / 2, 0, 0]}
                scale={leaf.scale}
                castShadow
              >
                <planeGeometry args={[0.2, 0.28]} />
                <meshStandardMaterial
                  color="#3a6a1c"
                  emissive="#1a2b0c"
                  emissiveIntensity={0.05}
                  roughness={0.9}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
};

export default Plant;
