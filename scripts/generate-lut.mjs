/** @format */

/**
 * Generate a 1024×32 LUT atlas (32 tiles × 32×32, blue varies across tiles)
 * implementing a warm-evening cinematic grade:
 *  - shadows lift toward warm #1a1208
 *  - midtone saturation +8%
 *  - highlights cool toward #fff0d8
 *
 * Writes public/luts/warm-evening.png as a PNG-RGB8 image. Pure Node — no
 * third-party deps; we hand-roll the PNG container (signature + IHDR + IDAT
 * + IEND with CRC32).
 *
 * Run: `node scripts/generate-lut.mjs`
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const SIZE = 32; // 32^3 LUT
const W = SIZE * SIZE; // 1024
const H = SIZE; // 32

// ---- color helpers ----
const hexToRgb = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
};

const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

const WARM_SHADOW = hexToRgb("#1a1208");
const COOL_HIGHLIGHT = hexToRgb("#fff0d8");

function gradePixel(r, g, b) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;

  // Shadow lift toward warm brown (peaks at lum=0).
  const shadowMask = 1 - smoothstep(0, 0.45, lum);
  const sStrength = 0.18 * shadowMask;
  r = lerp(r, WARM_SHADOW[0], sStrength);
  g = lerp(g, WARM_SHADOW[1], sStrength);
  b = lerp(b, WARM_SHADOW[2], sStrength);

  // Highlight cool/cream tint (peaks at lum=1).
  const highlightMask = smoothstep(0.6, 1.0, lum);
  const hStrength = 0.12 * highlightMask;
  r = lerp(r, COOL_HIGHLIGHT[0], hStrength);
  g = lerp(g, COOL_HIGHLIGHT[1], hStrength);
  b = lerp(b, COOL_HIGHLIGHT[2], hStrength);

  // Midtone saturation +8% — peaks at lum=0.5.
  const midMask = 1 - Math.abs(lum - 0.5) * 2; // tent: 1 at .5, 0 at edges
  const satScale = 1 + 0.08 * Math.max(0, midMask);
  const newLum = 0.299 * r + 0.587 * g + 0.114 * b;
  r = newLum + (r - newLum) * satScale;
  g = newLum + (g - newLum) * satScale;
  b = newLum + (b - newLum) * satScale;

  return [
    Math.max(0, Math.min(1, r)),
    Math.max(0, Math.min(1, g)),
    Math.max(0, Math.min(1, b)),
  ];
}

// ---- pixel buffer (RGB row-major) ----
const pixels = Buffer.alloc(W * H * 3);
for (let by = 0; by < SIZE; by++) {
  for (let tile = 0; tile < SIZE; tile++) {
    for (let bx = 0; bx < SIZE; bx++) {
      const r0 = bx / (SIZE - 1);
      const g0 = by / (SIZE - 1);
      const b0 = tile / (SIZE - 1);
      const [r, g, b] = gradePixel(r0, g0, b0);
      const x = tile * SIZE + bx;
      const y = by;
      const idx = (y * W + x) * 3;
      pixels[idx] = Math.round(r * 255);
      pixels[idx + 1] = Math.round(g * 255);
      pixels[idx + 2] = Math.round(b * 255);
    }
  }
}

// ---- PNG encoder ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr.writeUInt8(8, 8); // bit depth
ihdr.writeUInt8(2, 9); // color type RGB
ihdr.writeUInt8(0, 10); // compression
ihdr.writeUInt8(0, 11); // filter
ihdr.writeUInt8(0, 12); // interlace

// IDAT: each scanline is filter byte (0) + raw RGB bytes, then zlib-compressed.
const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 3)] = 0; // filter: None
  pixels.copy(raw, y * (1 + W * 3) + 1, y * W * 3, y * W * 3 + W * 3);
}
const idat = zlib.deflateSync(raw);

const png = Buffer.concat([
  signature,
  chunk("IHDR", ihdr),
  chunk("IDAT", idat),
  chunk("IEND", Buffer.alloc(0)),
]);

const outDir = path.join(process.cwd(), "public", "luts");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "warm-evening.png");
fs.writeFileSync(outPath, png);

console.log(`Wrote ${outPath} (${png.length} bytes, ${W}×${H})`);
