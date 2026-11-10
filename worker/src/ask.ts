// Follow-up questions about a finished report: memory → search → answer → verify,
// with one bounded loop (the answer step may call the search tool once). The same
// rules as the report: the model only sees excerpts that search found, every quote
// is checked in code against its source, and an answer with no grounded quote is
// replaced by a fixed "not shown" reply.
//
// Memory is compacted, not truncated: the last KEEP_VERBATIM turns stay word for
// word and everything older is folded into one short running summary. Compaction
// waits until COMPACT_AT turns are held, so it costs one model call every other
// question, not one per question. Refused questions are never remembered.

import { cleanInput, clip, isSafeMemory, isSafeProse, looksLikeInjection, oneLine } from "./guard.ts";
import { BudgetExhausted, Run, rec, recs } from "./metered.ts";
import type { RunDeps, Stamped, StepEvent, UsageEvent } from "./metered.ts";
import type { Report } from "./pipeline.ts";
import { answerRules, answerUser, excerpts, memoryUser } from "./prompts.ts";
import { groundQuotes } from "./quote.ts";
import type { DropReason, EvidenceOut } from "./quote.ts";
import { JsonStringStream, ScreenedText } from "./stream.ts";
import type { Action } from "./suggest.ts";
import type { Chunk } from "./types.ts";
import { SAY } from "./voice.ts";

export const MIN_QUESTION_CHARS = 8;
export const MAX_QUESTION_CHARS = 300;
export const KEEP_VERBATIM = 2;
export const COMPACT_AT = 4;
const MAX_HELD = 6; // if compaction keeps failing, turns beyond this are dropped unsummarised
export const MAX_ASK_ROUNDS = 2; // the first answer call, and one more after a tool call
const TOP_K = 6;
const MAX_EVIDENCE = 3;
const MAX_ANSWER_CHARS = 700;
const MAX_SUMMARY_CHARS = 700;
const MAX_SEARCH_CHARS = 120;

export interface Turn {
  q: string;
  a: string;
  chunkIds: string[];
}

// What is remembered of a conversation, server-side, for one visitor and one report.
export interface Memory {
  summary: string; // everything older than the turns below, in a few sentences
  compacted: number; // how many turns the summary stands for
  turns: Turn[]; // the most recent turns, word for word
}
export const emptyMemory = (): Memory => ({ summary: "", compacted: 0, turns: [] });

export interface Answer {
  kind: "grounded" | "not_shown" | "off_topic";
  text: string;
  evidence: EvidenceOut[];
  actions: Action[]; // chips the page offers under this answer
}

export type AskOutcome = { status: "answered"; answer: Answer; memory: Memory } | { status: "budget_exhausted" } | { status: "failed" };

type OwnEvent =
  | { type: "memory"; kept: number; compacted: number; justCompacted: number } // what the answer will be given
  | { type: "searched"; round: number; chunks: { id: string; title: string }[] }
  | { type: "retry"; search: string } // the answer step called the search tool
  | { type: "verified"; quotes: number; dropped: number } // the code check on the answer's citations
  | { type: "dropped"; reason: DropReason }
  | { type: "delta"; text: string }
  | { type: "answer"; answer: Answer }; // authoritative: replaces any deltas

export type AskEvent = Stamped<OwnEvent | StepEvent | UsageEvent>;
export type AskDeps = RunDeps<AskEvent>;

const notShown = (): Answer => ({ kind: "not_shown", text: SAY.notShown, evidence: [], actions: ["email"] });
// A refusal still leaves the visitor somewhere to go: the question may be a fair one for me in person.
const offTopic = (): Answer => ({ kind: "off_topic", text: SAY.offTopic, evidence: [], actions: ["email"] });

// Folds every turn but the last KEEP_VERBATIM into the running summary. If the model
// call fails or its text does not pass the screen, the turns wait for the next
// attempt; past MAX_HELD the oldest are dropped, because the context must stay bounded.
async function compact(memory: Memory, run: Run<OwnEvent>): Promise<{ memory: Memory; justCompacted: number }> {
  if (memory.turns.length < COMPACT_AT) return { memory, justCompacted: 0 };
  const old = memory.turns.slice(0, -KEEP_VERBATIM);
  try {
    const out = await run.call("memory", memoryUser(memory.summary, old));
    const summary = typeof out.summary === "string" ? clip(oneLine(out.summary, 2 * MAX_SUMMARY_CHARS), MAX_SUMMARY_CHARS) : "";
    if (summary && isSafeMemory(summary)) return { memory: { summary, compacted: memory.compacted + old.length, turns: memory.turns.slice(-KEEP_VERBATIM) }, justCompacted: old.length };
  } catch (e) {
    if (e instanceof BudgetExhausted) throw e;
  }
  const over = Math.max(0, memory.turns.length - (MAX_HELD - 1));
  return { memory: { ...memory, compacted: memory.compacted + over, turns: memory.turns.slice(over) }, justCompacted: 0 };
}

export async function runAsk(questionRaw: string, report: Report, remembered: Memory, deps: AskDeps): Promise<AskOutcome> {
  // One plain line: a question has no use for markup, and cannot open or close a block in the prompt.
  const question = oneLine(cleanInput(questionRaw), MAX_QUESTION_CHARS);
  const run = new Run<OwnEvent>(deps);
  let memory = remembered;
  const finish = (answer: Answer): AskOutcome => {
    run.emit({ type: "answer", answer });
    if (answer.kind === "off_topic") return { status: "answered", answer, memory }; // a refused question is not remembered
    const turn: Turn = { q: question, a: answer.text, chunkIds: answer.evidence.map((e) => e.chunkId) };
    return { status: "answered", answer, memory: { ...memory, turns: [...memory.turns, turn] } };
  };

  // 0. A question that addresses the model instead of asking about the work is
  // refused in code: no search, no model call, nothing spent, nothing remembered.
  if (looksLikeInjection(question)) {
    run.emit({ type: "answer", answer: offTopic() });
    return { status: "answered", answer: offTopic(), memory };
  }

  try {
    // 1. Memory: keep the context small before anything is added to it.
    const compacted = await compact(memory, run);
    memory = compacted.memory;
    run.emit({ type: "memory", kept: memory.turns.length, compacted: memory.compacted, justCompacted: compacted.justCompacted });

    // 2. Search, in code. Excerpts cited in the previous turn stay on the table, so
    // "tell me more about that" has something to stand on.
    const search = (query: string, round: number): Chunk[] => {
      const found = deps.index.offer(query, TOP_K);
      for (const id of memory.turns.at(-1)?.chunkIds ?? []) {
        const c = deps.byId.get(id);
        if (c && !found.includes(c)) found.push(c);
      }
      run.emit({ type: "searched", round, chunks: found.map((c) => ({ id: c.id, title: c.title })) });
      return found;
    };

    const first = search(question, 1);
    if (first.length === 0) return finish(notShown()); // nothing to stand on: no model call spent

    // 3. The answer step: is it in scope, which quotes answer it, and the answer in
    // prose. The prose streams only once the scope flag and the quotes, which come
    // first in the output, have been read and at least one quote has passed the check.
    let offered = first;
    let screened = new ScreenedText(isSafeProse, () => {});
    const streaming = () => {
      let raw = "";
      let mayStream: boolean | undefined;
      const extract = new JsonStringStream("answer");
      const table = offered;
      screened = new ScreenedText(isSafeProse, (text) => run.emit({ type: "delta", text }));
      return (delta: string) => {
        raw += delta;
        const piece = extract.push(delta);
        if (!piece) return;
        mayStream ??= headAllowsStreaming(raw, (claimed) => groundQuotes(claimed, table, MAX_EVIDENCE).length > 0);
        if (mayStream) screened.push(piece);
      };
    };
    const rules = answerRules(deps.index.profile);
    const user = answerUser(question, report, memory, first);
    const turn = await run.callOrTool("answer", user, { round: 1, rules, onText: streaming() });
    let out: Record<string, unknown>;
    if ("reply" in turn) {
      out = turn.reply;
    } else {
      // 4. The loop: the model chose to call search_portfolio. The search runs here, in
      // code, and the model answers once more with what it found. No tool the second time.
      const query = typeof turn.args.query === "string" ? oneLine(turn.args.query, MAX_SEARCH_CHARS) : "";
      if (!query || !isSafeProse(query)) return finish(notShown());
      run.emit({ type: "retry", search: query });
      // A search that adds nothing still gets its reply: the first excerpts may hold the answer after all.
      const more = search(query, 2).filter((c) => !first.includes(c));
      offered = [...first, ...more];
      const output = more.length ? excerpts(more) : "The search found nothing new. Answer from the excerpts you already have, or return no evidence.";
      out = await run.call("answer", user, { round: 2, rules, onText: streaming(), toolResult: { call: turn.toolCall, output } });
    }

    // 5. Verify, in code: the authoritative answer.
    if (out.in_scope !== true) return finish(offTopic());
    let dropped = 0;
    const evidence = groundQuotes(recs(out.evidence), offered, MAX_EVIDENCE, (reason) => {
      dropped++;
      run.emit({ type: "dropped", reason });
    });
    run.emit({ type: "verified", quotes: evidence.length, dropped });
    if (evidence.length === 0) return finish(notShown());
    const text = typeof out.answer === "string" ? out.answer.trim() : "";
    if (text && text.length <= MAX_ANSWER_CHARS && isSafeProse(text)) {
      screened.flush(text);
      return finish({ kind: "grounded", text, evidence, actions: [] });
    }
    // The prose failed the screen: the checked quotes still stand on their own.
    return finish({ kind: "grounded", text: SAY.quotesOnly, evidence, actions: ["email"] });
  } catch (e) {
    return { status: e instanceof BudgetExhausted ? "budget_exhausted" : "failed" };
  }
}

// Reads the part of the reply that precedes the prose (`{"in_scope":…,"evidence":[…]`)
// while the reply is still arriving, and says whether the prose may be shown as it streams.
function headAllowsStreaming(raw: string, hasGroundedQuote: (claimed: Record<string, unknown>[]) => boolean): boolean {
  const proseStart = /,\s*"answer"\s*:\s*"/.exec(raw);
  if (!proseStart) return false;
  try {
    const head = rec(JSON.parse(`${raw.slice(0, proseStart.index)}}`));
    return head !== null && head.in_scope === true && hasGroundedQuote(recs(head.evidence));
  } catch {
    return false; // unparseable so far: nothing streams, the final check decides
  }
}
