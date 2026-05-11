/** @format */

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface PlantProps {
  reducedMotion: boolean;
}

interface LeafSpec {
  angle: number;
  height: number;
  tilt: number;
  scale: number;
}

const LEAF_COUNT = 12;
const LEAF_REACH_AT_UNIT_SCALE = 0.32;
const PARENT_Y = 0.04;
const STEM_BASE_Y = 0.1;
const MAX_LEAF_TIP_Y = 0.7;

/** Tear-drop leaf shape, extruded for sub-mm thickness. */
function makeLeafGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.06, 0.04, 0.1, 0.16, 0.045, 0.26);
  shape.bezierCurveTo(0.02, 0.3, 0, 0.32, 0, 0.32);
  shape.bezierCurveTo(0, 0.32, -0.02, 0.3, -0.045, 0.26);
  shape.bezierCurveTo(-0.1, 0.16, -0.06, 0.04, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.006,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 16,
  });
  geo.center();
  geo.translate(0, 0.16, 0);
  return geo;
}

/** Stylized desk plant — primitives only. Pot + soil + 12 tear-drop leaves
 *  with gentle rotation animation. */
const Plant: React.FC<PlantProps> = ({ reducedMotion }) => {
  const ref = useRef<THREE.Group>(null);

  const leafGeo = useMemo(makeLeafGeometry, []);

  const leaves = useMemo<LeafSpec[]>(() => {
    const result: LeafSpec[] = [];
    for (let i = 0; i < LEAF_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / LEAF_COUNT + (i % 2) * 0.18;
      const stemHeight = 0.32 + (i % 4) * 0.06;
      const scale = 0.6 + (i % 3) * 0.08;
      const reach = LEAF_REACH_AT_UNIT_SCALE * scale;
      const worldTipY = PARENT_Y + STEM_BASE_Y + stemHeight + reach;
      const cappedStem =
        worldTipY > MAX_LEAF_TIP_Y
          ? Math.max(0.18, MAX_LEAF_TIP_Y - PARENT_Y - STEM_BASE_Y - reach)
          : stemHeight;
      result.push({
        angle,
        height: cappedStem,
        tilt: 0.18 + (i % 3) * 0.12,
        scale,
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
    <group position={[1.05, PARENT_Y, 0.1]}>
      {/* Pot — light stone */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.13, 0.1, 0.18, 32]} />
        <meshStandardMaterial color="#a8a29a" roughness={0.85} metalness={0.0} />
      </mesh>
      {/* Pot rim — slight lip for silhouette definition */}
      <mesh position={[0, 0.092, 0]} castShadow>
        <cylinderGeometry args={[0.135, 0.13, 0.012, 32]} />
        <meshStandardMaterial color="#bdb6ac" roughness={0.78} metalness={0.0} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.085, 0]}>
        <cylinderGeometry args={[0.122, 0.122, 0.012, 32]} />
        <meshStandardMaterial color="#1a120b" roughness={1.0} />
      </mesh>

      {/* Leaves */}
      <group ref={ref} position={[0, STEM_BASE_Y, 0]}>
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
              <mesh position={[0, -leaf.height / 2, 0]} castShadow>
                <cylinderGeometry args={[0.005, 0.007, leaf.height, 12]} />
                <meshStandardMaterial color="#3e5a26" roughness={0.7} />
              </mesh>
              {/* Leaf blade */}
              <mesh
                geometry={leafGeo}
                rotation={[Math.PI / 2, 0, 0]}
                scale={leaf.scale}
                castShadow
              >
                <meshStandardMaterial
                  color="#2d4a1f"
                  emissive="#2d4a1f"
                  emissiveIntensity={0.05}
                  roughness={0.55}
                  metalness={0.0}
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
