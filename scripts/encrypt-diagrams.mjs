#!/usr/bin/env node
/**
 * Encrypt the gated SVG diagrams in /secrets/ into src/data/encrypted-diagrams.json.
 *
 * Reads PORTFOLIO_DIAGRAM_PASSWORD from the environment. Run:
 *
 *   PORTFOLIO_DIAGRAM_PASSWORD='your-strong-key' node scripts/encrypt-diagrams.mjs
 *
 * Output is committed; plaintext stays local (gitignored). Rotate the password by
 * re-running with a new value and redeploying.
 *
 * Crypto: PBKDF2-SHA256 (600k iterations) → AES-256-GCM. Random salt + IV per entry.
 * The browser decrypts via the same parameters using SubtleCrypto.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, pbkdf2Sync, createCipheriv } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const ENTRIES = [
  { id: "kyb", source: "secrets/kyb-svg.html" },
  { id: "credit-memo", source: "secrets/credit-memo-svg.html" },
];

const PBKDF2_ITERATIONS = 600_000;
const KEY_LENGTH_BYTES = 32; // AES-256
const SALT_LENGTH_BYTES = 16;
const IV_LENGTH_BYTES = 12; // GCM standard
const TAG_LENGTH_BYTES = 16;

function b64(buf) {
  return Buffer.from(buf).toString("base64");
}

function encryptOne(plaintext, password) {
  const salt = randomBytes(SALT_LENGTH_BYTES);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const key = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH_BYTES, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Browser SubtleCrypto AES-GCM expects (ciphertext || tag) concatenated.
  const combined = Buffer.concat([ciphertext, tag]);
  return {
    salt: b64(salt),
    iv: b64(iv),
    ciphertext: b64(combined),
  };
}

function main() {
  const password = process.env.PORTFOLIO_DIAGRAM_PASSWORD;
  if (!password || password.length < 8) {
    console.error(
      "Set PORTFOLIO_DIAGRAM_PASSWORD (>= 8 chars) before running. Example:\n" +
        "  PORTFOLIO_DIAGRAM_PASSWORD='your-strong-key' node scripts/encrypt-diagrams.mjs"
    );
    process.exit(1);
  }

  const out = {
    pbkdf2: { iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    cipher: "AES-GCM",
    keyLengthBits: KEY_LENGTH_BYTES * 8,
    tagLengthBits: TAG_LENGTH_BYTES * 8,
    diagrams: {},
  };

  for (const entry of ENTRIES) {
    const sourcePath = resolve(ROOT, entry.source);
    if (!existsSync(sourcePath)) {
      console.error(`Missing plaintext: ${entry.source}`);
      console.error(`  Restore the file or remove the entry from scripts/encrypt-diagrams.mjs`);
      process.exit(1);
    }
    const plaintext = readFileSync(sourcePath, "utf8");
    out.diagrams[entry.id] = encryptOne(plaintext, password);
    console.log(`encrypted ${entry.id} (${plaintext.length} chars plaintext)`);
  }

  const outPath = resolve(ROOT, "src/data/encrypted-diagrams.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`wrote ${outPath}`);
}

main();
