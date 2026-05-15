/** @format */

import * as THREE from "three";

/** Skybox.tsx ZENITH / HORIZON / GROUND / CLOUD colours — kept in sync
 *  by hand. Update both files together.
 *  Locked 2026-05-15 (Genshin Sumeru cyan-magic-night palette). */
const ZENITH = new THREE.Color("#1c2b5e");
const HORIZON = new THREE.Color("#46c8d8");
const GROUND = new THREE.Color("#3a2d44");
const CLOUD_TINT = new THREE.Color("#9fe6f0");
const HORIZON_BAND = 0.18;

/** Multiplier applied to the envMap colours on bake. The visible skybox
 *  stays at the painted values; the envMap is pumped hotter so it
 *  delivers a stronger IBL contribution to painted surfaces. */
const ENV_BOOST = 1.8;

function smoothstep01(edge0: number, edge1: number, x: number): number {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

/** Sample the procedural skybox at a given world-space normalised
 *  direction. Mirrors the TSL gradient + painted-cloud logic in
 *  `Skybox.tsx`. */
function sampleSky(dir: THREE.Vector3, out: THREE.Color): void {
  const y = dir.y;

  // 3-stop gradient
  const tSky = Math.pow(smoothstep01(0.0, HORIZON_BAND, y), 0.55);
  const skyCol = HORIZON.clone().lerp(ZENITH, tSky);
  const tGround = smoothstep01(0.0, 0.45, -y);
  const groundCol = HORIZON.clone().lerp(GROUND, tGround);
  const horizonBlend = smoothstep01(-0.02, 0.02, y);
  const base = groundCol.clone().lerp(skyCol, horizonBlend);

  // Painted cloud noise (mirrors Skybox.tsx)
  const cloudBand = smoothstep01(0.05, 0.55, y);
  const noise1 = Math.sin(dir.x * 3.6) * Math.cos(dir.z * 2.8);
  const noise2 = Math.sin(dir.x * 7.2 + 1.1) * Math.cos(dir.z * 5.5 - 0.4);
  const cloudNoise = noise1 * 0.55 + noise2 * 0.45;
  const cloudMask = smoothstep01(0.25, 0.65, cloudNoise * 0.5 + 0.5) *
    cloudBand;

  out.copy(base).lerp(CLOUD_TINT, cloudMask * 0.55);
}

function buildFace(size: number, face: 0 | 1 | 2 | 3 | 4 | 5): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const img = ctx.createImageData(size, size);
  const dir = new THREE.Vector3();
  const col = new THREE.Color();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / (size - 1)) * 2.0 - 1.0;
      const v = (y / (size - 1)) * 2.0 - 1.0;
      switch (face) {
        case 0: dir.set(1, -v, -u); break;  // px
        case 1: dir.set(-1, -v, u); break;  // nx
        case 2: dir.set(u, 1, v); break;    // py
        case 3: dir.set(u, -1, -v); break;  // ny
        case 4: dir.set(u, -v, 1); break;   // pz
        case 5: dir.set(-u, -v, -1); break; // nz
      }
      dir.normalize();
      sampleSky(dir, col);
      const i = (y * size + x) * 4;
      img.data[i + 0] = Math.min(255, Math.round(col.r * 255 * ENV_BOOST));
      img.data[i + 1] = Math.min(255, Math.round(col.g * 255 * ENV_BOOST));
      img.data[i + 2] = Math.min(255, Math.round(col.b * 255 * ENV_BOOST));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

let cached: THREE.CubeTexture | null = null;
export function buildSkyEnvCubeMap(size: number = 64): THREE.CubeTexture {
  if (cached) return cached;
  const faces = [
    buildFace(size, 0),
    buildFace(size, 1),
    buildFace(size, 2),
    buildFace(size, 3),
    buildFace(size, 4),
    buildFace(size, 5),
  ];
  const cube = new THREE.CubeTexture(faces);
  cube.colorSpace = THREE.SRGBColorSpace;
  cube.mapping = THREE.CubeReflectionMapping;
  cube.minFilter = THREE.LinearMipmapLinearFilter;
  cube.magFilter = THREE.LinearFilter;
  cube.generateMipmaps = true;
  cube.needsUpdate = true;
  cached = cube;
  return cube;
}
