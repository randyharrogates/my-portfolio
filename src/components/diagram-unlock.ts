/** @format */

import payload from "../data/encrypted-diagrams.json";

export type DiagramId = "kyb" | "credit-memo";

interface EncryptedEntry {
  salt: string;
  iv: string;
  ciphertext: string;
}

interface Payload {
  pbkdf2: { iterations: number; hash: string };
  cipher: string;
  keyLengthBits: number;
  tagLengthBits: number;
  diagrams: Record<string, EncryptedEntry>;
}

const PAYLOAD = payload as Payload;

// Module-level cache: persists across page navigations within a session,
// resets on full reload (matches user's "per-session only" preference).
const decryptedCache = new Map<DiagramId, string>();
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((cb) => cb());
}

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PAYLOAD.pbkdf2.iterations,
      hash: PAYLOAD.pbkdf2.hash,
    },
    baseKey,
    { name: "AES-GCM", length: PAYLOAD.keyLengthBits },
    false,
    ["decrypt"]
  );
}

async function decryptEntry(entry: EncryptedEntry, password: string): Promise<string> {
  const salt = b64ToBytes(entry.salt);
  const iv = b64ToBytes(entry.iv);
  const ciphertext = b64ToBytes(entry.ciphertext);
  const key = await deriveKey(password, salt);
  const plaintextBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource, tagLength: PAYLOAD.tagLengthBits },
    key,
    ciphertext as BufferSource
  );
  return new TextDecoder().decode(plaintextBuf);
}

/**
 * Try to unlock all gated diagrams with a single password.
 * Returns true if the password decrypts at least one entry. On success, every
 * diagram that decrypted with this password is cached and immediately available
 * to all subscribers.
 *
 * GCM tag verification means a wrong password throws — we catch it and report
 * failure without leaking which entries it was tested against.
 */
export async function tryUnlockAll(password: string): Promise<boolean> {
  let anySuccess = false;
  for (const [id, entry] of Object.entries(PAYLOAD.diagrams)) {
    if (decryptedCache.has(id as DiagramId)) {
      anySuccess = true;
      continue;
    }
    try {
      const plaintext = await decryptEntry(entry, password);
      decryptedCache.set(id as DiagramId, plaintext);
      anySuccess = true;
    } catch {
      // wrong password for this entry — keep going (or fail, same effect)
    }
  }
  if (anySuccess) notify();
  return anySuccess;
}

export function getDecrypted(id: DiagramId): string | undefined {
  return decryptedCache.get(id);
}

export function isUnlocked(id: DiagramId): boolean {
  return decryptedCache.has(id);
}

export function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}
