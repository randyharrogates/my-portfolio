// Follow-up questions about a finished report. One search and at most one model
// call per question. The same rules as the report: the model only sees excerpts
// that search found, every quote is checked in code against its source, and an
// answer with no grounded quote is replaced by a fixed "not shown" reply.

import type { Bm25 } from "./bm25.ts";
import { cost, worstCase } from "./model.ts";
import type { Model, ModelRequest, Price, Usage } from "./model.ts";
import { cleanInput, isClean, isSafeProse, looksLikeInjection } from "./guard.ts";
import type { EvidenceOut, Meter, Report } from "./pipeline.ts";
import { MAX_OUTPUT, SCHEMAS, SYSTEM, answerUser } from "./prompts.ts";
import { quoteIsGrounded } from "./quote.ts";
import { JsonStringStream, ScreenedText } from "./stream.ts";
import type { Action } from "./suggest.ts";
import type { Chunk } from "./types.ts";
import { SAY } from "./voice.ts";

export const MIN_QUESTION_CHARS = 8;
export const MAX_QUESTION_CHARS = 300;
export const MAX_TURNS_REMEMBERED = 4;
const TOP_K = 6;
const MAX_EVIDENCE = 3;
const MAX_ANSWER_CHARS = 700;

// What is remembered of a conversation, server-side, for one visitor and one report.
export interface Turn {
  q: string;
  a: string;
  chunkIds: string[];
}

export type AnswerKind = "grounded" | "not_shown" | "off_topic";

export interface Answer {
  kind: AnswerKind;
  text: string;
  evidence: EvidenceOut[];
  actions: Action[]; // chips the page offers under this answer
}

export type AskOutcome = { status: "answered"; answer: Answer } | { status: "budget_exhausted" } | { status: "failed" };

export type AskEventBody =
  | { type: "step"; step: "search" | "answer"; label: string; state: "start" | "done" | "failed"; usage?: Usage; ms?: number; costMicro?: number }
  | { type: "retrieved"; chunks: { id: string; title: string }[] }
  | { type: "dropped"; reason: "quote_not_in_source" | "unknown_source" }
  | { type: "delta"; text: string }
  | { type: "answer"; answer: Answer; streamed: boolean } // authoritative: replaces any deltas
  | { type: "usage"; calls: number; input: number; cached: number; output: number; costMicro: number };

export type AskEvent = AskEventBody & { t: number };

export interface AskDeps {
  model: Model;
  index: Bm25;
  byId: Map<string, Chunk>;
  meter: Meter;
  price: Price;
  emit: (e: AskEvent) => void;
  now?: () => number;
}

export const NOT_SHOWN = SAY.notShown;
export const OFF_TOPIC = SAY.offTopic;
const notShown = (): Answer => ({ kind: "not_shown", text: NOT_SHOWN, evidence: [], actions: ["email"] });
const offTopic = (): Answer => ({ kind: "off_topic", text: OFF_TOPIC, evidence: [], actions: [] });

const rec = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

export async function runAsk(questionRaw: string, report: Report, history: Turn[], deps: AskDeps): Promise<AskOutcome> {
  const question = cleanInput(questionRaw).slice(0, MAX_QUESTION_CHARS);
  const now = deps.now ?? Date.now;
  const t0 = now();
  const emit = (e: AskEventBody) => deps.emit({ ...e, t: now() - t0 });
  const total = { calls: 0, input: 0, cached: 0, output: 0, costMicro: 0 };
  const finish = (answer: Answer, streamed = false): AskOutcome => {
    emit({ type: "answer", answer, streamed });
    emit({ type: "usage", ...total });
    return { status: "answered", answer };
  };

  // 0. A question that addresses the model instead of asking about the work is
  // refused in code: no search, no model call, nothing spent.
  if (looksLikeInjection(question)) return finish(offTopic());

  // 1. Search, in code. Excerpts cited in the previous turn stay on the table, so
  // "tell me more about that" has something to stand on.
  emit({ type: "step", step: "search", label: "Searching the case studies and CV", state: "start" });
  const found = deps.index.search(question, TOP_K).map((h) => h.chunk);
  for (const id of history.at(-1)?.chunkIds ?? []) {
    const c = deps.byId.get(id);
    if (c && !found.some((f) => f.id === c.id)) found.push(c);
  }
  emit({ type: "retrieved", chunks: found.map((c) => ({ id: c.id, title: c.title })) });
  emit({ type: "step", step: "search", label: "Searching the case studies and CV", state: "done", ms: now() - t0 });
  if (found.length === 0) return finish(notShown()); // no model call spent

  // 2. One model call: is it in scope, which quotes answer it, and the answer in prose.
  const req: ModelRequest = {
    step: "answer",
    system: SYSTEM,
    user: answerUser(question, report, history.slice(-MAX_TURNS_REMEMBERED), found),
    schemaName: "answer",
    schema: SCHEMAS.answer,
    maxOutputTokens: MAX_OUTPUT.answer,
  };
  const worst = worstCase(req, deps.price);
  const reservation = await deps.meter.reserve(worst);
  if (reservation === null) return { status: "budget_exhausted" };

  const offered = new Set(found.map((c) => c.id));
  const ground = (list: unknown, report_drops: boolean): EvidenceOut[] => {
    const out: EvidenceOut[] = [];
    for (const e of (Array.isArray(list) ? list : []).map(rec)) {
      if (!e || typeof e.excerpt_id !== "string" || typeof e.quote !== "string") continue;
      const chunk = offered.has(e.excerpt_id) ? deps.byId.get(e.excerpt_id) : undefined;
      if (!chunk) {
        if (report_drops) emit({ type: "dropped", reason: "unknown_source" });
        continue;
      }
      if (!quoteIsGrounded(e.quote, chunk) || !isClean(e.quote)) {
        if (report_drops) emit({ type: "dropped", reason: "quote_not_in_source" });
        continue;
      }
      if (out.length < MAX_EVIDENCE) out.push({ chunkId: chunk.id, quote: e.quote.trim().slice(0, 240), title: chunk.title, url: chunk.url });
    }
    return out;
  };

  // The prose streams only once the scope flag and the quotes, which come first in
  // the output, have been read and at least one quote has passed the grounding check.
  let rawText = "";
  let mayStream: boolean | undefined;
  const extract = new JsonStringStream("answer");
  const screened = new ScreenedText(isSafeProse, (text) => emit({ type: "delta", text }));
  const onText = (d: string) => {
    rawText += d;
    const piece = extract.push(d);
    if (!piece) return;
    if (mayStream === undefined) {
      mayStream = false;
      const m = /,\s*"answer"\s*:\s*"/.exec(rawText);
      try {
        const head = m ? rec(JSON.parse(`${rawText.slice(0, m.index)}}`)) : null;
        mayStream = head !== null && head.in_scope === true && ground(head.evidence, false).length > 0;
      } catch {
        // unparseable so far: do not stream, the final check decides
      }
    }
    if (mayStream) screened.push(piece);
  };

  emit({ type: "step", step: "answer", label: "Answering from the evidence", state: "start" });
  const began = now();
  let spent = worst;
  let out: Record<string, unknown> | null = null;
  try {
    const res = await deps.model.call(req, onText);
    spent = cost(res.usage, deps.price);
    total.calls++;
    total.input += res.usage.input;
    total.cached += res.usage.cached;
    total.output += res.usage.output;
    total.costMicro += spent;
    out = rec(res.json);
    emit({ type: "step", step: "answer", label: "Answering from the evidence", state: out ? "done" : "failed", usage: res.usage, ms: now() - began, costMicro: spent });
  } catch {
    emit({ type: "step", step: "answer", label: "Answering from the evidence", state: "failed", ms: now() - began });
  } finally {
    await deps.meter.settle(reservation, spent);
  }
  if (!out) {
    emit({ type: "usage", ...total });
    return { status: "failed" };
  }

  // 3. The authoritative answer, decided in code.
  if (out.in_scope !== true) return finish(offTopic());
  const evidence = ground(out.evidence, true);
  if (evidence.length === 0) return finish(notShown());
  const s = typeof out.answer === "string" ? out.answer.trim() : "";
  if (s && s.length <= MAX_ANSWER_CHARS && isSafeProse(s)) {
    screened.flush(s);
    return finish({ kind: "grounded", text: s, evidence, actions: [] }, screened.sent === s);
  }
  // The prose failed the screen: the checked quotes still stand on their own.
  return finish({ kind: "grounded", text: SAY.quotesOnly, evidence, actions: ["email"] });
}
