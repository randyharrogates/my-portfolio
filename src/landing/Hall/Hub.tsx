/** @format */

import React, { useMemo } from "react";
import { useGLTF, useKTX2, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { HALL_HUB_RADIUS, HALL_CEILING_HEIGHT } from "../sections.ts";

const FLOOR_GLB = `${process.env.PUBLIC_URL}/models/hall/hub-floor.glb`;
const COLUMN_GLB = `${process.env.PUBLIC_URL}/models/hall/hub-column.glb`;
const DOME_GLB = `${process.env.PUBLIC_URL}/models/hall/hub-dome.glb`;
const SKYLIGHT_GLB = `${process.env.PUBLIC_URL}/models/hall/hub-skylight.glb`;
const PLANTER_GLB = `${process.env.PUBLIC_URL}/models/hall/hub-planter.glb`;
const PACHIRA_GLB = `${process.env.PUBLIC_URL}/models/hall/hub-plant-pachira.glb`;
const FERN_GLB = `${process.env.PUBLIC_URL}/models/hall/hub-plant-fern.glb`;
const OUTER_WALL_GLB = `${process.env.PUBLIC_URL}/models/hall/hub-outer-wall.glb`;
useGLTF.preload(FLOOR_GLB);
useGLTF.preload(COLUMN_GLB);
useGLTF.preload(DOME_GLB);
useGLTF.preload(SKYLIGHT_GLB);
useGLTF.preload(PLANTER_GLB);
useGLTF.preload(PACHIRA_GLB);
useGLTF.preload(FERN_GLB);
useGLTF.preload(OUTER_WALL_GLB);

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

// Baked Cycles outputs from `blender/scripts/bake/`. One KTX2 per named
// hub mesh, addressed by the same name as the BufferGeometry it pairs to.
// Lightmap is sRGB color (diffuse irradiance), AO is linear single-channel-
// equivalent (Basis LZ R8G8B8 unorm).
const BASIS_PATH = `${process.env.PUBLIC_URL}/basis/`;
const BAKED_BASE = `${process.env.PUBLIC_URL}/textures/hall/baked`;
const HUB_MESH_NAMES = [
  "hub-floor-slab",
  "hub-floor-inlay",
  "hub-column-base",
  "hub-column-shaft",
  "hub-column-capital",
  "hub-dome-shell",
  "hub-dome-lattice",
  "hub-skylight-ring",
  "hub-skylight-disc",
  "hub-planter-base",
  "hub-planter-rim",
  "hub-outer-wall-slab",
  "hub-outer-wall-frame",
] as const;
type HubMeshName = (typeof HUB_MESH_NAMES)[number];

const LIGHTMAP_URLS: Record<HubMeshName, string> = Object.fromEntries(
  HUB_MESH_NAMES.map((n) => [n, `${BAKED_BASE}/lightmap/${n}.ktx2`]),
) as Record<HubMeshName, string>;
const AO_URLS: Record<HubMeshName, string> = Object.fromEntries(
  HUB_MESH_NAMES.map((n) => [n, `${BAKED_BASE}/ao/${n}.ktx2`]),
) as Record<HubMeshName, string>;

/** Load all baked KTX2 maps once and configure them for aoMap/lightMap use.
 *  Lightmaps are sRGB (treated as colour); AO maps are linear data. Both
 *  attach to UV channel 1 — three.js' default for ``aoMap`` / ``lightMap`` —
 *  which is where the glTF ``TEXCOORD_1`` from the bake re-export lands.
 */
function useHubBakes(): {
  lightmaps: Record<HubMeshName, THREE.Texture>;
  ao: Record<HubMeshName, THREE.Texture>;
} {
  const lightmaps = useKTX2(LIGHTMAP_URLS, BASIS_PATH) as Record<
    HubMeshName,
    THREE.Texture
  >;
  const ao = useKTX2(AO_URLS, BASIS_PATH) as Record<HubMeshName, THREE.Texture>;
  return useMemo(() => {
    Object.values(lightmaps).forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.flipY = false;
      t.needsUpdate = true;
    });
    Object.values(ao).forEach((t) => {
      t.colorSpace = THREE.NoColorSpace;
      t.flipY = false;
      t.needsUpdate = true;
    });
    return { lightmaps, ao };
  }, [lightmaps, ao]);
}

type BakedMaps = {
  lightmap?: THREE.Texture;
  ao?: THREE.Texture;
  lightMapIntensity?: number;
  aoMapIntensity?: number;
};

/** Build a brass PBR material from the PolyHaven `metal_plate_02` map set
 *  tinted to brass via the `color` property (the texture's diffuse is a
 *  neutral metal grey — Principled BSDF multiplies it by `color` to give
 *  warm brass). Repeat is cloned per-material so different surfaces can
 *  tile the texture independently without stepping on each other.
 *
 *  Optional ``baked`` slot attaches per-mesh Cycles outputs (asset 2.9 +
 *  2.10): ``lightmap`` modulates the diffuse term with pre-shaded irradiance,
 *  ``ao`` darkens crevices via the multiplied ambient-occlusion term. Both
 *  bind to UV channel 1 (the Blender ``UVMap_lightmap`` layer the bake
 *  pipeline added). */
function useBrassMaterial(
  repeat: readonly [number, number],
  emissiveIntensity = 0.08,
  baked?: BakedMaps,
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
      lightMap: baked?.lightmap,
      lightMapIntensity: baked?.lightMapIntensity ?? 0.85,
      aoMap: baked?.ao,
      aoMapIntensity: baked?.aoMapIntensity ?? 1.0,
    });
  }, [maps, repeat, emissiveIntensity, baked]);
}

/** Build a dark-concrete PBR material for the hex floor slab. */
function useFloorMaterial(
  repeat: readonly [number, number],
  baked?: BakedMaps,
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
      lightMap: baked?.lightmap,
      lightMapIntensity: baked?.lightMapIntensity ?? 0.85,
      aoMap: baked?.ao,
      aoMapIntensity: baked?.aoMapIntensity ?? 1.0,
    });
  }, [maps, repeat, baked]);
}

/** Glass dome shell — `MeshPhysicalMaterial` with transmission so the HDRI
 *  vista shines through the dome from above. The Cycles bake is no longer
 *  meaningful for a transparent surface, so we ignore the ``baked`` slot
 *  here (kept in the signature for call-site consistency). */
function useDomeShellMaterial(
  _baked?: BakedMaps,
): THREE.MeshPhysicalMaterial {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#a8b8c0",
        roughness: 0.08,
        metalness: 0.0,
        transmission: 0.92,
        thickness: 0.4,
        ior: 1.45,
        // Session 14: emerald-leaning attenuation (was teal #9bd6c8) so the
        // sky-light passing through the glass picks up a faint Wakandan green.
        attenuationColor: new THREE.Color("#9bd6b0"),
        attenuationDistance: 6.0,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    [],
  );
}

function useWallSlabMaterial(baked?: BakedMaps): THREE.MeshStandardMaterial {
  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#16242a",
        metalness: 0.3,
        roughness: 0.55,
        emissive: new THREE.Color("#0e1416"),
        emissiveIntensity: 0.35,
        lightMap: baked?.lightmap,
        lightMapIntensity: baked?.lightMapIntensity ?? 0.7,
        aoMap: baked?.ao,
        aoMapIntensity: baked?.aoMapIntensity ?? 0.9,
      }),
    [baked],
  );
}

/** Outer-wall slab: matte dark concrete that reads as a defined silhouette
 *  against the bright dusk HDRI horizon. The earlier "lighter slate" pass
 *  blended with the magenta horizon band — moving the wall to pure-matte
 *  (metalness 0, roughness 0.95) stops it picking up environment colour
 *  via reflection, and a deeper base + subtle emissive keeps the silhouette
 *  legible at all camera angles. DoubleSide guards against face-culling
 *  when the camera orbits past the wall plane. */
function useOuterWallMaterial(baked?: BakedMaps): THREE.MeshStandardMaterial {
  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#10161c",
        metalness: 0.0,
        roughness: 0.95,
        emissive: new THREE.Color("#161e26"),
        emissiveIntensity: 0.18,
        side: THREE.DoubleSide,
        lightMap: baked?.lightmap,
        lightMapIntensity: baked?.lightMapIntensity ?? 0.6,
        aoMap: baked?.ao,
        aoMapIntensity: baked?.aoMapIntensity ?? 1.0,
      }),
    [baked],
  );
}

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
  const { lightmaps, ao } = useHubBakes();
  const ringMaterial = useBrassMaterial([4, 2], 0.5, {
    lightmap: lightmaps["hub-skylight-ring"],
    ao: ao["hub-skylight-ring"],
    aoMapIntensity: 0.8,
  });
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

/** Faceted geodesic dome ceiling + brass lattice overlay, loaded from
 *  `hub-dome.glb`. Same extract-geometry-from-named-meshes pattern as
 *  the floor and columns; mounted at world origin since vertex positions
 *  already encode the z=HALL_CEILING_HEIGHT base. */
const HubDome: React.FC = () => {
  const { scene } = useGLTF(DOME_GLB);
  const { lightmaps, ao } = useHubBakes();
  const shellMaterial = useDomeShellMaterial({
    lightmap: lightmaps["hub-dome-shell"],
    ao: ao["hub-dome-shell"],
    lightMapIntensity: 0.6,
    aoMapIntensity: 0.85,
  });
  // Session 15: the chevron lattice has 864 triangles after the wireframe
  // modifier inflates every edge, so Smart UV Project produces hundreds of
  // tiny islands and the bake reads as noise. Skip the bake entirely on
  // this mesh — emissive + direct lighting carries it cleanly.
  const latticeMaterial = useBrassMaterial([16, 2], 0.45, {
    lightMapIntensity: 0,
    aoMapIntensity: 0,
  });
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
      <mesh geometry={shellGeom} material={shellMaterial} />
      <mesh geometry={latticeGeom} material={latticeMaterial} />
    </group>
  );
};

/** Phase 9: three slim sentinel columns at 30°/150°/270° around the hub
 *  (offset from both the entrance axis and the alcove axes). The new outer
 *  enclosing wall takes the structural weight, so columns are decorative
 *  posts rather than load-bearing pillars. Geometry extracted from the
 *  loaded glTF the same way `HubFloor` does it. */
const HubColumns: React.FC = () => {
  const { scene } = useGLTF(COLUMN_GLB);
  const { lightmaps, ao } = useHubBakes();
  const baseMaterial = useBrassMaterial([4, 2], 0.08, {
    lightmap: lightmaps["hub-column-base"],
    ao: ao["hub-column-base"],
    aoMapIntensity: 0.9,
  });
  const shaftMaterial = useBrassMaterial([1, 8], 0.05, {
    lightmap: lightmaps["hub-column-shaft"],
    ao: ao["hub-column-shaft"],
    aoMapIntensity: 0.8,
  });
  const capitalMaterial = useBrassMaterial([4, 2], 0.12, {
    lightmap: lightmaps["hub-column-capital"],
    ao: ao["hub-column-capital"],
    aoMapIntensity: 0.95,
  });
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
    // Three columns at 30°, 150°, 270° — a triangular layout offset from
    // both the entrance axis and the alcove axes so columns never block
    // an alcove arch. Distance from hub centre matches the old hex-edge
    // midpoint radius so the columns still ring the hub floor.
    const r = HALL_HUB_RADIUS * Math.cos(Math.PI / 6);
    return [30, 150, 270].map((deg) => {
      const a = (deg * Math.PI) / 180;
      return [Math.sin(a) * r, 0, -Math.cos(a) * r] as [number, number, number];
    });
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

/** Phase 9 — outer enclosing wall at radius 40 m. Cylindrical dark-concrete
 *  slab pierced by 6 tall pointed-arch windows aligned with the alcove
 *  angles; brass arch frames around each window opening read as the
 *  architectural enclosure that was missing from the open-plaza layout. */
const HubOuterWall: React.FC = () => {
  const { scene } = useGLTF(OUTER_WALL_GLB);
  const { lightmaps, ao } = useHubBakes();
  const slabMaterial = useOuterWallMaterial({
    lightmap: lightmaps["hub-outer-wall-slab"],
    ao: ao["hub-outer-wall-slab"],
    lightMapIntensity: 0.7,
    aoMapIntensity: 0.9,
  });
  // Frame emissive lifted to 0.6 so the arched window surrounds read as
  // warm brass lit by the dusk pouring through each window.
  const frameMaterial = useBrassMaterial([12, 2], 0.6, {
    lightmap: lightmaps["hub-outer-wall-frame"],
    ao: ao["hub-outer-wall-frame"],
    aoMapIntensity: 0.85,
  });
  const { slabGeom, frameGeom } = useMemo(() => {
    let slabGeom: THREE.BufferGeometry | null = null;
    let frameGeom: THREE.BufferGeometry | null = null;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry) return;
      if (o.name === "hub-outer-wall-slab") slabGeom = m.geometry;
      else if (o.name === "hub-outer-wall-frame") frameGeom = m.geometry;
    });
    return { slabGeom, frameGeom };
  }, [scene]);

  if (!slabGeom || !frameGeom) return null;
  return (
    <group>
      <mesh geometry={slabGeom} material={slabMaterial} receiveShadow />
      <mesh geometry={frameGeom} material={frameMaterial} castShadow />
    </group>
  );
};

const HubFloor: React.FC = () => {
  const { scene } = useGLTF(FLOOR_GLB);
  const { lightmaps, ao } = useHubBakes();
  const slabMaterial = useFloorMaterial([20, 20], {
    lightmap: lightmaps["hub-floor-slab"],
    ao: ao["hub-floor-slab"],
    lightMapIntensity: 0.8,
    aoMapIntensity: 0.7,
  });
  const inlayMaterial = useBrassMaterial([14, 14], 0.15, {
    lightmap: lightmaps["hub-floor-inlay"],
    ao: ao["hub-floor-inlay"],
    aoMapIntensity: 0.8,
  });
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

/** Central octagonal planter at the hub centre. Two named meshes:
 *  ``hub-planter-base`` (dark stone) + ``hub-planter-rim`` (brass band).
 *  Sits on top of the floor inlay disc as the visual focal anchor — empty
 *  hub centre felt unanchored; the planter gives the orbital camera something
 *  to settle on. */
const HubPlanter: React.FC = () => {
  const { scene } = useGLTF(PLANTER_GLB);
  const { lightmaps, ao } = useHubBakes();
  const baseMaterial = useWallSlabMaterial({
    lightmap: lightmaps["hub-planter-base"],
    ao: ao["hub-planter-base"],
    lightMapIntensity: 0.7,
    aoMapIntensity: 0.9,
  });
  const rimMaterial = useBrassMaterial([8, 2], 0.25, {
    lightmap: lightmaps["hub-planter-rim"],
    ao: ao["hub-planter-rim"],
    aoMapIntensity: 0.85,
  });
  const { baseGeom, rimGeom } = useMemo(() => {
    let baseGeom: THREE.BufferGeometry | null = null;
    let rimGeom: THREE.BufferGeometry | null = null;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry) return;
      if (o.name === "hub-planter-base") baseGeom = m.geometry;
      else if (o.name === "hub-planter-rim") rimGeom = m.geometry;
    });
    return { baseGeom, rimGeom };
  }, [scene]);

  if (!baseGeom || !rimGeom) return null;
  return (
    <group position={[0, 0.005, 0]}>
      <mesh geometry={baseGeom} material={baseMaterial} receiveShadow castShadow />
      <mesh geometry={rimGeom} material={rimMaterial} castShadow />
    </group>
  );
};

/** Tropical foliage inside the planter — one pachira aquatica "money tree"
 *  as the vertical centerpiece, plus three fern clumps clustered around its
 *  base for low-mid fill. Both assets are PolyHaven CC0 with merged
 *  alpha-mask leaf textures (see ``blender/exports/polyhaven/``).
 *
 *  Planter inner cavity: 1.10m radius, 0.55m deep, top rim at y≈0.63m.
 *  Soil line approximated at y=0.50m (just below the rim) so the roots of
 *  each plant hide inside the pot. */
const HubPlants: React.FC = () => {
  const pachiraGltf = useGLTF(PACHIRA_GLB);
  const fernGltf = useGLTF(FERN_GLB);

  // Clone per-render-tree so each instance is independent — three.js mutates
  // matrices on the scene graph during traversal, and the same scene can't be
  // mounted at multiple positions without cloning.
  const pachiraScene = useMemo(
    () => pachiraGltf.scene.clone(true),
    [pachiraGltf.scene],
  );
  const fernScenes = useMemo(
    () => Array.from({ length: 4 }, () => fernGltf.scene.clone(true)),
    [fernGltf.scene],
  );

  // Cast shadows + adopt the imported materials' alpha settings. The glTF
  // loader respects ``alphaMode: MASK`` → sets ``alphaTest`` automatically,
  // but we tighten roughness/specular here so the foliage reads matte rather
  // than glossy under the warm HDRI fill.
  useMemo(() => {
    const tune = (scene: THREE.Object3D) => {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.castShadow = true;
        m.receiveShadow = true;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat?.isMeshStandardMaterial) {
          mat.roughness = Math.min(0.95, (mat.roughness ?? 0.5) + 0.15);
          mat.metalness = 0;
        }
      });
    };
    tune(pachiraScene);
    fernScenes.forEach(tune);
  }, [pachiraScene, fernScenes]);

  // Fern placement: 4 clumps spread around the planter rim, scaled and
  // rotated independently to avoid the "obviously duplicated" look.
  const fernPlacements = useMemo(
    () =>
      [
        { angle: 0.4, r: 0.7, scale: 0.55, yOffset: 0.0 },
        { angle: 2.0, r: 0.75, scale: 0.48, yOffset: 0.0 },
        { angle: 3.6, r: 0.65, scale: 0.58, yOffset: 0.0 },
        { angle: 5.2, r: 0.72, scale: 0.5, yOffset: 0.0 },
      ].map((p, i) => ({
        position: [
          Math.cos(p.angle) * p.r,
          // Fern model origin is near the top of the plant — push it down
          // so the fronds sit just above the soil line. Empirical: model's
          // min-y after axis-flip lands around -1.3, so y = soil - min_y *
          // scale brings the roots to the soil. Soil at 0.50 → y ≈ 0.50 +
          // 1.3 * scale.
          0.5 + 1.3 * p.scale + p.yOffset,
          Math.sin(p.angle) * p.r,
        ] as [number, number, number],
        rotY: i * 1.2 + 0.7,
        scale: p.scale,
      })),
    [],
  );

  // Pachira: trunk base sits at the soil line. Bumped Session 14 to scale
  // 0.85 so the tree reads as a clear focal feature from across the 14 m
  // hub — at 0.45 it was lost inside the planter cavity.
  const PACHIRA_SCALE = 0.85;
  const PACHIRA_Y = 0.5 + 0.41 * PACHIRA_SCALE;

  return (
    <group>
      <primitive
        object={pachiraScene}
        position={[0, PACHIRA_Y, 0]}
        scale={[PACHIRA_SCALE, PACHIRA_SCALE, PACHIRA_SCALE]}
      />
      {fernScenes.map((scene, i) => {
        const p = fernPlacements[i];
        return (
          <primitive
            key={i}
            object={scene}
            position={p.position}
            rotation={[0, p.rotY, 0]}
            scale={[p.scale, p.scale, p.scale]}
          />
        );
      })}
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
      {/* Floor-glow ring — the inner light line that reads even at low fidelity.
       *  Emerald (was teal) — Session 14 palette shift toward HoZL signature. */}
      <mesh geometry={ringGeom} position={[0, 0.02, 0]}>
        <meshBasicMaterial color="#4ed4a0" transparent opacity={0.55} />
      </mesh>

      <HubColumns />
      <HubOuterWall />

      <HubDome />

      <HubSkylight />

      <HubPlanter />
      <HubPlants />
    </group>
  );
};

export default Hub;
