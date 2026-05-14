/** @format */

import * as THREE from "three";
import { MeshStandardNodeMaterial } from "three/webgpu";
import {
  abs,
  cos,
  float,
  mix,
  normalView,
  oneMinus,
  positionViewDirection,
  pow,
  sin,
  smoothstep,
  texture,
  timerLocal,
  uv,
  vec2,
  vec3,
} from "three/tsl";

export type WaterFlowMode = "vertical-down" | "horizontal-east" | "radial-out" | "static";

export interface PhotorealWaterOptions {
  /** Tangent-space normal map sampled at multiple scales/scrolls. */
  normalMap: THREE.Texture;
  /** Direction of flow (drives how the normal map UVs scroll over time). */
  flow: WaterFlowMode;
  /** Body shade — deep blue. Default {0.06, 0.22, 0.55}. */
  deepColor?: THREE.Color;
  /** Mid-stream lit water shade. Default {0.30, 0.72, 1.0}. */
  midColor?: THREE.Color;
  /** Bright highlight / foam shade. Default {0.95, 1.06, 1.12}. */
  foamColor?: THREE.Color;
  /** Surface roughness for spec calculations. Default 0.06 (mirror-like). */
  roughness?: number;
  /** Emission strength multiplier (baseline visibility in dim scenes). Default 0.55. */
  emissionStrength?: number;
  /** UV tiling for the normal map. Default 1.5 — higher = more ripple detail. */
  tile?: number;
  /** Scroll speed multiplier. Default 1.0. */
  scrollSpeed?: number;
  /** If true, add foam near the BOTTOM of UV V (for waterfall splash zones). */
  splashAtBase?: boolean;
}

/** Build a unified photoreal water TSL material.
 *
 *  Samples a baked water normal map (from BlenderKit's Cycles "Animated
 *  water" / "Procedural Water Surface" materials) at multiple scales +
 *  scrolling offsets. The normal map provides real photographic water
 *  surface detail; per-surface parameters drive flow direction, body
 *  colour, and foam masks.
 *
 *  Same material is reused for: source pool, flow ribbon, waterfall
 *  sheet, landing pool — one source of truth per the locked plan
 *  (CLAUDE.md, 2026-05-14).
 *
 *  Per CLAUDE.md `feedback_hall_water_tech.md` stack components:
 *   - Multi-layered scrolling normal maps (now real photographic ones)
 *   - Foam mask at edges + splash zones
 *   - Fresnel rim brightening
 *   - Beckmann-style specular along streaks
 *   - Depth-based opacity
 */
export function buildPhotorealWater(opts: PhotorealWaterOptions): MeshStandardNodeMaterial {
  const {
    normalMap,
    flow,
    deepColor = new THREE.Color(0.06, 0.22, 0.55),
    midColor = new THREE.Color(0.30, 0.72, 1.0),
    foamColor = new THREE.Color(0.95, 1.06, 1.12),
    roughness = 0.06,
    emissionStrength = 0.55,
    tile = 1.5,
    scrollSpeed = 1.0,
    splashAtBase = false,
  } = opts;

  // Set repeat wrapping so we can tile + scroll the normal map freely
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.needsUpdate = true;

  const mat = new MeshStandardNodeMaterial({
    color: new THREE.Color(0xffffff),
    roughness,
    metalness: 0.0,
    side: THREE.DoubleSide,
    transparent: flow === "vertical-down", // waterfall transparent; pools/flow opaque
  });

  const t = timerLocal();
  const baseUv = uv();

  // === Build two scroll-offset UVs sampling the normal map at different scales ===
  // Two octaves give the "real water surface" look — large slabs + finer ripples.
  let uv1 = vec2(baseUv.x, baseUv.y);
  let uv2 = vec2(baseUv.x, baseUv.y);
  switch (flow) {
    case "vertical-down": {
      // Waterfall — UV V scrolls fast downward, U slow lateral drift
      const v1 = baseUv.y.mul(tile * 2.0).add(t.mul(0.9 * scrollSpeed));
      const v2 = baseUv.y.mul(tile * 5.5).add(t.mul(1.6 * scrollSpeed));
      const u1 = baseUv.x.mul(tile * 1.8).add(t.mul(0.15 * scrollSpeed));
      const u2 = baseUv.x.mul(tile * 4.0).sub(t.mul(0.1 * scrollSpeed));
      uv1 = vec2(u1, v1);
      uv2 = vec2(u2, v2);
      break;
    }
    case "horizontal-east": {
      // Flow ribbon — U scrolls along flow direction
      const u1 = baseUv.x.mul(tile * 3.0).add(t.mul(0.5 * scrollSpeed));
      const u2 = baseUv.x.mul(tile * 7.0).add(t.mul(0.8 * scrollSpeed));
      const v1 = baseUv.y.mul(tile * 1.2);
      const v2 = baseUv.y.mul(tile * 3.0);
      uv1 = vec2(u1, v1);
      uv2 = vec2(u2, v2);
      break;
    }
    case "radial-out": {
      // Pool — concentric ripples from centre
      const cu = baseUv.x.sub(0.5);
      const cv = baseUv.y.sub(0.5);
      const u1 = cu.mul(tile * 3.0).add(t.mul(0.3 * scrollSpeed));
      const u2 = cu.mul(tile * 7.0).sub(t.mul(0.5 * scrollSpeed));
      const v1 = cv.mul(tile * 3.0).add(t.mul(0.3 * scrollSpeed));
      const v2 = cv.mul(tile * 7.0).sub(t.mul(0.5 * scrollSpeed));
      uv1 = vec2(u1, v1);
      uv2 = vec2(u2, v2);
      break;
    }
    case "static": {
      uv1 = vec2(baseUv.x.mul(tile), baseUv.y.mul(tile));
      uv2 = vec2(baseUv.x.mul(tile * 3.0), baseUv.y.mul(tile * 3.0));
      break;
    }
  }

  // Sample normal map at both UVs and blend — gives multi-scale surface detail
  // (used for PBR lighting via mat.normalMap below; not for color directly).
  const n1 = texture(normalMap, uv1);
  const n2 = texture(normalMap, uv2);

  // Compute a "wave intensity" feature from the XY components of the normal
  // (tangent-space normal X/Y deviate from 0.5 when the surface tilts).
  // This is the actual variation we want to drive color with — not Z.
  // distance from (0.5, 0.5) ranges ~0..0.3 for real water normals.
  // @ts-expect-error - TSL arithmetic
  const dev1 = n1.x.sub(0.5).mul(2.0).abs().add(n1.y.sub(0.5).mul(2.0).abs()).mul(0.5);
  // @ts-expect-error
  const dev2 = n2.x.sub(0.5).mul(2.0).abs().add(n2.y.sub(0.5).mul(2.0).abs()).mul(0.5);
  // @ts-expect-error
  const waveIntensity = dev1.mul(0.5).add(dev2.mul(0.5));

  // Procedural mid-freq variation that follows the flow — gives the body
  // visible motion even where the normal map is flat. Pure sin pattern,
  // driven by the same UVs we already computed.
  let bodyNoise = sin(uv1.x.mul(Math.PI * 2)).mul(cos(uv1.y.mul(Math.PI * 2)));
  // @ts-expect-error
  bodyNoise = bodyNoise.mul(0.5).add(0.5);  // → 0..1

  // === Fresnel — silhouette brightening (cheap reflection approximation) ===
  const cosTheta = abs(normalView.dot(positionViewDirection));
  const fresnel = pow(oneMinus(cosTheta), float(2.0));

  // === Beckmann-style spec along high-deviation areas ===
  const beckmann = pow(fresnel.mul(waveIntensity.mul(4.0)), float(1.5));

  // === Foam at silhouette + (optionally) at splash zone ===
  let foamMask = fresnel.mul(0.3);
  if (splashAtBase) {
    const splash = smoothstep(float(0.72), float(0.94), baseUv.y);
    const splashTurb = sin(baseUv.x.mul(20).add(t.mul(2.0))).mul(0.5).add(0.5);
    // @ts-expect-error
    foamMask = foamMask.add(splash.mul(splashTurb.mul(0.5).add(0.5)));
  }
  // Add foam where waves crest (high waveIntensity AND surface noise peaks)
  // @ts-expect-error
  foamMask = foamMask.add(waveIntensity.mul(bodyNoise).mul(3.0));

  // === Color composition ===
  // Body: deep → mid blue by procedural noise (not normal Z which is ~1.0)
  // @ts-expect-error - vec3 from THREE.Color
  const deep = vec3(deepColor.r, deepColor.g, deepColor.b);
  // @ts-expect-error
  const mid = vec3(midColor.r, midColor.g, midColor.b);
  // @ts-expect-error
  const foam = vec3(foamColor.r, foamColor.g, foamColor.b);
  // @ts-expect-error
  let color = mix(deep, mid, bodyNoise.mul(0.6).add(0.2));
  // @ts-expect-error
  color = mix(color, foam, foamMask.mul(0.55));
  // @ts-expect-error
  color = mix(color, foam, beckmann.mul(0.55));

  mat.colorNode = color;
  // @ts-expect-error
  mat.emissiveNode = color.mul(emissionStrength);

  // Apply the actual normal map for proper PBR shading
  mat.normalMap = normalMap;
  mat.normalScale = new THREE.Vector2(1.5, 1.5);

  // Opacity for waterfall (semi-transparent body + dense base)
  if (flow === "vertical-down") {
    const depthOpacity = smoothstep(float(0.0), float(0.6), baseUv.y);
    // @ts-expect-error
    mat.opacityNode = mix(float(0.42), float(0.92), depthOpacity);
    mat.depthWrite = true;
  }

  return mat;
}
