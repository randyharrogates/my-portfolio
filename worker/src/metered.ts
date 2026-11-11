// One place for the rule every model call follows: reserve the worst-case cost,
// make the call, settle what it really cost (the worst case if it threw), count
// the usage, and tell the page. The pipeline and the follow-up answers both run
// their calls through this, so the budget rule cannot drift between them.
//
// A call the provider turned away before producing anything (rate limit, server
// error, dropped connection) is tried again, up to MAX_RETRIES times, waiting
// longer each time. Nothing was billed for it, so it stays inside one reservation.

import type { Bm25 } from "./bm25.ts";
import { TransientError, cost, worstCase } from "./model.ts";
import type { Model, ModelRequest, ModelResponse, Price, Step, Tool, Usage } from "./model.ts";
import { MAX_OUTPUT, SCHEMAS, SYSTEM, TOOLS } from "./prompts.ts";
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
  sleep?: (ms: number) => Promise<void>; // the wait between retries; tests pass one that does not wait
  random?: () => number; // 0..1, for the jitter on that wait
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

// Sent around every model call. `id` ties a retriever to its requirement; `ms` is how long the call took;
// `tool` names the function the model called, when it called one. "retrying" is sent before each wait:
// `attempt` is the try that just failed and `waitMs` how long until the next.
export type StepEvent = {
  type: "step";
  step: Step;
  id?: string;
  round?: number;
  state: "start" | "retrying" | "done" | "failed";
  usage?: Usage;
  ms?: number;
  costMicro?: number;
  tool?: string;
  attempt?: number;
  waitMs?: number;
};

export const MAX_RETRIES = 2;
const BACKOFF_BASE_MS = 400;
// Exponential backoff with jitter: about 0.4 s, then 0.8 s, each moved up to 25% either way
// so that callers who failed together do not all come back together.
export const backoffMs = (attempt: number, random: number) => Math.round(BACKOFF_BASE_MS * 2 ** (attempt - 1) * (0.75 + random * 0.5));

interface CallOpts {
  id?: string;
  round?: number;
  onText?: (delta: string) => void;
  rules?: string; // the step's own unchanging rules, sent after SYSTEM so the provider can cache both
  tools?: Tool[]; // the functions offered on this call, when they differ from the step's usual ones
}

// What a step that must call a function did: which one, and with what.
export interface Move {
  name: string;
  args: Record<string, unknown>;
}
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
  private sleep: (ms: number) => Promise<void>;
  private startedAt: number;

  constructor(deps: RunDeps<Stamped<E | StepEvent | UsageEvent>>) {
    this.deps = deps;
    this.now = deps.now ?? Date.now;
    this.sleep = deps.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.startedAt = this.now();
  }

  emit(event: E | StepEvent | UsageEvent): void {
    this.deps.emit({ ...event, t: this.now() - this.startedAt });
  }

  emitUsage(): void {
    this.emit({ type: "usage", ...this.total });
  }

  // One model call that must come back as a JSON object: the reply, or the arguments
  // of a tool the step was required to call.
  // Throws BudgetExhausted before spending anything, or StepFailed after settling.
  async call(step: Step, user: string, opts: CallOpts = {}): Promise<Record<string, unknown>> {
    return this.metered(step, user, opts, (res) => {
      const json = rec(res.toolCall ? res.toolCall.args : res.json);
      if (!json) throw new Error(`reply was not a JSON object (${res.usage.output} output tokens)`);
      return json;
    });
  }

  // For a step that must call one of several functions: which one it chose.
  async move(step: Step, user: string, opts: CallOpts = {}): Promise<Move> {
    return this.metered(step, user, opts, (res) => {
      const args = res.toolCall ? rec(res.toolCall.args) : null;
      if (!res.toolCall || !args) throw new Error("the step did not call a function");
      return { name: res.toolCall.name, args };
    });
  }

  private async metered<T>(step: Step, user: string, opts: CallOpts, read: (res: ModelResponse) => T): Promise<T> {
    const usual = TOOLS[step];
    const tools = opts.tools ?? usual?.tools;
    const req: ModelRequest = {
      step,
      system: opts.rules ? `${SYSTEM}\n\n${opts.rules}` : SYSTEM,
      user,
      schemaName: step,
      schema: SCHEMAS[step],
      maxOutputTokens: MAX_OUTPUT[step],
      ...(tools ? { tools, toolChoice: usual?.choice ?? "required" } : {}),
    };
    const worst = worstCase(req, this.deps.price);
    let reservation = await this.deps.meter.reserve(worst);
    if (reservation === null) throw new BudgetExhausted();
    const tag = { ...(opts.id ? { id: opts.id } : {}), ...(opts.round ? { round: opts.round } : {}) };
    this.emit({ type: "step", step, ...tag, state: "start" });
    const began = this.now();
    let spent = worst; // if the call throws we may still have been billed: assume the worst
    try {
      let res: ModelResponse;
      for (let attempt = 1; ; attempt++) {
        try {
          res = await this.deps.model.call(req, opts.onText);
          break;
        } catch (e) {
          // A call that was turned away is tried up to MAX_RETRIES times. One that timed out is tried once more only.
          if (!(e instanceof TransientError) || attempt > (e.maybeBilled ? 1 : MAX_RETRIES)) throw e;
          if (e.maybeBilled) {
            // The attempt we gave up on may still be billed: it is settled at its worst case,
            // and the next attempt has to fit in the budget on its own.
            await this.deps.meter.settle(reservation, worst);
            reservation = await this.deps.meter.reserve(worst);
            if (reservation === null) throw new BudgetExhausted();
          }
          const waitMs = backoffMs(attempt, (this.deps.random ?? Math.random)());
          this.emit({ type: "step", step, ...tag, state: "retrying", attempt, waitMs });
          await this.sleep(waitMs);
        }
      }
      spent = cost(res.usage, this.deps.price);
      this.total.calls++;
      this.total.input += res.usage.input;
      this.total.cached += res.usage.cached;
      this.total.output += res.usage.output;
      this.total.costMicro += spent;
      const out = read(res);
      this.emit({ type: "step", step, ...tag, state: "done", usage: res.usage, ms: this.now() - began, costMicro: spent, ...(res.toolCall ? { tool: res.toolCall.name } : {}) });
      this.emitUsage();
      return out;
    } catch (e) {
      if (e instanceof BudgetExhausted) throw e;
      this.deps.onError?.(step, e instanceof Error ? e.message : String(e));
      this.emit({ type: "step", step, ...tag, state: "failed", ms: this.now() - began });
      throw new StepFailed(step);
    } finally {
      if (reservation !== null) await this.deps.meter.settle(reservation, spent);
    }
  }
}
