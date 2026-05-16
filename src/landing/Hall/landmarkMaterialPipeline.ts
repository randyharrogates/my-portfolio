/** @format */

import * as THREE from "three";
import { MeshStandardNodeMaterial, MeshBasicNodeMaterial } from "three/webgpu";

/** Canonical material-conversion pipeline for `/hall` landmarks.
 *
 *  Locked 2026-05-16 against `blender/skills-landmark-bake.blend` as the
 *  reference. See `CLAUDE.md` "/hall GRAPHICS PIPELINE STANDARD" for the
 *  full rationale + bake-side standards. Two recipes:
 *
 *    1. `applyStandardLandmarkMaterials` — lit, 3-tier emission. Used by
 *       every shipping landmark (Skills, Projects, Contact, About, Blog,
 *       Resume). Optional vertex-noise injection + dynamic shadows for
 *       cartoony/playful landmarks (About uses both).
 *
 *    2. `applyUnlitLandmarkMaterials` — unlit, baked-only. Retained for
 *       cases where a landmark ships ONLY baked stone-stele content with
 *       no authored-emission accents. No current callers; kept available
 *       for future simple-asset landmarks where the lit recipe would be
 *       unnecessary overhead.
 *
 *  Per-landmark divergence from these two recipes is a smell. If you find
 *  yourself adding "safety belts" (sRGB forcing, force-opaque overrides,
 *  custom emissive scaling), check the bake-side pipeline first: see
 *  `feedback_glb_export_pitfalls.md` in user memory for the 5 known
 *  silent-failure modes (packed_files stale, unwired texture drop, sRGB
 *  colorspace mismatch, dev-server 404 cache, bake light tints).
 */

// =============================================================================
// LIT RECIPE — used by Skills/Projects/Contact/About
// =============================================================================

/** Three-tier emission strategy (canonical):
 *   - authored emission → boosted 5× (hard, primary ≥ 0.4) or 2× (soft)
 *   - base-colour texture but no emission → texture piped through emissiveMap
 *     at 0.55 intensity so the bake survives even without scene lights
 *   - plain colour → flat self-emission at 45 % base
 *
 *  Calibrated to work with `Lighting.tsx`'s cumulative ~10× scene light +
 *  the dark (0.025–0.18) bake palette range. Brighter baked content washes
 *  to white; dimmer baked content reads as muddy.
 */
function buildEmissionConfig(src: THREE.MeshStandardMaterial): {
  emissive: THREE.Color;
  intensity: number;
  emissiveMap: THREE.Texture | null;
  isAuthoredEmission: boolean;
} {
  const srcEmissive = src.emissive ?? new THREE.Color(0, 0, 0);
  const emissionMagnitude = Math.max(
    srcEmissive.r,
    srcEmissive.g,
    srcEmissive.b
  );
  const hasAuthoredEmission = emissionMagnitude > 0.02;
  const hardEmissive = emissionMagnitude >= 0.4;
  const hasBaseTexture = !!src.map;

  if (hasAuthoredEmission) {
    return {
      emissive: srcEmissive.clone(),
      intensity: hardEmissive ? 5.0 : 2.0,
      emissiveMap: null,
      isAuthoredEmission: true,
    };
  }
  if (hasBaseTexture) {
    return {
      emissive: new THREE.Color(1, 1, 1),
      intensity: 0.55,
      emissiveMap: src.map,
      isAuthoredEmission: false,
    };
  }
  return {
    emissive: src.color.clone().multiplyScalar(0.45),
    intensity: 1.0,
    emissiveMap: null,
    isAuthoredEmission: false,
  };
}

/** Inject per-vertex random colour into a mesh's geometry. Used by About
 *  for its cartoon pagoda look — rocks get amplitude 0.30, foliage 0.20,
 *  default 0.12, emissive 0. Three.js multiplies the per-vertex colour
 *  with the material's base colour when `vertexColors = true`.
 *
 *  Deterministic: same seed → same colour. Stable across reloads.
 */
export function injectVertexNoise(
  geometry: THREE.BufferGeometry,
  amplitude: number,
  hueDrift: number,
  seedOffset: number
): void {
  const positions = geometry.getAttribute("position");
  if (!positions) return;
  const vertCount = positions.count;
  const colors = new Float32Array(vertCount * 3);
  for (let i = 0; i < vertCount; i++) {
    const seed = i + seedOffset;
    const v = (((Math.sin(seed * 12.9898) * 43758.5453) % 1) + 1) % 1;
    const h = (((Math.sin(seed * 7.5713) * 17439.123) % 1) + 1) % 1;
    const value = 1.0 + (v - 0.5) * 2.0 * amplitude;
    const drift = (h - 0.5) * 2.0 * hueDrift;
    colors[i * 3] = value + drift;
    colors[i * 3 + 1] = value;
    colors[i * 3 + 2] = value - drift;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/** Vertex-noise tuning per mesh family (used by About). */
export interface VertexNoiseConfig {
  /** Amplitude for meshes whose name contains rock/stone/boulder/ground. */
  rockAmp: number;
  /** Amplitude for meshes whose name contains foliage/bush/tuft. */
  foliageAmp: number;
  /** Amplitude for all other non-emissive meshes. */
  defaultAmp: number;
  /** Hue drift for rocks (warm-cool shift). */
  rockHue: number;
  /** Hue drift for foliage. */
  foliageHue: number;
}

export interface StandardLandmarkOptions {
  /** If set, inject per-vertex random colour for within-object granularity.
   *  Used by About for the cartoony pagoda look. Skills/Projects/Contact
   *  leave this off — their bakes already carry painted-edge variation. */
  vertexNoise?: VertexNoiseConfig;
  /** Cast + receive dynamic shadows. About uses this for its scene-grounded
   *  pagoda. Skills/Projects/Contact leave shadows off because the bake
   *  already encodes shadowing and the dynamic shadow camera doesn't cover
   *  the full archipelago. Defaults to false. */
  dynamicShadows?: boolean;
}

/** CANONICAL lit-recipe conversion. Apply to every Mesh in `root` after
 *  cloning the GLTF scene. Replaces the standard glTF `MeshStandardMaterial`
 *  with `MeshStandardNodeMaterial` (required by WebGPURenderer), preserves
 *  textures, and applies the three-tier emission strategy.
 */
export function applyStandardLandmarkMaterials(
  root: THREE.Group,
  options: StandardLandmarkOptions = {}
): void {
  const { vertexNoise, dynamicShadows = false } = options;
  let meshIndex = 0;

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return;
    const src = mesh.material as THREE.MeshStandardMaterial;
    if (!src) return;

    const { emissive, intensity, emissiveMap, isAuthoredEmission } =
      buildEmissionConfig(src);

    const nodeMat = new MeshStandardNodeMaterial({
      color: src.color.clone(),
      roughness: src.roughness,
      metalness: src.metalness,
      emissive,
      emissiveIntensity: intensity,
      transparent: src.transparent,
      opacity: src.opacity,
      side: src.side,
    });
    if (src.map) nodeMat.map = src.map;
    if (src.normalMap) {
      nodeMat.normalMap = src.normalMap;
      if (src.normalScale) nodeMat.normalScale = src.normalScale.clone();
    }
    if (src.roughnessMap) nodeMat.roughnessMap = src.roughnessMap;
    if (src.metalnessMap) nodeMat.metalnessMap = src.metalnessMap;
    if (src.aoMap) nodeMat.aoMap = src.aoMap;
    if (emissiveMap) nodeMat.emissiveMap = emissiveMap;
    else if (src.emissiveMap) nodeMat.emissiveMap = src.emissiveMap;

    if (vertexNoise && !isAuthoredEmission) {
      const isRock =
        mesh.name.includes("boulder") ||
        mesh.name.includes("rock") ||
        mesh.name.includes("stone") ||
        mesh.name.includes("ground");
      const isFoliage =
        mesh.name.includes("foliage") ||
        mesh.name.includes("bush") ||
        mesh.name.includes("tuft");
      const amp = isRock
        ? vertexNoise.rockAmp
        : isFoliage
        ? vertexNoise.foliageAmp
        : vertexNoise.defaultAmp;
      const hue = isRock
        ? vertexNoise.rockHue
        : isFoliage
        ? vertexNoise.foliageHue
        : 0.0;
      if (amp > 0) {
        injectVertexNoise(mesh.geometry, amp, hue, meshIndex * 31);
        nodeMat.vertexColors = true;
      }
    }
    meshIndex += 1;

    mesh.material = nodeMat;
    mesh.castShadow = dynamicShadows && !isAuthoredEmission;
    mesh.receiveShadow = dynamicShadows;
  });
}

// =============================================================================
// UNLIT RECIPE — used by Blog + Resume
// =============================================================================

/** CANONICAL unlit-recipe conversion. Replaces every `MeshStandardMaterial`
 *  with `MeshBasicNodeMaterial` — no runtime lighting interaction. The
 *  bake already encodes shading + soft shadows. Used by Blog and Resume
 *  (simpler stone-stele assets).
 */
export function applyUnlitLandmarkMaterials(root: THREE.Group): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return;
    const src = mesh.material as THREE.MeshStandardMaterial;
    if (!src) return;

    const nodeMat = new MeshBasicNodeMaterial();
    if (src.map) {
      nodeMat.map = src.map;
    } else {
      nodeMat.color = src.color?.clone() ?? new THREE.Color(0xffffff);
    }
    nodeMat.transparent = false;
    nodeMat.depthWrite = true;
    nodeMat.depthTest = true;
    nodeMat.side = THREE.DoubleSide;
    nodeMat.fog = false;
    mesh.material = nodeMat;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
}
