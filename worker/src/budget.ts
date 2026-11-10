// The hard spend limit. Pure state machine: the Durable Object owns one copy of
// this state and is the only writer, so two runs cannot both slip under the cap.
//
// Every model call first RESERVES its worst-case cost. The reservation counts
// against the caps until it is SETTLED with the usage the API actually reported.
// All amounts are integer micro-dollars (1 USD = 1,000,000).

export interface BudgetConfig {
  monthlyMicro: number;
  dailyMicro: number;
}

export interface BudgetState {
  month: string; // "2026-11" (UTC)
  day: string; // "2026-11-10" (UTC)
  monthSpent: number;
  daySpent: number;
  reserved: Record<string, { amount: number; at: number }>;
  seq: number;
}

// A reservation that is never settled (the Worker died mid-call) is counted as
// fully spent after this long, so a crash can only make the budget stricter.
const STALE_MS = 5 * 60_000;

export const monthOf = (now: number) => new Date(now).toISOString().slice(0, 7);
export const dayOf = (now: number) => new Date(now).toISOString().slice(0, 10);

export function emptyBudget(now: number): BudgetState {
  return { month: monthOf(now), day: dayOf(now), monthSpent: 0, daySpent: 0, reserved: {}, seq: 0 };
}

function roll(s: BudgetState, now: number): void {
  for (const [id, r] of Object.entries(s.reserved)) {
    if (now - r.at > STALE_MS) {
      s.monthSpent += r.amount;
      s.daySpent += r.amount;
      delete s.reserved[id];
    }
  }
  if (s.month !== monthOf(now)) {
    s.month = monthOf(now);
    s.monthSpent = 0;
  }
  if (s.day !== dayOf(now)) {
    s.day = dayOf(now);
    s.daySpent = 0;
  }
}

const held = (s: BudgetState) => Object.values(s.reserved).reduce((n, r) => n + r.amount, 0);

export type Reserve = { ok: true; id: string } | { ok: false; reason: "monthly" | "daily" };

export function reserve(s: BudgetState, cfg: BudgetConfig, amount: number, now: number): Reserve {
  roll(s, now);
  const want = Math.max(0, Math.ceil(amount));
  const pending = held(s);
  if (s.monthSpent + pending + want > cfg.monthlyMicro) return { ok: false, reason: "monthly" };
  if (s.daySpent + pending + want > cfg.dailyMicro) return { ok: false, reason: "daily" };
  const id = `r${++s.seq}`;
  s.reserved[id] = { amount: want, at: now };
  return { ok: true, id };
}

// Replaces a reservation with what was actually spent. Unknown ids are ignored
// (already settled, or expired and counted in full).
export function settle(s: BudgetState, id: string, actual: number, now: number): void {
  roll(s, now);
  if (!s.reserved[id]) return;
  delete s.reserved[id];
  const spent = Math.max(0, Math.ceil(actual));
  s.monthSpent += spent;
  s.daySpent += spent;
}

export function remaining(s: BudgetState, cfg: BudgetConfig, now: number) {
  roll(s, now);
  const pending = held(s);
  return {
    month: Math.max(0, cfg.monthlyMicro - s.monthSpent - pending),
    day: Math.max(0, cfg.dailyMicro - s.daySpent - pending),
  };
}
