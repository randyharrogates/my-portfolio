// The role-fit pipeline. The shape is fixed in code, not chosen by a model:
// gate, planner, up to 6 parallel retrievers, critic, writer. At most 10 model
// calls per run, each with a hard output cap and a budget reservation.

import type { Bm25 } from "./bm25.ts";
import { cost, worstCase } from "./model.ts";
import type { Model, ModelRequest, Price, Step, Usage } from "./model.ts";
import { MAX_OUTPUT, SCHEMAS, SYSTEM, criticUser, gateUser, plannerUser, retrieverUser, writerUser } from "./prompts.ts";
import { quoteIsGrounded } from "./quote.ts";
import { JsonStringStream, ScreenedText } from "./stream.ts";
import type { Chunk } from "./types.ts";

export const MAX_JD_CHARS = 6000;
export const MAX_REQUIREMENTS = 6;
const TOP_K = 8;
const MAX_EVIDENCE = 2;

export type Verdict = "strong" | "partial" | "gap";
const RANK: Record<Verdict, number> = { gap: 0, partial: 1, strong: 2 };
const isVerdict = (v: unknown): v is Verdict => v === "strong" || v === "partial" || v === "gap";

export interface EvidenceOut {
  chunkId: string;
  quote: string;
  title: string;
  url: string;
}

export interface RequirementResult {
  id: string;
  text: string;
  importance: "must" | "nice";
  verdict: Verdict;
  evidence: EvidenceOut[];
}

export interface Report {
  role: string;
  summary: string;
  results: RequirementResult[];
}

export type Outcome =
  | { status: "done"; report: Report }
  | { status: "not_a_job_description" }
  | { status: "budget_exhausted" }
  | { status: "failed"; step: Step };

// What the page renders, in the order it happened. `id` ties an event to one
// requirement (r1..r6). Costs are estimates in micro-dollars from the configured
// list price; `ms` is how long a model call took.
export type EventBody =
  | { type: "step"; step: Step; id?: string; label: string; state: "start" | "done" | "failed"; usage?: Usage; ms?: number; costMicro?: number }
  | { type: "say"; text: string } // plain-language narration for the conversation pane, composed in code
  | { type: "plan"; role: string; requirements: { id: string; text: string; importance: string }[] }
  | { type: "retrieved"; id: string; chunks: { id: string; title: string }[] }
  | { type: "verdict"; id: string; verdict: Verdict; evidence: EvidenceOut[] }
  | { type: "dropped"; id: string; reason: "quote_not_in_source" | "unknown_source" | "critic_lowered" | "no_evidence" }
  | { type: "delta"; text: string } // a piece of the summary, as the writer produces it
  | { type: "summary"; text: string; streamed: boolean } // the authoritative summary: replaces any deltas
  | { type: "usage"; calls: number; input: number; cached: number; output: number; costMicro: number };

// `t` is milliseconds since the run started, so a cached run can be replayed at its real pace.
export type Event = EventBody & { t: number };

// The budget seam. `reserve` returns null when the cap would be exceeded.
export interface Meter {
  reserve(microUsd: number): Promise<string | null>;
  settle(id: string, microUsd: number): Promise<void>;
}

export interface Deps {
  model: Model;
  index: Bm25;
  byId: Map<string, Chunk>;
  meter: Meter;
  price: Price;
  emit: (e: Event) => void;
  now?: () => number;
}

class BudgetExhausted extends Error {}
class StepFailed extends Error {
  step: Step;
  constructor(step: Step) {
    super(`step failed: ${step}`);
    this.step = step;
  }
}

// Claims the site must never make, whatever a model writes.
const FORBIDDEN = [/10,?000\+?\s*users/i, /\bvllm\b/i, /\bllama\b/i, /\b[89]\d{3}[ -]?\d{4}\b/, /@\w+\.(com|sg)\b/i];
export const isClean = (text: string) => !FORBIDDEN.some((re) => re.test(text));

const rec = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

export async function runPipeline(jdRaw: string, deps: Deps): Promise<Outcome> {
  const jd = jdRaw.slice(0, MAX_JD_CHARS);
  const total = { calls: 0, input: 0, cached: 0, output: 0, costMicro: 0 };
  const now = deps.now ?? Date.now;
  const t0 = now();
  const emit = (e: EventBody) => deps.emit({ ...e, t: now() - t0 });
  const say = (text: string) => emit({ type: "say", text });
  const n = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

  async function call(
    step: Step,
    label: string,
    user: string,
    opts: { id?: string; onText?: (delta: string) => void } = {},
  ): Promise<Record<string, unknown>> {
    const req: ModelRequest = {
      step,
      system: SYSTEM,
      user,
      schemaName: step,
      schema: SCHEMAS[step],
      maxOutputTokens: MAX_OUTPUT[step],
    };
    const worst = worstCase(req, deps.price);
    const reservation = await deps.meter.reserve(worst);
    if (reservation === null) throw new BudgetExhausted();
    const tag = opts.id ? { id: opts.id } : {};
    emit({ type: "step", step, ...tag, label, state: "start" });
    const began = now();
    let spent = worst; // if the call throws we may still have been billed: assume the worst
    try {
      const res = await deps.model.call(req, opts.onText);
      spent = cost(res.usage, deps.price);
      total.calls++;
      total.input += res.usage.input;
      total.cached += res.usage.cached;
      total.output += res.usage.output;
      total.costMicro += spent;
      const json = rec(res.json);
      if (!json) throw new StepFailed(step);
      emit({ type: "step", step, ...tag, label, state: "done", usage: res.usage, ms: now() - began, costMicro: spent });
      emit({ type: "usage", ...total });
      return json;
    } catch (e) {
      emit({ type: "step", step, ...tag, label, state: "failed", ms: now() - began });
      throw e instanceof StepFailed ? e : new StepFailed(step);
    } finally {
      await deps.meter.settle(reservation, spent);
    }
  }

  try {
    // 0. Gate: is this a job description at all?
    const gate = await call("gate", "Checking the input", gateUser(jd));
    if (gate.is_job_description !== true) return { status: "not_a_job_description" };
    say("This is a job description. Reading the role.");

    // 1. Planner
    const plan = await call("planner", "Reading the role", plannerUser(jd));
    const role = typeof plan.role === "string" && plan.role.trim() ? plan.role.trim().slice(0, 120) : "this role";
    const requirements = (Array.isArray(plan.requirements) ? plan.requirements : [])
      .map(rec)
      .filter((r): r is Record<string, unknown> => r !== null && typeof r.text === "string" && r.text.trim().length > 0)
      .slice(0, MAX_REQUIREMENTS)
      .map((r, i) => ({
        id: `r${i + 1}`,
        text: (r.text as string).trim().slice(0, 240),
        importance: r.importance === "nice" ? ("nice" as const) : ("must" as const),
      }));
    if (requirements.length === 0) throw new StepFailed("planner");
    emit({ type: "plan", role, requirements });
    say(
      `I picked the ${n(requirements.length, "requirement")} the advert stresses most. ` +
        `${requirements.length === 1 ? "A retriever is" : `${requirements.length} retrievers are`} now searching the case studies and CV${requirements.length === 1 ? "" : " in parallel"}.`,
    );
    let droppedQuotes = 0;

    // 2. Retrievers, in parallel. Search is code; the model only judges what search found.
    const results: RequirementResult[] = await Promise.all(
      requirements.map(async (r) => {
        const found = deps.index.search(r.text, TOP_K).map((h) => h.chunk);
        emit({ type: "retrieved", id: r.id, chunks: found.map((c) => ({ id: c.id, title: c.title })) });
        const base = { ...r, verdict: "gap" as Verdict, evidence: [] as EvidenceOut[] };
        const settle = (res: RequirementResult) => {
          emit({ type: "verdict", id: res.id, verdict: res.verdict, evidence: res.evidence });
          return res;
        };
        if (found.length === 0) {
          emit({ type: "dropped", id: r.id, reason: "no_evidence" });
          return settle(base); // nothing to judge: a gap, and no model call spent
        }
        let out: Record<string, unknown>;
        try {
          out = await call("retriever", `Finding evidence: ${r.text}`, retrieverUser(r.text, found), { id: r.id });
        } catch (e) {
          if (e instanceof BudgetExhausted) throw e;
          return settle(base); // one failed retriever is a gap for that requirement, not a failed run
        }
        const offered = new Set(found.map((c) => c.id));
        const evidence: EvidenceOut[] = [];
        for (const e of (Array.isArray(out.evidence) ? out.evidence : []).map(rec)) {
          if (!e || typeof e.excerpt_id !== "string" || typeof e.quote !== "string") continue;
          const chunk = offered.has(e.excerpt_id) ? deps.byId.get(e.excerpt_id) : undefined;
          if (!chunk) {
            droppedQuotes++;
            emit({ type: "dropped", id: r.id, reason: "unknown_source" });
            continue;
          }
          // The grounding check: enforced here in code, not left to a model.
          if (!quoteIsGrounded(e.quote, chunk) || !isClean(e.quote)) {
            droppedQuotes++;
            emit({ type: "dropped", id: r.id, reason: "quote_not_in_source" });
            continue;
          }
          if (evidence.length < MAX_EVIDENCE)
            evidence.push({ chunkId: chunk.id, quote: e.quote.trim().slice(0, 240), title: chunk.title, url: chunk.url });
        }
        const claimed = isVerdict(out.verdict) ? out.verdict : "gap";
        // A verdict above "gap" needs at least one grounded quote to stand on.
        if (claimed === "gap" || evidence.length === 0) {
          if (claimed !== "gap") emit({ type: "dropped", id: r.id, reason: "no_evidence" });
          return settle(base);
        }
        return settle({ ...base, verdict: claimed, evidence });
      }),
    );
    const withEvidence = results.filter((r) => r.verdict !== "gap").length;
    say(
      `Evidence found for ${withEvidence} of ${results.length}.` +
        (droppedQuotes ? ` ${n(droppedQuotes, "quote")} did not match ${droppedQuotes === 1 ? "its" : "their"} source and ${droppedQuotes === 1 ? "was" : "were"} dropped.` : "") +
        (withEvidence ? " A critic is now challenging the evidence." : ""),
    );

    const asItems = () =>
      results.map((r) => ({ id: r.id, requirement: r.text, verdict: r.verdict, quotes: r.evidence.map((e) => e.quote) }));

    // 3. Critic: may lower a verdict, can never raise one.
    if (results.some((r) => r.verdict !== "gap")) {
      const critic = await call("critic", "Checking the evidence", criticUser(asItems()));
      let lowered = 0;
      for (const item of (Array.isArray(critic.items) ? critic.items : []).map(rec)) {
        if (!item || typeof item.id !== "string" || !isVerdict(item.verdict)) continue;
        const r = results.find((x) => x.id === item.id);
        if (!r || RANK[item.verdict] >= RANK[r.verdict]) continue;
        r.verdict = item.verdict;
        if (item.verdict === "gap") r.evidence = [];
        lowered++;
        emit({ type: "dropped", id: r.id, reason: "critic_lowered" });
        emit({ type: "verdict", id: r.id, verdict: r.verdict, evidence: r.evidence });
      }
      say(lowered ? `The critic lowered ${n(lowered, "verdict")}. Writing the summary.` : "The critic kept every verdict. Writing the summary.");
    }

    // 4. Writer. Its prose is the one thing not checked quote by quote, so it is
    // screened and, if it fails, replaced by a summary computed from the verdicts.
    const strong = results.filter((r) => r.verdict === "strong").length;
    const partial = results.filter((r) => r.verdict === "partial").length;
    const gaps = results.length - strong - partial;
    const fallback = `Of ${results.length} requirements for ${role}, the published work shows strong evidence for ${strong}, partial evidence for ${partial}, and none for ${gaps}.`;
    let summary = fallback;
    // The summary streams to the page as it is written, a few words behind and only
    // while it passes the screen. The `summary` event that follows is authoritative.
    const extract = new JsonStringStream("summary");
    const screened = new ScreenedText(isClean, (text) => emit({ type: "delta", text }));
    try {
      const written = await call("writer", "Writing the summary", writerUser(role, asItems()), {
        onText: (d) => screened.push(extract.push(d)),
      });
      const s = typeof written.summary === "string" ? written.summary.trim() : "";
      if (s && s.length <= 700 && isClean(s)) {
        summary = s;
        screened.flush(s);
      }
    } catch {
      // A failed or unaffordable writer is not a failed run: the verdicts and quotes
      // already paid for stand on their own, with the computed summary.
    }

    emit({ type: "summary", text: summary, streamed: summary !== fallback && screened.sent === summary });
    return { status: "done", report: { role, summary, results } };
  } catch (e) {
    if (e instanceof BudgetExhausted) return { status: "budget_exhausted" };
    if (e instanceof StepFailed) return { status: "failed", step: e.step };
    throw e;
  } finally {
    emit({ type: "usage", ...total });
  }
}
