// Anonymous visitor identity, no login. The Worker issues a random id signed with
// an HMAC secret; the page keeps it in localStorage and sends it back in a header.
// (A cookie would be third-party here, since the site and the Worker are on
// different origins, and browsers increasingly block those.)

const enc = new TextEncoder();

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

async function sign(secret: string, payload: string): Promise<string> {
  return b64url(await crypto.subtle.sign("HMAC", await key(secret), enc.encode(payload)));
}

function sameBytes(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function issueVisitorToken(secret: string): Promise<{ id: string; token: string }> {
  const id = b64url(crypto.getRandomValues(new Uint8Array(16)));
  return { id, token: `${id}.${await sign(secret, id)}` };
}

// Returns the visitor id, or null if the token is missing, malformed or forged.
export async function verifyVisitorToken(secret: string, token: string | null): Promise<string | null> {
  if (!token || token.length > 128) return null;
  const [id, mac, extra] = token.split(".");
  if (!id || !mac || extra !== undefined || !/^[A-Za-z0-9_-]{16,32}$/.test(id)) return null;
  return sameBytes(mac, await sign(secret, id)) ? id : null;
}

// The IP is only ever stored as a hash salted with the UTC day, so yesterday's
// counters cannot be linked to today's and the raw address is never kept.
export async function hashIp(secret: string, ip: string, day: string): Promise<string> {
  return (await sign(secret, `ip|${day}|${ip}`)).slice(0, 22);
}
