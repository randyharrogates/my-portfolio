// Follow-up questions about a finished report. One search and at most one model
// call per question. The same rules as the report: the model only sees excerpts
// that search found, every quote is checked in code against its source, and an
// answer with no grounded quote is replaced by a fixed "not shown" reply.

import { cleanInput, isSafeProse, looksLikeInjection } from "./guard.ts";
import { BudgetExhausted, Run, rec, recs } from "./metered.ts";
import type { RunDeps, Stamped, StepEvent, UsageEvent } from "./metered.ts";
import type { Report } from "./pipeline.ts";
import { answerUser } from "./prompts.ts";
import { groundQuotes } from "./quote.ts";
import type { DropReason, EvidenceOut } from "./quote.ts";
import { JsonStringStream, ScreenedText } from "./stream.ts";
import type { Action } from "./suggest.ts";
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

export interface Answer {
  kind: "grounded" | "not_shown" | "off_topic";
  text: string;
  evidence: EvidenceOut[];
  actions: Action[]; // chips the page offers under this answer
}

export type AskOutcome = { status: "answered"; answer: Answer } | { status: "budget_exhausted" } | { status: "failed" };

type OwnEvent =
  | { type: "dropped"; reason: DropReason }
  | { type: "delta"; text: string }
  | { type: "answer"; answer: Answer }; // authoritative: replaces any deltas

export type AskEvent = Stamped<OwnEvent | StepEvent | UsageEvent>;
export type AskDeps = RunDeps<AskEvent>;

const notShown = (): Answer => ({ kind: "not_shown", text: SAY.notShown, evidence: [], actions: ["email"] });
const offTopic = (): Answer => ({ kind: "off_topic", text: SAY.offTopic, evidence: [], actions: [] });

export async function runAsk(questionRaw: string, report: Report, history: Turn[], deps: AskDeps): Promise<AskOutcome> {
  const question = cleanInput(questionRaw).slice(0, MAX_QUESTION_CHARS);
  const run = new Run<OwnEvent>(deps);
  const finish = (answer: Answer): AskOutcome => {
    run.emit({ type: "answer", answer });
    return { status: "answered", answer };
  };

  // 0. A question that addresses the model instead of asking about the work is
  // refused in code: no search, no model call, nothing spent.
  if (looksLikeInjection(question)) return finish(offTopic());

  // 1. Search, in code. Excerpts cited in the previous turn stay on the table, so
  // "tell me more about that" has something to stand on.
  const found = deps.index.offer(question, TOP_K);
  for (const id of history.at(-1)?.chunkIds ?? []) {
    const c = deps.byId.get(id);
    if (c && !found.includes(c)) found.push(c);
  }
  if (found.length === 0) return finish(notShown()); // no model call spent

  // 2. One model call: is it in scope, which quotes answer it, and the answer in
  // prose. The prose streams only once the scope flag and the quotes, which come
  // first in the output, have been read and at least one quote has passed the check.
  let raw = "";
  let mayStream: boolean | undefined;
  const extract = new JsonStringStream("answer");
  const screened = new ScreenedText(isSafeProse, (text) => run.emit({ type: "delta", text }));
  const onText = (delta: string) => {
    raw += delta;
    const piece = extract.push(delta);
    if (!piece) return;
    mayStream ??= headAllowsStreaming(raw, (claimed) => groundQuotes(claimed, found, MAX_EVIDENCE).length > 0);
    if (mayStream) screened.push(piece);
  };

  let out: Record<string, unknown>;
  try {
    out = await run.call("answer", answerUser(question, report, history.slice(-MAX_TURNS_REMEMBERED), found), { onText });
  } catch (e) {
    return { status: e instanceof BudgetExhausted ? "budget_exhausted" : "failed" };
  }

  // 3. The authoritative answer, decided in code.
  if (out.in_scope !== true) return finish(offTopic());
  const evidence = groundQuotes(recs(out.evidence), found, MAX_EVIDENCE, (reason) => run.emit({ type: "dropped", reason }));
  if (evidence.length === 0) return finish(notShown());
  const text = typeof out.answer === "string" ? out.answer.trim() : "";
  if (text && text.length <= MAX_ANSWER_CHARS && isSafeProse(text)) {
    screened.flush(text);
    return finish({ kind: "grounded", text, evidence, actions: [] });
  }
  // The prose failed the screen: the checked quotes still stand on their own.
  return finish({ kind: "grounded", text: SAY.quotesOnly, evidence, actions: ["email"] });
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
