/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { HALL_HUB_RADIUS, HALL_CEILING_HEIGHT } from "../sections.ts";

const FLOOR_GLB = `${process.env.PUBLIC_URL}/models/hall/hub-floor.glb`;
const COLUMN_GLB = `${process.env.PUBLIC_URL}/models/hall/hub-column.glb`;
useGLTF.preload(FLOOR_GLB);
useGLTF.preload(COLUMN_GLB);

const COLUMN_BASE_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#8a6328",
  metalness: 0.85,
  roughness: 0.32,
});
const COLUMN_SHAFT_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#b8862a",
  metalness: 0.9,
  roughness: 0.22,
});
const COLUMN_CAPITAL_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#e8b45a",
  metalness: 0.92,
  roughness: 0.2,
  emissive: new THREE.Color("#e8b45a"),
  emissiveIntensity: 0.1,
});

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
/** Six column instances of `hub-column.glb`, placed at hex-edge midpoints
 *  so each column flanks two adjacent alcove openings (not at vertices —
 *  those point at alcoves and would block the arches). Geometry extracted
 *  from the loaded glTF the same way `HubFloor` does it. */
const HubColumns: React.FC = () => {
  const { scene } = useGLTF(COLUMN_GLB);
  const { baseGeom, shaftGeom, capitalGeom } = useMemo(() => {
    let baseGeom: THREE.BufferGeometry | null = null;
    let shaftGeom: THREE.BufferGeometry | null = null;
    let capitalGeom: THREE.BufferGeometry | null = null;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry) return;
      if (o.name === "hub-column-base") baseGeom = m.geometry;
      else if (o.name === "hub-column-shaft") shaftGeom = m.geometry;
      else if (o.name === "hub-column-capital") capitalGeom = m.geometry;
    });
    return { baseGeom, shaftGeom, capitalGeom };
  }, [scene]);

  const positions = useMemo<[number, number, number][]>(() => {
    // Hex edge midpoints. Hex floor vertices live at alcove angles (0°, 60°,
    // 120°, 180°, 240°, 300° in three.js). Edge midpoints are offset by 30°
    // — i.e. between adjacent alcoves — so columns flank arches without
    // blocking them. Distance from hub centre = hub_radius * cos(π/6).
    const r = HALL_HUB_RADIUS * Math.cos(Math.PI / 6);
    const out: [number, number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
      out.push([Math.sin(a) * r, 0, -Math.cos(a) * r]);
    }
    return out;
  }, []);

  if (!baseGeom || !shaftGeom || !capitalGeom) return null;

  return (
    <group>
      {positions.map((p, i) => (
        <group key={i} position={p}>
          <mesh geometry={baseGeom} material={COLUMN_BASE_MATERIAL} castShadow />
          <mesh
            geometry={shaftGeom}
            material={COLUMN_SHAFT_MATERIAL}
            castShadow
          />
          <mesh
            geometry={capitalGeom}
            material={COLUMN_CAPITAL_MATERIAL}
            castShadow
          />
        </group>
      ))}
    </group>
  );
};

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

      <HubColumns />

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
