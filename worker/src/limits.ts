// Per-visitor limits, also owned by the Durable Object. A visitor is counted
// under every key they present (signed visitor id AND hashed IP), so clearing
// one does not reset the other.

import { dayOf } from "./budget.ts";

export interface LimitConfig {
  runsPerDay: number;
  burstMs: number; // minimum gap between run starts for one key
  inflightMs: number; // a run that never reports back stops blocking after this
}

export interface LimitState {
  day: string;
  runs: Record<string, number>;
  inflight: Record<string, number>;
  lastStart: Record<string, number>;
}

export const emptyLimits = (now: number): LimitState => ({ day: dayOf(now), runs: {}, inflight: {}, lastStart: {} });

export type Begin =
  | { ok: true; runsLeft: number }
  | { ok: false; reason: "daily" | "busy" | "burst"; retryAfterSec: number };

function roll(s: LimitState, cfg: LimitConfig, now: number): void {
  if (s.day !== dayOf(now)) {
    s.day = dayOf(now);
    s.runs = {};
  }
  for (const [k, at] of Object.entries(s.inflight)) if (now - at > cfg.inflightMs) delete s.inflight[k];
  for (const [k, at] of Object.entries(s.lastStart)) if (now - at > cfg.burstMs) delete s.lastStart[k];
}

const secondsToMidnightUtc = (now: number) => Math.ceil((Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate() + 1) - now) / 1000);

// Checks every key before changing anything, so a refused run costs the visitor nothing.
export function begin(s: LimitState, cfg: LimitConfig, keys: string[], now: number): Begin {
  roll(s, cfg, now);
  for (const k of keys) {
    const last = s.lastStart[k];
    if (last !== undefined) return { ok: false, reason: "burst", retryAfterSec: Math.ceil((cfg.burstMs - (now - last)) / 1000) };
  }
  for (const k of keys) if (s.inflight[k] !== undefined) return { ok: false, reason: "busy", retryAfterSec: 5 };
  for (const k of keys)
    if ((s.runs[k] ?? 0) >= cfg.runsPerDay) return { ok: false, reason: "daily", retryAfterSec: secondsToMidnightUtc(now) };
  let most = 0;
  for (const k of keys) {
    s.runs[k] = (s.runs[k] ?? 0) + 1;
    s.inflight[k] = now;
    s.lastStart[k] = now;
    most = Math.max(most, s.runs[k]);
  }
  return { ok: true, runsLeft: cfg.runsPerDay - most };
}

export function end(s: LimitState, keys: string[]): void {
  for (const k of keys) delete s.inflight[k];
}
