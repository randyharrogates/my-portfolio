/** @format */

import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
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
  timerLocal,
  uv,
  vec2,
  vec3,
} from "three/tsl";

export type WaterFlowMode =
  | "vertical-down"
  | "horizontal-east"
  | "radial-out"
  | "static";

export interface StylizedWaterOptions {
  /** Direction the painted base scrolls. Sets the cartoon "flow." */
  flow: WaterFlowMode;
  /** Deep painted base. Darker cyan blue that reads as water mass. */
  deepColor?: THREE.Color;
  /** Shallow / highlight cyan. Lighter painted teal. */
  shallowColor?: THREE.Color;
  /** Foam / caustic highlight (near-white painted edge). */
  foamColor?: THREE.Color;
  /** How fast the painted base + caustic noise scrolls. Default 0.6. */
  scrollSpeed?: number;
  /** UV tile multiplier — bigger = smaller pattern. Default 1.0. */
  tile?: number;
  /** Paint a denser foam band at the bottom of the mesh (UV.v near 1) —
   *  used at waterfall impact, falls, basin rim. */
  splashAtBase?: boolean;
  /** Cartoon water is mostly opaque-painted; transparency is ONLY for the
   *  back layer of a multi-sheet waterfall (see backMesh). Default false. */
  backMesh?: boolean;
  /** Cartoon shaders don't use refractive transparency. Kept as a no-op
   *  hint so the call sites can express intent. Default false. */
  transparent?: boolean;
}

/** Genshin-style cartoon water shader. Single layer:
 *
 *    - UV-scrolling painted cyan base (deep ↔ shallow mix)
 *    - Soft caustic noise overlay
 *    - Painted foam edges via fresnel rim
 *    - Optional splash band at the bottom
 *
 *  Locked 2026-05-15 (replaces buildPhotorealWater). No normal map, no
 *  Gerstner displacement, no planar reflector, no Beckmann specular —
 *  Genshin water is a painted surface, not a photoreal refractive medium.
 */
export function buildStylizedWater(
  opts: StylizedWaterOptions,
): MeshBasicNodeMaterial {
  const {
    flow,
    deepColor = new THREE.Color(0.08, 0.34, 0.46),
    shallowColor = new THREE.Color(0.42, 0.78, 0.88),
    foamColor = new THREE.Color(0.96, 0.99, 1.0),
    scrollSpeed = 0.6,
    tile = 1.0,
    splashAtBase = false,
    backMesh = false,
  } = opts;

  const mat = new MeshBasicNodeMaterial({
    color: new THREE.Color(0xffffff),
    side: THREE.DoubleSide,
    transparent: backMesh,
    depthWrite: !backMesh,
  });

  const t = timerLocal();
  const baseUv = uv();

  // === Scroll direction varies by flow mode ===
  let uvA = vec2(baseUv.x.mul(tile), baseUv.y.mul(tile));
  let uvB = vec2(baseUv.x.mul(tile * 1.7), baseUv.y.mul(tile * 1.7));
  switch (flow) {
    case "vertical-down": {
      const v1 = baseUv.y.mul(tile * 2.0).add(t.mul(0.9 * scrollSpeed));
      const v2 = baseUv.y.mul(tile * 3.5).add(t.mul(1.4 * scrollSpeed));
      const u1 = baseUv.x.mul(tile * 1.5).add(t.mul(0.1 * scrollSpeed));
      const u2 = baseUv.x.mul(tile * 2.6).sub(t.mul(0.08 * scrollSpeed));
      uvA = vec2(u1, v1);
      uvB = vec2(u2, v2);
      break;
    }
    case "horizontal-east": {
      const u1 = baseUv.x.mul(tile * 2.0).add(t.mul(0.5 * scrollSpeed));
      const u2 = baseUv.x.mul(tile * 3.6).add(t.mul(0.8 * scrollSpeed));
      const v1 = baseUv.y.mul(tile * 1.0);
      const v2 = baseUv.y.mul(tile * 1.8);
      uvA = vec2(u1, v1);
      uvB = vec2(u2, v2);
      break;
    }
    case "radial-out": {
      const cu = baseUv.x.sub(0.5);
      const cv = baseUv.y.sub(0.5);
      const u1 = cu.mul(tile * 2.0).add(t.mul(0.25 * scrollSpeed));
      const u2 = cu.mul(tile * 4.0).sub(t.mul(0.35 * scrollSpeed));
      const v1 = cv.mul(tile * 2.0).add(t.mul(0.25 * scrollSpeed));
      const v2 = cv.mul(tile * 4.0).sub(t.mul(0.35 * scrollSpeed));
      uvA = vec2(u1, v1);
      uvB = vec2(u2, v2);
      break;
    }
    case "static": {
      uvA = vec2(baseUv.x.mul(tile), baseUv.y.mul(tile));
      uvB = vec2(baseUv.x.mul(tile * 1.9), baseUv.y.mul(tile * 1.9));
      break;
    }
  }

  // === Two-octave painted caustic noise — soft, low-frequency, cartoon ===
  // sin/cos product gives blob-shaped highlights that drift with the scroll.
  // No high-frequency normal-map sampling — that's a photoreal cue.
  const causticA = sin(uvA.x.mul(Math.PI * 2.2)).mul(
    cos(uvA.y.mul(Math.PI * 1.8)),
  );
  const causticB = sin(uvB.x.mul(Math.PI * 1.6)).mul(
    cos(uvB.y.mul(Math.PI * 2.4)),
  );
  // @ts-expect-error - TSL arithmetic
  const causticRaw = causticA.mul(0.55).add(causticB.mul(0.45));
  // Remap to [0, 1] and soften — painted highlights, not photoreal foam.
  // @ts-expect-error
  const caustic = causticRaw.mul(0.5).add(0.5);
  // @ts-expect-error - smoothstep widens the painted bright band
  const causticBand = smoothstep(float(0.42), float(0.85), caustic);

  // === Body colour — painted deep ↔ shallow blend driven by caustic noise ===
  // @ts-expect-error - TSL vec3 from THREE.Color
  const deep = vec3(deepColor.r, deepColor.g, deepColor.b);
  // @ts-expect-error
  const shallow = vec3(shallowColor.r, shallowColor.g, shallowColor.b);
  // @ts-expect-error
  const foam = vec3(foamColor.r, foamColor.g, foamColor.b);

  // @ts-expect-error - TSL mix
  let color = mix(deep, shallow, caustic.mul(0.7).add(0.15));
  // @ts-expect-error - painted caustic highlight overlay
  color = mix(color, foam, causticBand.mul(0.35));

  // === Fresnel rim — cartoon water reads brighter at glancing angles ===
  const cosTheta = abs(normalView.dot(positionViewDirection));
  const fresnel = pow(oneMinus(cosTheta), float(2.2));
  // @ts-expect-error - painted foam pop at silhouette
  color = mix(color, foam, fresnel.mul(0.4));

  // === Splash / impact band — denser painted foam near UV.v == 1 ===
  if (splashAtBase) {
    // @ts-expect-error
    const splash = smoothstep(float(0.62), float(0.96), baseUv.y);
    const splashWobble = sin(baseUv.x.mul(14.0).add(t.mul(2.0)))
      .mul(0.5)
      .add(0.5);
    // @ts-expect-error
    const splashMask = splash.mul(splashWobble.mul(0.5).add(0.5));
    // @ts-expect-error - painted foam band overlay
    color = mix(color, foam, splashMask.mul(0.6));
  }

  mat.colorNode = color;

  if (backMesh) {
    // Back layer of a multi-sheet waterfall — pin to a low constant alpha
    // so the front sheet reads in front. Cartoon-water doesn't paint
    // depth-aware translucency past this.
    mat.opacityNode = float(0.55);
  }

  return mat;
}

export interface StylizedFoamOptions {
  /** How fast the painted foam breakup pulses. Default 0.5. */
  scrollSpeed?: number;
  /** Pulse amplitude — 0..1. Default 0.3. */
  pulseAmplitude?: number;
  /** White-painted brightness multiplier. Default 1.2. */
  brightness?: number;
}

/** Painted foam-edge decal for the water-meets-bank seam. Genshin-style:
 *  soft white pulse along the strip axis, alpha falloff at strip edges.
 *  Used by `*_foam` meshes in `connections.glb`. */
export function buildStylizedFoam(
  opts: StylizedFoamOptions = {},
): MeshBasicNodeMaterial {
  const { scrollSpeed = 0.5, pulseAmplitude = 0.3, brightness = 1.2 } = opts;

  const mat = new MeshBasicNodeMaterial({
    color: new THREE.Color(1.0, 1.0, 1.0),
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const t = timerLocal();
  const baseUv = uv();

  // Painted pulse along strip length (UV.x)
  const pulse = sin(baseUv.x.mul(8.0).add(t.mul(scrollSpeed * 2.0))).mul(
    cos(baseUv.x.mul(3.0).sub(t.mul(scrollSpeed * 1.2))),
  );
  // @ts-expect-error
  const norm = pulse.mul(0.5).add(0.5);
  // @ts-expect-error
  const intensity = float(1.0 - pulseAmplitude).add(
    norm.mul(pulseAmplitude * 1.1),
  );

  // Tint slightly toward cool white (less synthetic than pure RGB 1,1,1)
  // @ts-expect-error
  const baseCol = vec3(0.94, 1.0, 1.04);
  // @ts-expect-error
  const col = baseCol.mul(intensity).mul(brightness);
  mat.colorNode = col;

  // Alpha: bright in strip middle (V=0.5), fades at edges. Plus break-up
  // along strip length so the rim isn't continuous.
  // @ts-expect-error
  const centerness = float(1.0).sub(baseUv.y.sub(0.5).abs().mul(2.0));
  // @ts-expect-error
  const softness = pow(centerness, float(1.6));
  const breakup = sin(baseUv.x.mul(20.0).add(t.mul(scrollSpeed * 0.8)))
    .mul(0.5)
    .add(0.5);
  // @ts-expect-error
  const alpha = softness.mul(breakup.mul(0.5).add(0.5)).mul(0.85);
  mat.opacityNode = alpha;

  return mat;
}
