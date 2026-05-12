/** @format */

/**
 * Generate the Hall's Wakandan-dusk 3D LUT (1024×32 atlas).
 *
 * Designed to layer cleanly on top of the ACES-Filmic tonemap already
 * applied by `Hall/Postprocessing.tsx`. Goals:
 *
 *  - **Shadows** lift toward a deep navy-purple (`#0c0a1c`) — pushes the
 *    dark frame portions toward the dusk-sky base, away from the brown
 *    cast a neutral ACES gives on dark brass.
 *  - **Highlights** warm toward the horizon-band amber (`#f4c98a`) — the
 *    brightest specular hits on the brass take on the sunset glow.
 *  - **Midtone saturation +12 %** — punches the magenta/teal/cyan accent
 *    tints harder so each alcove's theme accent reads from a distance.
 *  - **Slight contrast lift** — gamma 0.92 in the mid-range so the
 *    overall image gets a touch more snap.
 *
 * Writes `public/luts/hall-wakandan.png`. PNG-RGB8, no third-party deps.
 *
 * Run: `node scripts/generate-lut-hall.mjs`
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const SIZE = 32;
const W = SIZE * SIZE;
const H = SIZE;

const hexToRgb = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
};

const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

const SHADOW_TINT = hexToRgb("#0c0a1c");       // deep navy-purple
const HIGHLIGHT_TINT = hexToRgb("#f4c98a");    // warm amber

function gradePixel(r, g, b) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;

  // 1. Shadow toward navy-purple — strongest at low luminance.
  const shadowMask = 1 - smoothstep(0, 0.45, lum);
  const sStrength = 0.22 * shadowMask;
  r = lerp(r, SHADOW_TINT[0], sStrength);
  g = lerp(g, SHADOW_TINT[1], sStrength);
  b = lerp(b, SHADOW_TINT[2], sStrength);

  // 2. Highlight toward warm amber — strongest at high luminance.
  const highlightMask = smoothstep(0.55, 1.0, lum);
  const hStrength = 0.18 * highlightMask;
  r = lerp(r, HIGHLIGHT_TINT[0], hStrength);
  g = lerp(g, HIGHLIGHT_TINT[1], hStrength);
  b = lerp(b, HIGHLIGHT_TINT[2], hStrength);

  // 3. Midtone saturation boost — peaks at lum=0.5.
  const midMask = 1 - Math.abs(lum - 0.5) * 2;
  const satScale = 1 + 0.12 * Math.max(0, midMask);
  const newLum = 0.299 * r + 0.587 * g + 0.114 * b;
  r = newLum + (r - newLum) * satScale;
  g = newLum + (g - newLum) * satScale;
  b = newLum + (b - newLum) * satScale;

  // 4. Gentle contrast — gamma 0.92 around mid grey to get snap.
  const contrast = (v) => Math.pow(v, 0.92);
  r = contrast(r);
  g = contrast(g);
  b = contrast(b);

  return [
    Math.max(0, Math.min(1, r)),
    Math.max(0, Math.min(1, g)),
    Math.max(0, Math.min(1, b)),
  ];
}

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
      const offset = (y * W + x) * 3;
      pixels[offset] = Math.round(r * 255);
      pixels[offset + 1] = Math.round(g * 255);
      pixels[offset + 2] = Math.round(b * 255);
    }
  }
}

// ---- minimal PNG encoder ----
function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;     // bit depth
ihdr[9] = 2;     // color type RGB
ihdr[10] = 0;    // compression
ihdr[11] = 0;    // filter
ihdr[12] = 0;    // interlace

// Add filter byte 0 per row.
const rows = Buffer.alloc(H * (W * 3 + 1));
for (let y = 0; y < H; y++) {
  rows[y * (W * 3 + 1)] = 0;
  pixels.copy(rows, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
}
const idat = zlib.deflateSync(rows, { level: 9 });

const outPath = path.resolve("public/luts/hall-wakandan.png");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(
  outPath,
  Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ])
);
console.log(`wrote ${path.relative(process.cwd(), outPath)} (${fs.statSync(outPath).size} bytes)`);
