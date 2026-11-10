import { DurableObject } from "cloudflare:workers";
import { emptyBudget, remaining, reserve, settle } from "./budget.ts";
import type { BudgetConfig, BudgetState } from "./budget.ts";
import { begin, emptyLimits, end } from "./limits.ts";
import type { Begin, LimitConfig, LimitState } from "./limits.ts";

export interface LedgerEnv {
  MONTHLY_BUDGET_USD: string;
  DAILY_BUDGET_USD: string;
  RUNS_PER_DAY: string;
  QUESTIONS_PER_DAY: string;
}

// Runs and follow-up questions are limited separately: their own counters, their
// own pacing, and their own stored state, so starting one never clears the other's.
export type Kind = "run" | "question";
const KINDS: Record<Kind, { perDay: keyof LedgerEnv; burstMs: number; inflightMs: number }> = {
  run: { perDay: "RUNS_PER_DAY", burstMs: 10_000, inflightMs: 120_000 },
  question: { perDay: "QUESTIONS_PER_DAY", burstMs: 5_000, inflightMs: 60_000 },
};

// One global instance holds the budget and the visitor counters. A Durable Object
// handles one request at a time and its storage is strongly consistent, which is
// what makes the spend cap a hard limit rather than a best effort. State is read
// from storage once when the object wakes, kept in memory, and written back on
// every change.
export class Ledger extends DurableObject<LedgerEnv> {
  private budget!: BudgetState;
  private limits!: Record<Kind, LimitState>;

  constructor(ctx: DurableObjectState, env: LedgerEnv) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const now = Date.now();
      const stored = await ctx.storage.get<BudgetState | LimitState>(["budget", "limits:run", "limits:question"]);
      this.budget = (stored.get("budget") as BudgetState | undefined) ?? emptyBudget(now);
      this.limits = {
        run: (stored.get("limits:run") as LimitState | undefined) ?? emptyLimits(now),
        question: (stored.get("limits:question") as LimitState | undefined) ?? emptyLimits(now),
      };
    });
  }

  private budgetCfg(): BudgetConfig {
    return {
      monthlyMicro: Math.round(Number(this.env.MONTHLY_BUDGET_USD) * 1e6),
      dailyMicro: Math.round(Number(this.env.DAILY_BUDGET_USD) * 1e6),
    };
  }
  private limitCfg(kind: Kind): LimitConfig {
    const k = KINDS[kind];
    return { runsPerDay: Number(this.env[k.perDay]), burstMs: k.burstMs, inflightMs: k.inflightMs };
  }
  private saveBudget(): Promise<void> {
    return this.ctx.storage.put("budget", this.budget);
  }
  private saveLimits(kind: Kind): Promise<void> {
    return this.ctx.storage.put(`limits:${kind}`, this.limits[kind]);
  }

  // Whether a run or question of at least `minMicro` is currently affordable. No amounts leave the Worker.
  async live(minMicro: number): Promise<boolean> {
    const left = remaining(this.budget, this.budgetCfg(), Date.now());
    return Math.min(left.month, left.day) >= minMicro;
  }

  // Start of a run or question: "is there any budget at all", then the visitor's limits.
  async begin(keys: string[], minMicro: number, kind: Kind): Promise<Begin | { ok: false; reason: "budget"; retryAfterSec: number }> {
    if (!(await this.live(minMicro))) return { ok: false, reason: "budget", retryAfterSec: 3600 };
    const res = begin(this.limits[kind], this.limitCfg(kind), keys, Date.now());
    await this.saveLimits(kind);
    return res;
  }

  async end(keys: string[], kind: Kind): Promise<void> {
    end(this.limits[kind], keys);
    await this.saveLimits(kind);
  }

  async reserve(microUsd: number): Promise<string | null> {
    const r = reserve(this.budget, this.budgetCfg(), microUsd, Date.now());
    await this.saveBudget();
    return r.ok ? r.id : null;
  }

  async settle(id: string, microUsd: number): Promise<void> {
    settle(this.budget, id, microUsd, Date.now());
    await this.saveBudget();
  }
}
