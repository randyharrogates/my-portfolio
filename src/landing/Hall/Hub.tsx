/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { HALL_HUB_RADIUS, HALL_CEILING_HEIGHT } from "../sections.ts";

const FLOOR_GLB = `${process.env.PUBLIC_URL}/models/hall/hub-floor.glb`;
useGLTF.preload(FLOOR_GLB);

const SLAB_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#2a3a3e",
  metalness: 0.25,
  roughness: 0.5,
  emissive: new THREE.Color("#142126"),
  emissiveIntensity: 0.6,
});
const INLAY_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#3a2a14",
  metalness: 0.7,
  roughness: 0.35,
  emissive: new THREE.Color("#3a2a14"),
  emissiveIntensity: 0.18,
});

/** Hub geometry — hexagonal floor from `blender/scripts/hub/floor.py`, plus
 *  placeholder columns + dome + skylight kept around until later Phase 2
 *  sessions rebuild them as real glTF.
 *
 *  Floor convention: top face of the slab sits at y = 0. Anything that
 *  "stands on the floor" should have its base at y = 0. The glb's vertex
 *  positions already encode the location offset (Blender `export_apply=True`),
 *  so we extract geometry from the loaded scene and mount as plain meshes
 *  with explicit materials — `<primitive object={scene} />` ignores material
 *  overrides on un-cloned glTF nodes here.
 */
const HubFloor: React.FC = () => {
  const { scene } = useGLTF(FLOOR_GLB);
  const { slabGeom, inlayGeom } = useMemo(() => {
    let slabGeom: THREE.BufferGeometry | null = null;
    let inlayGeom: THREE.BufferGeometry | null = null;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry) return;
      if (o.name === "hub-floor-slab") slabGeom = m.geometry;
      else if (o.name === "hub-floor-inlay") inlayGeom = m.geometry;
    });
    return { slabGeom, inlayGeom };
  }, [scene]);

  return (
    <group>
      {slabGeom && (
        <mesh geometry={slabGeom} receiveShadow material={SLAB_MATERIAL} />
      )}
      {inlayGeom && (
        <mesh
          geometry={inlayGeom}
          position={[0, 0.001, 0]}
          receiveShadow
          material={INLAY_MATERIAL}
        />
      )}
    </group>
  );
};

const Hub: React.FC = () => {
  const columnPositions = useMemo(() => {
    const out: [number, number, number][] = [];
    const N = 8;
    const r = HALL_HUB_RADIUS * 0.96;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + Math.PI / 8; // offset so columns
      // sit between alcove openings rather than directly in front of them.
      out.push([Math.sin(a) * r, 0, -Math.cos(a) * r]);
    }
    return out;
  }, []);

  const ringGeom = useMemo(() => {
    // Hex outline ring matching the hub floor's six-fold motif. 6 segments
    // → straight edges between vertices, same orientation as `hub-floor-slab`.
    const ring = new THREE.RingGeometry(
      HALL_HUB_RADIUS * 0.92,
      HALL_HUB_RADIUS * 0.98,
      6
    );
    ring.rotateX(-Math.PI / 2);
    return ring;
  }, []);

  return (
    <group>
      <HubFloor />
      {/* Floor-glow ring — the inner light line that reads even at low fidelity */}
      <mesh geometry={ringGeom} position={[0, 0.02, 0]}>
        <meshBasicMaterial color="#4dd0c4" transparent opacity={0.55} />
      </mesh>

      {/* 8 brass columns around the perimeter */}
      {columnPositions.map((p, i) => (
        <group key={i} position={p}>
          {/* Base */}
          <mesh position={[0, 0.18, 0]} castShadow>
            <cylinderGeometry args={[0.32, 0.36, 0.32, 8]} />
            <meshStandardMaterial
              color="#8a6328"
              metalness={0.85}
              roughness={0.32}
            />
          </mesh>
          {/* Shaft */}
          <mesh position={[0, HALL_CEILING_HEIGHT / 2 + 0.18, 0]} castShadow>
            <cylinderGeometry
              args={[0.18, 0.22, HALL_CEILING_HEIGHT - 0.1, 16]}
            />
            <meshStandardMaterial
              color="#b8862a"
              metalness={0.9}
              roughness={0.22}
            />
          </mesh>
          {/* Capital */}
          <mesh position={[0, HALL_CEILING_HEIGHT, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.18, 0.28, 8]} />
            <meshStandardMaterial
              color="#e8b45a"
              metalness={0.92}
              roughness={0.2}
              emissive="#e8b45a"
              emissiveIntensity={0.08}
            />
          </mesh>
        </group>
      ))}

      {/* Dome — top half of a sphere; back-faces visible so it reads from
       *  inside. */}
      <mesh
        position={[0, HALL_CEILING_HEIGHT, 0]}
        rotation={[0, 0, 0]}
        scale={[1, 0.65, 1]}
      >
        <sphereGeometry
          args={[HALL_HUB_RADIUS * 1.5, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshStandardMaterial
          color="#0e1e22"
          metalness={0.4}
          roughness={0.7}
          side={THREE.BackSide}
          emissive="#16383c"
          emissiveIntensity={0.18}
        />
      </mesh>

      {/* Skylight aperture — small bright disc at dome apex, drives the
       *  god-ray spawn point. */}
      <mesh
        position={[0, HALL_CEILING_HEIGHT + 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.4, 0.7, 32]} />
        <meshBasicMaterial color="#f4d8a8" transparent opacity={0.85} />
      </mesh>
    </group>
  );
};

export default Hub;
