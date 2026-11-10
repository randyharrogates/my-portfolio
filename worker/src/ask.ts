// Follow-up questions about a finished report: memory → search → answer → verify,
// with one bounded loop (the answer step may ask for one more search). The same
// rules as the report: the model only sees excerpts that search found, every quote
// is checked in code against its source, and an answer with no grounded quote is
// replaced by a fixed "not shown" reply.
//
// Memory is compacted, not truncated: the last KEEP_VERBATIM turns stay word for
// word and everything older is folded into one short running summary.

import { cleanInput, isSafeProse, looksLikeInjection, oneLine } from "./guard.ts";
import { BudgetExhausted, Run, rec, recs } from "./metered.ts";
import type { RunDeps, Stamped, StepEvent, UsageEvent } from "./metered.ts";
import type { Report } from "./pipeline.ts";
import { answerUser, memoryUser } from "./prompts.ts";
import { groundQuotes } from "./quote.ts";
import type { DropReason, EvidenceOut } from "./quote.ts";
import { JsonStringStream, ScreenedText } from "./stream.ts";
import type { Action } from "./suggest.ts";
import type { Chunk } from "./types.ts";
import { SAY } from "./voice.ts";

export const MIN_QUESTION_CHARS = 8;
export const MAX_QUESTION_CHARS = 300;
export const KEEP_VERBATIM = 2;
export const MAX_ASK_ROUNDS = 2;
const TOP_K = 6;
const MAX_EVIDENCE = 3;
const MAX_ANSWER_CHARS = 700;
const MAX_SUMMARY_CHARS = 500;
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
  | { type: "retry"; search: string } // the answer step asked for one more search
  | { type: "verified"; quotes: number; dropped: number } // the code check on the answer's citations
  | { type: "dropped"; reason: DropReason }
  | { type: "delta"; text: string }
  | { type: "answer"; answer: Answer }; // authoritative: replaces any deltas

export type AskEvent = Stamped<OwnEvent | StepEvent | UsageEvent>;
export type AskDeps = RunDeps<AskEvent>;

const notShown = (): Answer => ({ kind: "not_shown", text: SAY.notShown, evidence: [], actions: ["email"] });
const offTopic = (): Answer => ({ kind: "off_topic", text: SAY.offTopic, evidence: [], actions: [] });

// Folds every turn but the last KEEP_VERBATIM into the running summary. If the
// model call fails or its text does not pass the screen, the old turns are still
// dropped (the context must stay bounded) and the previous summary is kept.
async function compact(memory: Memory, run: Run<OwnEvent>): Promise<{ memory: Memory; justCompacted: number }> {
  const old = memory.turns.slice(0, -KEEP_VERBATIM);
  if (old.length === 0) return { memory, justCompacted: 0 };
  let summary = memory.summary;
  try {
    const out = await run.call("memory", memoryUser(memory.summary, old));
    const s = typeof out.summary === "string" ? oneLine(out.summary, MAX_SUMMARY_CHARS) : "";
    if (s && isSafeProse(s)) summary = s;
  } catch (e) {
    if (e instanceof BudgetExhausted) throw e;
  }
  return { memory: { summary, compacted: memory.compacted + old.length, turns: memory.turns.slice(-KEEP_VERBATIM) }, justCompacted: old.length };
}

export async function runAsk(questionRaw: string, report: Report, remembered: Memory, deps: AskDeps): Promise<AskOutcome> {
  const question = cleanInput(questionRaw).slice(0, MAX_QUESTION_CHARS);
  const run = new Run<OwnEvent>(deps);
  let memory = remembered;
  const finish = (answer: Answer): AskOutcome => {
    run.emit({ type: "answer", answer });
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

    let found = search(question, 1);
    for (let round = 1; round <= MAX_ASK_ROUNDS; round++) {
      if (found.length === 0) break; // nothing to stand on: no model call spent

      // 3. One model call: is it in scope, which quotes answer it, and the answer in
      // prose. The prose streams only once the scope flag and the quotes, which come
      // first in the output, have been read and at least one quote has passed the check.
      const offered = found;
      let raw = "";
      let mayStream: boolean | undefined;
      const extract = new JsonStringStream("answer");
      const screened = new ScreenedText(isSafeProse, (text) => run.emit({ type: "delta", text }));
      const onText = (delta: string) => {
        raw += delta;
        const piece = extract.push(delta);
        if (!piece) return;
        mayStream ??= headAllowsStreaming(raw, (claimed) => groundQuotes(claimed, offered, MAX_EVIDENCE).length > 0);
        if (mayStream) screened.push(piece);
      };
      const out = await run.call("answer", answerUser(question, report, memory, offered, round < MAX_ASK_ROUNDS), { round, onText });

      // 4. Verify, in code: the authoritative answer.
      if (out.in_scope !== true) return finish(offTopic());
      let dropped = 0;
      const evidence = groundQuotes(recs(out.evidence), offered, MAX_EVIDENCE, (reason) => {
        dropped++;
        run.emit({ type: "dropped", reason });
      });
      run.emit({ type: "verified", quotes: evidence.length, dropped });
      if (evidence.length > 0) {
        const text = typeof out.answer === "string" ? out.answer.trim() : "";
        if (text && text.length <= MAX_ANSWER_CHARS && isSafeProse(text)) {
          screened.flush(text);
          return finish({ kind: "grounded", text, evidence, actions: [] });
        }
        // The prose failed the screen: the checked quotes still stand on their own.
        return finish({ kind: "grounded", text: SAY.quotesOnly, evidence, actions: ["email"] });
      }

      // 5. The loop: nothing grounded, but the answer step named a better search.
      const again = typeof out.search_again === "string" ? oneLine(out.search_again, MAX_SEARCH_CHARS) : "";
      if (round === MAX_ASK_ROUNDS || !again || !isSafeProse(again)) break;
      run.emit({ type: "retry", search: again });
      found = search(again, round + 1);
    }
    return finish(notShown());
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
