/** @format */

import React, { useMemo, useState, useCallback, useRef } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  HALL_ALCOVE_ORDER,
  HALL_THEMES,
  alcoveCentre,
  alcoveFacing,
} from "../sections.ts";
import type { SectionId, AlcoveOpenness } from "../sections.ts";
import Hologram from "./Hologram.tsx";
import type { CanvasContent } from "./HologramContent/canvas-content.ts";
import AboutTimeline from "./HologramContent/AboutTimeline.tsx";
import ProjectTiles from "./HologramContent/ProjectTiles.tsx";
import SkillConstellation from "./HologramContent/SkillConstellation.tsx";
import BlogFeed from "./HologramContent/BlogFeed.tsx";
import ScrollingResume from "./HologramContent/ScrollingResume.tsx";
import ContactArray from "./HologramContent/ContactArray.tsx";

interface AlcoveProps {
  id: SectionId;
  onSelect: (id: SectionId) => void;
  hovered: boolean;
  onHoverChange: (hovered: boolean) => void;
  /** Reduced-motion: lock hologram scanlines/flicker. */
  staticMode?: boolean;
  /** Shared shell geometries — extracted once by the wrapper and passed
   *  to each alcove instance to avoid 6× duplicate scene-traversal cost. */
  shellGeoms: ShellGeoms;
  /** Shared arch geometries (frame + tracery). */
  archGeoms: ArchGeoms;
  /** Shared mount geometries (bezel + shelf). */
  mountGeoms: MountGeoms;
  /** Shared pedestal geometries (central pedestal + opening threshold). */
  pedestalGeoms: PedestalGeoms;
  /** Phase 5 per-theme prop geometries, keyed by SectionId. Each alcove
   *  pulls just its own theme's geometry. */
  themePropGeoms: Partial<Record<SectionId, THREE.BufferGeometry>>;
}

const CONTENT_BY_ID: Record<
  SectionId,
  React.FC<{ onTextureReady: (tex: CanvasContent) => void }>
> = {
  about: AboutTimeline,
  projects: ProjectTiles,
  skills: SkillConstellation,
  blog: BlogFeed,
  resume: ScrollingResume,
  contact: ContactArray,
};

const ALCOVE_SHELL_GLB = `${process.env.PUBLIC_URL}/models/hall/alcove-shell.glb`;
const ALCOVE_ARCH_GLB = `${process.env.PUBLIC_URL}/models/hall/alcove-arch.glb`;
const ALCOVE_MOUNT_GLB = `${process.env.PUBLIC_URL}/models/hall/alcove-mount.glb`;
const ALCOVE_PEDESTAL_GLB = `${process.env.PUBLIC_URL}/models/hall/alcove-pedestal.glb`;
useGLTF.preload(ALCOVE_SHELL_GLB);
useGLTF.preload(ALCOVE_ARCH_GLB);
useGLTF.preload(ALCOVE_MOUNT_GLB);
useGLTF.preload(ALCOVE_PEDESTAL_GLB);

// Phase 5 per-theme props. One unique prop per theme except `projects`
// (which uses the bare alcove template — that's the canonical "gallery
// piece" itself). Each glb contains a single named mesh.
const THEME_PROP_GLB: Partial<Record<SectionId, { url: string; meshName: string }>> = {
  about:   { url: `${process.env.PUBLIC_URL}/models/hall/about-timeline.glb`,   meshName: "alcove-about-timeline" },
  skills:  { url: `${process.env.PUBLIC_URL}/models/hall/skills-badges.glb`,    meshName: "alcove-skills-badges" },
  blog:    { url: `${process.env.PUBLIC_URL}/models/hall/blog-bookshelf.glb`,   meshName: "alcove-blog-bookshelf" },
  resume:  { url: `${process.env.PUBLIC_URL}/models/hall/resume-column.glb`,    meshName: "alcove-resume-column" },
  contact: { url: `${process.env.PUBLIC_URL}/models/hall/contact-orbits.glb`,   meshName: "alcove-contact-orbits" },
};
Object.values(THEME_PROP_GLB).forEach((p) => p && useGLTF.preload(p.url));

// Alcove-local placement for each theme prop (outer-group coords, where
// +Z points back toward the hub centre, -Z points to the back wall).
// Y=0.16 = the alcove floor lift (props rest on the raised floor slab).
// Positions kept inside the focal-pose FOV (±2.5 m on X) so each prop
// frames cleanly when the camera enters the alcove. About vs resume use
// opposite sides so the two half-open alcoves read distinctly. Session
// 21 polish: about pulled forward (z=-2.0) and skills lifted (y=0.40)
// so badges read as "above pedestal" instead of "wrapping" it.
const THEME_PROP_POSE: Partial<Record<SectionId, {
  position: [number, number, number];
  rotation: [number, number, number];
  /** Optional Y-axis spin rate, radians/s. Used by skills + contact for
   *  the "live" feel; absent on static props. */
  spinRateY?: number;
  /** Optional X-axis spin rate, radians/s. Contact uses this on its
   *  inner orbit nest so the rings precess. */
  spinRateX?: number;
}>> = {
  about:   { position: [-2.4, 0.16, -2.0], rotation: [0, 0, 0] },
  skills:  { position: [ 0.0, 0.40, -3.4], rotation: [0, 0, 0], spinRateY: 0.18 },
  blog:    { position: [ 0.0, 0.16, -6.4], rotation: [0, Math.PI, 0] },
  resume:  { position: [ 2.4, 0.16, -3.4], rotation: [0, 0, 0] },
  contact: { position: [-2.4, 2.20, -3.4], rotation: [0, 0, 0], spinRateY: 0.28, spinRateX: 0.12 },
};

// Session 20: walls split into 3 separately-named meshes so the React
// side can hide them conditionally per theme.openness.
const SHELL_MESH_NAMES = [
  "alcove-shell-back-wall",
  "alcove-shell-side-wall-left",
  "alcove-shell-side-wall-right",
  "alcove-shell-ceiling",
  "alcove-shell-floor",
  "alcove-shell-pilasters",
  "alcove-shell-cornice",
] as const;
type ShellMeshName = (typeof SHELL_MESH_NAMES)[number];
type ShellGeoms = Partial<Record<ShellMeshName, THREE.BufferGeometry>>;

const ARCH_MESH_NAMES = [
  "alcove-arch-frame",
  "alcove-arch-tracery",
] as const;
type ArchMeshName = (typeof ARCH_MESH_NAMES)[number];
type ArchGeoms = Partial<Record<ArchMeshName, THREE.BufferGeometry>>;

const MOUNT_MESH_NAMES = [
  "alcove-mount-frame",
  "alcove-mount-shelf",
] as const;
type MountMeshName = (typeof MOUNT_MESH_NAMES)[number];
type MountGeoms = Partial<Record<MountMeshName, THREE.BufferGeometry>>;

const PEDESTAL_MESH_NAMES = [
  "alcove-pedestal",
  "alcove-threshold",
] as const;
type PedestalMeshName = (typeof PEDESTAL_MESH_NAMES)[number];
type PedestalGeoms = Partial<Record<PedestalMeshName, THREE.BufferGeometry>>;

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

function useShellGeoms(): ShellGeoms {
  const { scene } = useGLTF(ALCOVE_SHELL_GLB);
  return useMemo(() => {
    const out: ShellGeoms = {};
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry) return;
      if ((SHELL_MESH_NAMES as readonly string[]).includes(o.name)) {
        out[o.name as ShellMeshName] = m.geometry;
      }
    });
    return out;
  }, [scene]);
}

function useArchGeoms(): ArchGeoms {
  const { scene } = useGLTF(ALCOVE_ARCH_GLB);
  return useMemo(() => {
    const out: ArchGeoms = {};
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry) return;
      if ((ARCH_MESH_NAMES as readonly string[]).includes(o.name)) {
        out[o.name as ArchMeshName] = m.geometry;
      }
    });
    return out;
  }, [scene]);
}

function useMountGeoms(): MountGeoms {
  const { scene } = useGLTF(ALCOVE_MOUNT_GLB);
  return useMemo(() => {
    const out: MountGeoms = {};
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry) return;
      if ((MOUNT_MESH_NAMES as readonly string[]).includes(o.name)) {
        out[o.name as MountMeshName] = m.geometry;
      }
    });
    return out;
  }, [scene]);
}

function usePedestalGeoms(): PedestalGeoms {
  const { scene } = useGLTF(ALCOVE_PEDESTAL_GLB);
  return useMemo(() => {
    const out: PedestalGeoms = {};
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry) return;
      if ((PEDESTAL_MESH_NAMES as readonly string[]).includes(o.name)) {
        out[o.name as PedestalMeshName] = m.geometry;
      }
    });
    return out;
  }, [scene]);
}

/** Pull each theme prop's named mesh out of its own glb. One named mesh
 *  per file. Returns a partial map keyed by SectionId — `projects` is
 *  absent because the bare alcove template IS the projects "prop". */
function useThemePropGeoms(): Partial<Record<SectionId, THREE.BufferGeometry>> {
  const aboutScene = useGLTF(THEME_PROP_GLB.about!.url).scene;
  const skillsScene = useGLTF(THEME_PROP_GLB.skills!.url).scene;
  const blogScene = useGLTF(THEME_PROP_GLB.blog!.url).scene;
  const resumeScene = useGLTF(THEME_PROP_GLB.resume!.url).scene;
  const contactScene = useGLTF(THEME_PROP_GLB.contact!.url).scene;

  return useMemo(() => {
    function extract(scene: THREE.Object3D, meshName: string): THREE.BufferGeometry | undefined {
      let found: THREE.BufferGeometry | undefined;
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.geometry) return;
        if (o.name === meshName) {
          found = m.geometry;
        }
      });
      return found;
    }
    return {
      about:   extract(aboutScene,   THEME_PROP_GLB.about!.meshName),
      skills:  extract(skillsScene,  THEME_PROP_GLB.skills!.meshName),
      blog:    extract(blogScene,    THEME_PROP_GLB.blog!.meshName),
      resume:  extract(resumeScene,  THEME_PROP_GLB.resume!.meshName),
      contact: extract(contactScene, THEME_PROP_GLB.contact!.meshName),
    };
  }, [aboutScene, skillsScene, blogScene, resumeScene, contactScene]);
}

function useAlcoveBrassMaterial(
  repeat: readonly [number, number],
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
      emissiveIntensity: 0.18,
    });
  }, [maps, repeat]);
}

function useAlcoveSlabMaterial(
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
      color: "#2a3438",
      metalness: 0.15,
      roughness: 0.78,
    });
  }, [maps, repeat]);
}

/** Solid wall material — per-alcove instance so each gets its own theme-
 *  accent emissive lift that responds to hover. Session 26c: accent
 *  emissive dropped (0.05 → 0.02) so the dark cathedral interior stays
 *  neutral against the bright daylight; hover lift (0.16 → 0.08)
 *  remains subtle. */
function useAlcoveWallMaterial(
  accent: string,
): THREE.MeshStandardMaterial {
  return useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#0e1a1e",
      metalness: 0.25,
      roughness: 0.7,
      emissive: new THREE.Color(accent),
      emissiveIntensity: 0.02,
    });
  }, [accent]);
}

/** Translucent glass material — `translucent` alcoves render their walls
 *  with this. Session 26c: base colour neutralised to dark teal so the
 *  glass reads as glass (not coloured plastic); accent only survives in
 *  the `attenuationColor` so light passing through still picks up the
 *  theme tint, and a low-intensity accent emissive (0.08 → 0.03)
 *  prevents the wall from glowing in the daylight palette. */
function useAlcoveGlassMaterial(
  accent: string,
): THREE.MeshPhysicalMaterial {
  return useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: "#1a2228",
      metalness: 0.0,
      roughness: 0.18,
      transmission: 0.7,
      thickness: 0.5,
      ior: 1.45,
      attenuationColor: new THREE.Color(accent),
      attenuationDistance: 8.0,
      transparent: true,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(accent),
      emissiveIntensity: 0.03,
    });
  }, [accent]);
}

/** Should the back wall render for this openness mode? */
function showsBackWall(openness: AlcoveOpenness): boolean {
  return openness === "half-open" || openness === "translucent";
}

/** Should the side walls + ceiling render for this openness mode? */
function showsSidesAndCeiling(openness: AlcoveOpenness): boolean {
  return openness === "translucent";
}

/** Phase 9: does this openness render a knee-height brass parapet across
 *  the hub-facing opening? Only the `gated` mode (skills armory) does. */
function showsGatedParapet(openness: AlcoveOpenness): boolean {
  return openness === "gated";
}

/** Render the per-theme prop for a given alcove. Pulls the prop's
 *  alcove-local pose from THEME_PROP_POSE and uses the shared brass
 *  material at theme-accent emissive intensity. Optional `spinRateY` /
 *  `spinRateX` apply slow continuous rotation via useFrame — used by
 *  skills (badges revolve around pedestal) and contact (orbital rings
 *  precess). */
const ThemeProp: React.FC<{
  id: SectionId;
  geom?: THREE.BufferGeometry;
  accent: string;
  staticMode: boolean;
}> = ({ id, geom, accent, staticMode }) => {
  const propBrass = useAlcoveBrassMaterial([4, 4]);
  React.useEffect(() => {
    propBrass.emissive = new THREE.Color(accent);
    propBrass.emissiveIntensity = 0.22;
    propBrass.needsUpdate = true;
  }, [propBrass, accent]);

  const meshGroupRef = useRef<THREE.Group>(null);
  const pose = THEME_PROP_POSE[id];

  useFrame((_, dt) => {
    if (staticMode || !meshGroupRef.current || !pose) return;
    if (pose.spinRateY) {
      meshGroupRef.current.rotation.y += pose.spinRateY * dt;
    }
    if (pose.spinRateX) {
      meshGroupRef.current.rotation.x += pose.spinRateX * dt;
    }
  });

  if (!geom || !pose) return null;

  return (
    <group position={pose.position} rotation={pose.rotation}>
      <group ref={meshGroupRef}>
        <mesh
          geometry={geom}
          material={propBrass}
          castShadow
          receiveShadow
        />
      </group>
    </group>
  );
};

const Alcove: React.FC<AlcoveProps> = ({
  id,
  onSelect,
  hovered,
  onHoverChange,
  staticMode = false,
  shellGeoms,
  archGeoms,
  mountGeoms,
  pedestalGeoms,
  themePropGeoms,
}) => {
  const idx = HALL_ALCOVE_ORDER.indexOf(id);
  const centre = alcoveCentre(idx);
  const yaw = alcoveFacing(idx);
  const theme = HALL_THEMES[id];
  const [tex, setTex] = useState<CanvasContent | null>(null);
  const handleTexture = useCallback((c: CanvasContent) => setTex(c), []);
  const ContentRenderer = CONTENT_BY_ID[id];

  const wallMaterial = useAlcoveWallMaterial(theme.accent);
  const glassMaterial = useAlcoveGlassMaterial(theme.accent);
  React.useEffect(() => {
    wallMaterial.emissiveIntensity = hovered ? 0.08 : 0.02;
  }, [hovered, wallMaterial]);

  const backWallGeom = shellGeoms["alcove-shell-back-wall"];
  const leftWallGeom = shellGeoms["alcove-shell-side-wall-left"];
  const rightWallGeom = shellGeoms["alcove-shell-side-wall-right"];
  const ceilingGeom = shellGeoms["alcove-shell-ceiling"];
  const floorGeom = shellGeoms["alcove-shell-floor"];
  const pilasterGeom = shellGeoms["alcove-shell-pilasters"];
  const corniceGeom = shellGeoms["alcove-shell-cornice"];
  const archFrameGeom = archGeoms["alcove-arch-frame"];
  const archTraceryGeom = archGeoms["alcove-arch-tracery"];
  const mountFrameGeom = mountGeoms["alcove-mount-frame"];
  const mountShelfGeom = mountGeoms["alcove-mount-shelf"];
  const pedestalGeom = pedestalGeoms["alcove-pedestal"];
  const thresholdGeom = pedestalGeoms["alcove-threshold"];

  return (
    <group position={[centre[0], 0, centre[2]]} rotation={[0, yaw, 0]}>
      <SharedShellMeshes
        rotation={[0, Math.PI, 0]}
        backWallGeom={backWallGeom}
        leftWallGeom={leftWallGeom}
        rightWallGeom={rightWallGeom}
        ceilingGeom={ceilingGeom}
        floorGeom={floorGeom}
        pilasterGeom={pilasterGeom}
        corniceGeom={corniceGeom}
        archFrameGeom={archFrameGeom}
        archTraceryGeom={archTraceryGeom}
        mountFrameGeom={mountFrameGeom}
        mountShelfGeom={mountShelfGeom}
        pedestalGeom={pedestalGeom}
        thresholdGeom={thresholdGeom}
        wallMaterial={wallMaterial}
        glassMaterial={glassMaterial}
        accentColor={theme.accent}
        openness={theme.openness}
      />

      {/* Hologram screen. Session 20: doubled to 6 × 3.5 m and lifted to
       *  y=4.6 m to centre on the new mount bezel at the 2× scale. Back
       *  wall is at z ≈ −6.93 m; hologram at z=-6 puts it 0.93 m forward. */}
      <group position={[0, 4.6, -6.0]}>
        <Hologram
          contentTexture={tex?.texture ?? null}
          color={theme.hologramColor}
          size={[6.0, 3.5]}
          curvature={0.22}
          staticMode={staticMode}
        />
      </group>
      <ContentRenderer onTextureReady={handleTexture} />

      {/* Phase 5 per-theme prop. Projects has no entry (the bare alcove
       *  template is the prop). Each prop renders with the shared brass
       *  material at a hand-tuned alcove-local pose. */}
      <ThemeProp
        id={id}
        geom={themePropGeoms?.[id]}
        accent={theme.accent}
        staticMode={staticMode}
      />

      {/* Hit volume for click + hover — scaled 2× to match the new alcove. */}
      <mesh
        position={[0, 4.0, -3.4]}
        visible={false}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverChange(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHoverChange(false);
        }}
      >
        <boxGeometry args={[14.0, 10.0, 6.8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Practical fill light — warm tungsten low on the back wall, gives
       *  the hologram silhouette separation from whatever's behind.
       *  Session 21 polish: +30% intensity to lift the alcove interior
       *  at the 2× scale (Session 20 honest-read item). */}
      <pointLight
        position={[0, 2.8, -6.4]}
        intensity={hovered ? 2.86 : 1.82}
        color="#f4d8a8"
        distance={13.0}
        decay={2}
      />
    </group>
  );
};

interface SharedShellMeshesProps {
  rotation: [number, number, number];
  backWallGeom?: THREE.BufferGeometry;
  leftWallGeom?: THREE.BufferGeometry;
  rightWallGeom?: THREE.BufferGeometry;
  ceilingGeom?: THREE.BufferGeometry;
  floorGeom?: THREE.BufferGeometry;
  pilasterGeom?: THREE.BufferGeometry;
  corniceGeom?: THREE.BufferGeometry;
  archFrameGeom?: THREE.BufferGeometry;
  archTraceryGeom?: THREE.BufferGeometry;
  mountFrameGeom?: THREE.BufferGeometry;
  mountShelfGeom?: THREE.BufferGeometry;
  pedestalGeom?: THREE.BufferGeometry;
  thresholdGeom?: THREE.BufferGeometry;
  wallMaterial: THREE.Material;
  glassMaterial: THREE.Material;
  /** Theme accent for the per-alcove tracery emissive. */
  accentColor: string;
  /** Drives which walls / ceiling render. */
  openness: AlcoveOpenness;
}

const SharedShellMeshes: React.FC<SharedShellMeshesProps> = ({
  rotation,
  backWallGeom,
  leftWallGeom,
  rightWallGeom,
  ceilingGeom,
  floorGeom,
  pilasterGeom,
  corniceGeom,
  archFrameGeom,
  archTraceryGeom,
  mountFrameGeom,
  mountShelfGeom,
  pedestalGeom,
  thresholdGeom,
  wallMaterial,
  glassMaterial,
  accentColor,
  openness,
}) => {
  // Tile densities chosen to keep texel-per-meter close to the hub at
  // the new 2× scale: pilaster ~1 m tall per tile, cornice ~1 m per
  // tile. Concrete slab tiled at ~2 m per tile.
  const pilasterBrass = useAlcoveBrassMaterial([2, 8]);
  const corniceBrass = useAlcoveBrassMaterial([8, 2]);
  const archFrameBrass = useAlcoveBrassMaterial([2, 6]);
  const mountBrass = useAlcoveBrassMaterial([6, 4]);
  const pedestalBrass = useAlcoveBrassMaterial([4, 2]);
  const slabMaterial = useAlcoveSlabMaterial([6, 6]);

  // Session 26c: accent emissive dropped 0.35 → 0.15 so the brass
  // mullion bars stay warm-brass-toned without throwing strong theme-
  // coloured glow into the daylight palette.
  const traceryMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#b8862a",
      metalness: 1.0,
      roughness: 0.4,
      emissive: new THREE.Color(accentColor),
      emissiveIntensity: 0.15,
    });
  }, [accentColor]);

  const renderBack = showsBackWall(openness);
  const renderSidesAndCeiling = showsSidesAndCeiling(openness);
  const wallMat = openness === "translucent" ? glassMaterial : wallMaterial;

  return (
    <group rotation={rotation}>
      {renderBack && backWallGeom ? (
        <mesh geometry={backWallGeom} material={wallMat} castShadow receiveShadow />
      ) : null}
      {renderSidesAndCeiling && leftWallGeom ? (
        <mesh geometry={leftWallGeom} material={wallMat} castShadow receiveShadow />
      ) : null}
      {renderSidesAndCeiling && rightWallGeom ? (
        <mesh geometry={rightWallGeom} material={wallMat} castShadow receiveShadow />
      ) : null}
      {renderSidesAndCeiling && ceilingGeom ? (
        <mesh geometry={ceilingGeom} material={slabMaterial} receiveShadow />
      ) : null}
      {/* Floor is rendered in EVERY openness mode — even fully-open
       *  pavilions stand on the raised alcove floor slab. */}
      {floorGeom ? (
        <mesh geometry={floorGeom} material={slabMaterial} receiveShadow />
      ) : null}
      {pilasterGeom ? (
        <mesh geometry={pilasterGeom} material={pilasterBrass} castShadow />
      ) : null}
      {corniceGeom ? (
        <mesh geometry={corniceGeom} material={corniceBrass} castShadow />
      ) : null}
      {archFrameGeom ? (
        <mesh geometry={archFrameGeom} material={archFrameBrass} castShadow />
      ) : null}
      {archTraceryGeom ? (
        <mesh geometry={archTraceryGeom} material={traceryMaterial} castShadow />
      ) : null}
      {/* Mount frame + shelf at Session 20 2× position. */}
      {(mountFrameGeom || mountShelfGeom) ? (
        <group position={[0, 4.6, 6.0]}>
          {mountFrameGeom ? (
            <mesh geometry={mountFrameGeom} material={mountBrass} castShadow />
          ) : null}
          {mountShelfGeom ? (
            <mesh geometry={mountShelfGeom} material={mountBrass} castShadow />
          ) : null}
        </group>
      ) : null}
      {/* Central pedestal at the alcove's interior centre. Session 20:
       *  z = +3.4 (was +1.7), y = 0.16 (was 0.08). */}
      {pedestalGeom ? (
        <group position={[0, 0.16, 3.4]}>
          <mesh
            geometry={pedestalGeom}
            material={pedestalBrass}
            castShadow
            receiveShadow
          />
        </group>
      ) : null}
      {/* Threshold strip at the alcove opening edge. */}
      {thresholdGeom ? (
        <mesh
          geometry={thresholdGeom}
          material={pedestalBrass}
          castShadow
          receiveShadow
        />
      ) : null}
      {/* Phase 9: knee-height brass parapet across the hub-facing opening
       *  for the `gated` openness (skills armory). 14 m wide spans the
       *  full alcove front; 0.9 m tall reads as knee-height; centred at
       *  y=0.45 (base on the floor). z=0 sits at the threshold edge so
       *  the parapet visually anchors the alcove opening. */}
      {showsGatedParapet(openness) ? (
        <mesh
          position={[0, 0.45, 0]}
          material={pedestalBrass}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[14, 0.9, 0.5]} />
        </mesh>
      ) : null}
    </group>
  );
};

export default Alcove;

interface AlcovesProps {
  onSelect: (id: SectionId) => void;
  hoveredId: SectionId | null;
  onHoverChange: (id: SectionId | null) => void;
  staticMode?: boolean;
}

export const Alcoves: React.FC<AlcovesProps> = ({
  onSelect,
  hoveredId,
  onHoverChange,
  staticMode,
}) => {
  const shellGeoms = useShellGeoms();
  const archGeoms = useArchGeoms();
  const mountGeoms = useMountGeoms();
  const pedestalGeoms = usePedestalGeoms();
  const themePropGeoms = useThemePropGeoms();
  return (
    <>
      {HALL_ALCOVE_ORDER.map((id) => (
        <Alcove
          key={id}
          id={id}
          onSelect={onSelect}
          hovered={hoveredId === id}
          onHoverChange={(h) => onHoverChange(h ? id : null)}
          staticMode={staticMode}
          shellGeoms={shellGeoms}
          archGeoms={archGeoms}
          mountGeoms={mountGeoms}
          pedestalGeoms={pedestalGeoms}
          themePropGeoms={themePropGeoms}
        />
      ))}
    </>
  );
};
