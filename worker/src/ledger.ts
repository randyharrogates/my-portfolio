import { DurableObject } from "cloudflare:workers";
import { emptyBudget, remaining, reserve, settle } from "./budget.ts";
import type { BudgetConfig, BudgetState } from "./budget.ts";
import { begin, emptyLimits, end } from "./limits.ts";
import type { Begin, LimitConfig, LimitState } from "./limits.ts";

export interface LedgerEnv {
  MONTHLY_BUDGET_USD: string;
  DAILY_BUDGET_USD: string;
  RUNS_PER_DAY: string;
}

// One global instance holds the budget and the visitor counters. A Durable Object
// handles one request at a time and its storage is strongly consistent, which is
// what makes the spend cap a hard limit rather than a best effort.
export class Ledger extends DurableObject<LedgerEnv> {
  private budgetCfg(): BudgetConfig {
    return {
      monthlyMicro: Math.round(Number(this.env.MONTHLY_BUDGET_USD) * 1e6),
      dailyMicro: Math.round(Number(this.env.DAILY_BUDGET_USD) * 1e6),
    };
  }
  private limitCfg(): LimitConfig {
    return { runsPerDay: Number(this.env.RUNS_PER_DAY), burstMs: 10_000, inflightMs: 120_000 };
  }
  private async budget(now: number): Promise<BudgetState> {
    return (await this.ctx.storage.get<BudgetState>("budget")) ?? emptyBudget(now);
  }
  private async limits(now: number): Promise<LimitState> {
    return (await this.ctx.storage.get<LimitState>("limits")) ?? emptyLimits(now);
  }

  // Start of a run: visitor limits first, then "is there any budget at all".
  async begin(keys: string[], minMicro: number): Promise<Begin | { ok: false; reason: "budget"; retryAfterSec: number }> {
    const now = Date.now();
    const b = await this.budget(now);
    const left = remaining(b, this.budgetCfg(), now);
    await this.ctx.storage.put("budget", b);
    if (Math.min(left.month, left.day) < minMicro) return { ok: false, reason: "budget", retryAfterSec: 3600 };
    const l = await this.limits(now);
    const res = begin(l, this.limitCfg(), keys, now);
    await this.ctx.storage.put("limits", l);
    return res;
  }

  async end(keys: string[]): Promise<void> {
    const l = await this.limits(Date.now());
    end(l, keys);
    await this.ctx.storage.put("limits", l);
  }

  async reserve(microUsd: number): Promise<string | null> {
    const now = Date.now();
    const b = await this.budget(now);
    const r = reserve(b, this.budgetCfg(), microUsd, now);
    await this.ctx.storage.put("budget", b);
    return r.ok ? r.id : null;
  }

  async settle(id: string, microUsd: number): Promise<void> {
    const now = Date.now();
    const b = await this.budget(now);
    settle(b, id, microUsd, now);
    await this.ctx.storage.put("budget", b);
  }

  // Whether live runs are currently affordable. No amounts leave the Worker.
  async live(minMicro: number): Promise<boolean> {
    const now = Date.now();
    const left = remaining(await this.budget(now), this.budgetCfg(), now);
    return Math.min(left.month, left.day) >= minMicro;
  }
}
