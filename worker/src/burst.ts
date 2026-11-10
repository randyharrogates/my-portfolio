// A burst limit held in this Worker instance's memory: `limit` requests per `windowMs`
// per key. Cloudflare's rate-limit binding is approximate by design, and so is this:
// each instance keeps its own counts, and Cloudflare runs several. Measured live, a
// flood of 400 requests in about five seconds had 98 refused; 80 were all served.
// So both layers only blunt a flood. Nothing that costs money relies on them: runs and
// questions are counted, spaced and budgeted in the Ledger, which is exact.

const MAX_KEYS = 5000;

export class Burst {
  private hits = new Map<string, number[]>();
  private limit: number;
  private windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  allow(key: string, now: number): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    const ok = recent.length < this.limit;
    if (ok) recent.push(now);
    // Re-inserting moves the key to the end, so the first key is always the one idle longest.
    this.hits.delete(key);
    this.hits.set(key, recent);
    if (this.hits.size > MAX_KEYS) this.hits.delete(this.hits.keys().next().value as string);
    return ok;
  }
}
