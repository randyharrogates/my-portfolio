// One place for the rule every model call follows: reserve the worst-case cost,
// make the call, settle what it really cost (the worst case if it threw), count
// the usage, and tell the page. The pipeline and the follow-up answers both run
// their calls through this, so the budget rule cannot drift between them.

import type { Bm25 } from "./bm25.ts";
import { cost, worstCase } from "./model.ts";
import type { Model, Price, Step, Usage } from "./model.ts";
import { MAX_OUTPUT, SCHEMAS, SYSTEM } from "./prompts.ts";
import type { Chunk } from "./types.ts";

// The budget seam. `reserve` returns null when the cap would be exceeded.
export interface Meter {
  reserve(microUsd: number): Promise<string | null>;
  settle(id: string, microUsd: number): Promise<void>;
}

// What a run needs from outside. `E` is the event type that run streams.
export interface RunDeps<E> {
  model: Model;
  index: Bm25;
  byId: Map<string, Chunk>;
  meter: Meter;
  price: Price;
  emit: (e: E) => void;
  now?: () => number;
  // Told why a step failed. The visitor is only ever told that it did.
  onError?: (step: Step, reason: string) => void;
}

export interface Totals {
  calls: number;
  input: number;
  cached: number;
  output: number;
  costMicro: number; // an estimate, in micro-dollars, from the configured list price
}

// Sent around every model call. `id` ties a retriever to its requirement; `ms` is how long the call took.
export type StepEvent = { type: "step"; step: Step; id?: string; state: "start" | "done" | "failed"; usage?: Usage; ms?: number; costMicro?: number };
export type UsageEvent = { type: "usage" } & Totals;

// `t` is milliseconds since the run started, so a stored run can be replayed at its real pace.
export type Stamped<E> = E & { t: number };

export class BudgetExhausted extends Error {}
export class StepFailed extends Error {
  step: Step;
  constructor(step: Step) {
    super(`step failed: ${step}`);
    this.step = step;
  }
}

export const rec = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

// A model's "list of objects", with anything that is not an object dropped.
export const recs = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v : []).map(rec).filter((r) => r !== null);

export class Run<E extends { type: string }> {
  readonly total: Totals = { calls: 0, input: 0, cached: 0, output: 0, costMicro: 0 };
  private deps: RunDeps<Stamped<E | StepEvent | UsageEvent>>;
  private now: () => number;
  private startedAt: number;

  constructor(deps: RunDeps<Stamped<E | StepEvent | UsageEvent>>) {
    this.deps = deps;
    this.now = deps.now ?? Date.now;
    this.startedAt = this.now();
  }

  emit(event: E | StepEvent | UsageEvent): void {
    this.deps.emit({ ...event, t: this.now() - this.startedAt });
  }

  emitUsage(): void {
    this.emit({ type: "usage", ...this.total });
  }

  // Throws BudgetExhausted before spending anything, or StepFailed after settling.
  async call(step: Step, user: string, opts: { id?: string; onText?: (delta: string) => void } = {}): Promise<Record<string, unknown>> {
    const req = { step, system: SYSTEM, user, schemaName: step, schema: SCHEMAS[step], maxOutputTokens: MAX_OUTPUT[step] };
    const worst = worstCase(req, this.deps.price);
    const reservation = await this.deps.meter.reserve(worst);
    if (reservation === null) throw new BudgetExhausted();
    const tag = opts.id ? { id: opts.id } : {};
    this.emit({ type: "step", step, ...tag, state: "start" });
    const began = this.now();
    let spent = worst; // if the call throws we may still have been billed: assume the worst
    try {
      const res = await this.deps.model.call(req, opts.onText);
      spent = cost(res.usage, this.deps.price);
      this.total.calls++;
      this.total.input += res.usage.input;
      this.total.cached += res.usage.cached;
      this.total.output += res.usage.output;
      this.total.costMicro += spent;
      const json = rec(res.json);
      if (!json) throw new Error(`reply was not a JSON object (${res.usage.output} output tokens)`);
      this.emit({ type: "step", step, ...tag, state: "done", usage: res.usage, ms: this.now() - began, costMicro: spent });
      this.emitUsage();
      return json;
    } catch (e) {
      this.deps.onError?.(step, e instanceof Error ? e.message : String(e));
      this.emit({ type: "step", step, ...tag, state: "failed", ms: this.now() - began });
      throw new StepFailed(step);
    } finally {
      await this.deps.meter.settle(reservation, spent);
    }
  }
}
