/** @format */

import React, { useMemo } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { HALL_HUB_RADIUS, HALL_CEILING_HEIGHT } from "../sections.ts";

const FLOOR_GLB = `${process.env.PUBLIC_URL}/models/hall/hub-floor.glb`;
const COLUMN_GLB = `${process.env.PUBLIC_URL}/models/hall/hub-column.glb`;
const DOME_GLB = `${process.env.PUBLIC_URL}/models/hall/hub-dome.glb`;
const WALL_GLB = `${process.env.PUBLIC_URL}/models/hall/hub-wall.glb`;
const SKYLIGHT_GLB = `${process.env.PUBLIC_URL}/models/hall/hub-skylight.glb`;
useGLTF.preload(FLOOR_GLB);
useGLTF.preload(COLUMN_GLB);
useGLTF.preload(DOME_GLB);
useGLTF.preload(WALL_GLB);
useGLTF.preload(SKYLIGHT_GLB);

const BRASS_TEX = {
  map: `${process.env.PUBLIC_URL}/textures/hall/brass/brass-diffuse.jpg`,
  normalMap: `${process.env.PUBLIC_URL}/textures/hall/brass/brass-normal.jpg`,
  roughnessMap: `${process.env.PUBLIC_URL}/textures/hall/brass/brass-roughness.jpg`,
};
const FLOOR_TEX = {
  map: `${process.env.PUBLIC_URL}/textures/hall/floor/floor-diffuse.jpg`,
  normalMap: `${process.env.PUBLIC_URL}/textures/hall/floor/floor-normal.jpg`,
  roughnessMap: `${process.env.PUBLIC_URL}/textures/hall/floor/floor-roughness.jpg`,
};

/** Build a brass PBR material from the PolyHaven `metal_plate_02` map set
 *  tinted to brass via the `color` property (the texture's diffuse is a
 *  neutral metal grey — Principled BSDF multiplies it by `color` to give
 *  warm brass). Repeat is cloned per-material so different surfaces can
 *  tile the texture independently without stepping on each other. AO map
 *  intentionally omitted — three.js needs a uv2 attribute for it and the
 *  Blender export only writes uv1. */
function useBrassMaterial(
  repeat: readonly [number, number],
  emissiveIntensity = 0.08,
): THREE.MeshStandardMaterial {
  const maps = useTexture(BRASS_TEX);
  return useMemo(() => {
    const cloned = {
      map: maps.map.clone(),
      normalMap: maps.normalMap.clone(),
      roughnessMap: maps.roughnessMap.clone(),
    };
    Object.values(cloned).forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat[0], repeat[1]);
      t.needsUpdate = true;
    });
    cloned.map.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
      ...cloned,
      color: "#b8862a",
      metalness: 1.0,
      roughness: 0.45,
      emissive: new THREE.Color("#e8b45a"),
      emissiveIntensity,
    });
  }, [maps, repeat, emissiveIntensity]);
}

/** Build a dark-concrete PBR material for the hex floor slab. */
function useFloorMaterial(
  repeat: readonly [number, number],
): THREE.MeshStandardMaterial {
  const maps = useTexture(FLOOR_TEX);
  return useMemo(() => {
    const cloned = {
      map: maps.map.clone(),
      normalMap: maps.normalMap.clone(),
      roughnessMap: maps.roughnessMap.clone(),
    };
    Object.values(cloned).forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat[0], repeat[1]);
      t.needsUpdate = true;
    });
    cloned.map.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
      ...cloned,
      color: "#3a4a4e",
      metalness: 0.1,
      roughness: 0.85,
    });
  }, [maps, repeat]);
}

// Non-PBR materials — kept as solid colours.
const DOME_SHELL_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#0e1e22",
  metalness: 0.4,
  roughness: 0.7,
  side: THREE.BackSide,
  emissive: new THREE.Color("#16383c"),
  emissiveIntensity: 0.18,
});

const WALL_SLAB_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#16242a",
  metalness: 0.3,
  roughness: 0.55,
  emissive: new THREE.Color("#0e1416"),
  emissiveIntensity: 0.35,
});

const SKYLIGHT_DISC_MATERIAL = new THREE.MeshBasicMaterial({
  color: "#f4d8a8",
  transparent: true,
  opacity: 0.92,
  side: THREE.DoubleSide,
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
/** Hex skylight aperture — brass ring + bright emissive disc — mounted
 *  at the dome-base level. Same position as the volumetric god-ray cone
 *  in `Atmosphere.tsx` so the ray reads as emerging from this point. */
const HubSkylight: React.FC = () => {
  const { scene } = useGLTF(SKYLIGHT_GLB);
  const ringMaterial = useBrassMaterial([1, 1], 0.5);
  const { ringGeom, discGeom } = useMemo(() => {
    let ringGeom: THREE.BufferGeometry | null = null;
    let discGeom: THREE.BufferGeometry | null = null;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry) return;
      if (o.name === "hub-skylight-ring") ringGeom = m.geometry;
      else if (o.name === "hub-skylight-disc") discGeom = m.geometry;
    });
    return { ringGeom, discGeom };
  }, [scene]);

  if (!ringGeom || !discGeom) return null;
  return (
    <group position={[0, HALL_CEILING_HEIGHT + 0.05, 0]}>
      <mesh geometry={ringGeom} material={ringMaterial} />
      <mesh geometry={discGeom} material={SKYLIGHT_DISC_MATERIAL} />
    </group>
  );
};

/** Six parapet wall panels at hex-edge midpoints (same angles as the
 *  columns) running column-to-column. Each panel is rotated to face the
 *  hub centre. Two named meshes per glb (slab + frame) materialled
 *  separately so the brass border reads against the dark slab. */
const HubWalls: React.FC = () => {
  const { scene } = useGLTF(WALL_GLB);
  const frameMaterial = useBrassMaterial([4, 1], 0.4);
  const { slabGeom, frameGeom } = useMemo(() => {
    let slabGeom: THREE.BufferGeometry | null = null;
    let frameGeom: THREE.BufferGeometry | null = null;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry) return;
      if (o.name === "hub-wall-slab") slabGeom = m.geometry;
      else if (o.name === "hub-wall-frame") frameGeom = m.geometry;
    });
    return { slabGeom, frameGeom };
  }, [scene]);

  const placements = useMemo<{ pos: [number, number, number]; rotY: number }[]>(
    () => {
      // Same six positions as the columns (hex edge midpoints, three.js
      // angles 30°/90°/150°/210°/270°/330° at radius HALL_HUB_RADIUS * cos(π/6)).
      // Rotation makes each panel's +Y face point toward the hub centre:
      // after the Blender→glTF axis swap the panel's "inner" face is -Z,
      // and rotating around Y by (π - θ) lands -Z on the direction
      // (-sin θ, 0, cos θ) — which is the radial inward direction at column θ.
      const r = HALL_HUB_RADIUS * Math.cos(Math.PI / 6);
      const out: { pos: [number, number, number]; rotY: number }[] = [];
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
        out.push({
          pos: [Math.sin(a) * r, 0, -Math.cos(a) * r],
          rotY: Math.PI - a,
        });
      }
      return out;
    },
    []
  );

  if (!slabGeom || !frameGeom) return null;
  return (
    <group>
      {placements.map((p, i) => (
        <group key={i} position={p.pos} rotation={[0, p.rotY, 0]}>
          <mesh geometry={slabGeom} material={WALL_SLAB_MATERIAL} receiveShadow />
          <mesh geometry={frameGeom} material={frameMaterial} />
        </group>
      ))}
    </group>
  );
};

/** Faceted geodesic dome ceiling + brass lattice overlay, loaded from
 *  `hub-dome.glb`. Same extract-geometry-from-named-meshes pattern as
 *  the floor and columns; mounted at world origin since vertex positions
 *  already encode the z=HALL_CEILING_HEIGHT base. */
const HubDome: React.FC = () => {
  const { scene } = useGLTF(DOME_GLB);
  const latticeMaterial = useBrassMaterial([4, 1], 0.35);
  const { shellGeom, latticeGeom } = useMemo(() => {
    let shellGeom: THREE.BufferGeometry | null = null;
    let latticeGeom: THREE.BufferGeometry | null = null;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry) return;
      if (o.name === "hub-dome-shell") shellGeom = m.geometry;
      else if (o.name === "hub-dome-lattice") latticeGeom = m.geometry;
    });
    return { shellGeom, latticeGeom };
  }, [scene]);

  if (!shellGeom || !latticeGeom) return null;
  return (
    <group>
      <mesh geometry={shellGeom} material={DOME_SHELL_MATERIAL} />
      <mesh geometry={latticeGeom} material={latticeMaterial} />
    </group>
  );
};

/** Six column instances of `hub-column.glb`, placed at hex-edge midpoints
 *  so each column flanks two adjacent alcove openings (not at vertices —
 *  those point at alcoves and would block the arches). Geometry extracted
 *  from the loaded glTF the same way `HubFloor` does it. */
const HubColumns: React.FC = () => {
  const { scene } = useGLTF(COLUMN_GLB);
  const baseMaterial = useBrassMaterial([2, 1], 0.08);
  const shaftMaterial = useBrassMaterial([1, 4], 0.05);
  const capitalMaterial = useBrassMaterial([2, 1], 0.12);
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
          <mesh geometry={baseGeom} material={baseMaterial} castShadow />
          <mesh geometry={shaftGeom} material={shaftMaterial} castShadow />
          <mesh
            geometry={capitalGeom}
            material={capitalMaterial}
            castShadow
          />
        </group>
      ))}
    </group>
  );
};

const HubFloor: React.FC = () => {
  const { scene } = useGLTF(FLOOR_GLB);
  const slabMaterial = useFloorMaterial([4, 4]);
  const inlayMaterial = useBrassMaterial([3, 3], 0.15);
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
        <mesh geometry={slabGeom} receiveShadow material={slabMaterial} />
      )}
      {inlayGeom && (
        <mesh
          geometry={inlayGeom}
          position={[0, 0.001, 0]}
          receiveShadow
          material={inlayMaterial}
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
      <HubWalls />

      <HubDome />

      <HubSkylight />
    </group>
  );
};

export default Hub;
