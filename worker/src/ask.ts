// Follow-up questions about a finished report, answered by a small team under an
// orchestrator (the "lead"). The lead never answers. On each turn it must call one
// function, code carries the move out, and the result comes back to it:
//
//   decline              → a fixed refusal
//   answer_directly      → the fast path: one search in code, then the answer agent
//   dispatch_researchers → researchers in parallel, then the verifier
//   write_answer         → the answer agent writes from the verified findings
//
// What a model decides and what code decides is deliberate. A model chooses the
// route, picks the quotes and writes the prose. Code runs every search, checks every
// quote against its source, bounds the loop, scores the confidence, and takes over
// when a model fails: a lead that cannot be reached falls back to the fast path, a
// fast answer that fails a check is escalated to the researchers, a writer that fails
// leaves the verified quotes standing on their own, and an answer with no checked
// quote is replaced by a fixed "not shown" reply.
//
// Bounds, all in code: MAX_TURNS lead turns and MAX_ASK_CALLS model calls per
// question (one more when memory compacts). A move that no longer fits is not offered.
//
// Memory is compacted, not truncated: the last KEEP_VERBATIM turns stay word for
// word and everything older is folded into one short running summary. Compaction
// waits until COMPACT_AT turns are held, so it costs one model call every other
// question, not one per question. Refused questions are never remembered.

import { cleanInput, clip, isSafeMemory, isSafeProse, looksLikeInjection, oneLine } from "./guard.ts";
import { BudgetExhausted, Run, rec, recs } from "./metered.ts";
import type { Move, RunDeps, Stamped, StepEvent, UsageEvent } from "./metered.ts";
import type { Report } from "./pipeline.ts";
import { LEAD_RULES, LEAD_TOOLS, answerRules, answerUser, leadUser, memoryUser } from "./prompts.ts";
import type { TaskNote } from "./prompts.ts";
import { groundQuotes } from "./quote.ts";
import type { DropReason, EvidenceOut } from "./quote.ts";
import { JsonStringStream, ScreenedText } from "./stream.ts";
import type { Action } from "./suggest.ts";
import type { Chunk } from "./types.ts";
import { SAY } from "./voice.ts";
import { RANK, retrieve, shown, verify } from "./workers.ts";
import type { Check, Verdict, WorkerEvent } from "./workers.ts";

export const MIN_QUESTION_CHARS = 8;
export const MAX_QUESTION_CHARS = 300;
export const KEEP_VERBATIM = 2;
export const COMPACT_AT = 4;
const MAX_HELD = 6; // if compaction keeps failing, turns beyond this are dropped unsummarised
export const MAX_TURNS = 3; // lead turns per question
export const MAX_TASKS = 3; // researchers per dispatch
export const MAX_ASK_CALLS = 9; // model calls per question, memory aside
const TOP_K = 6;
const MAX_EVIDENCE = 3;
const MAX_ANSWER_CHARS = 700;
const MAX_SUMMARY_CHARS = 700;
const MAX_SEARCH_CHARS = 120;
const MAX_FOCUS_CHARS = 120;
const HIGH = 0.8; // a fast answer must score this to stand without the researchers
const MEDIUM = 0.5;

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

// How far an answer can be trusted, computed in code from the checks that were run:
// each quote the answer claimed (found in its source or not), its prose (passed the
// screen or not), and each researcher's task (supported, partly, or not).
export interface Confidence {
  score: number; // 0..1: checks passed over checks run
  level: "high" | "medium" | "low";
  passed: number;
  total: number;
  by: "code" | "code and verifier"; // who ran the checks
}

export interface Answer {
  kind: "grounded" | "not_shown" | "off_topic";
  text: string;
  evidence: EvidenceOut[];
  actions: Action[]; // chips the page offers under this answer
  path?: "direct" | "team"; // which route produced it
  confidence?: Confidence;
  caution?: string; // shown with a low-confidence answer: check it before relying on it
}

export type AskOutcome = { status: "answered"; answer: Answer; memory: Memory } | { status: "budget_exhausted" } | { status: "failed" };

type OwnEvent =
  | WorkerEvent
  | { type: "memory"; kept: number; compacted: number; justCompacted: number } // what the answer will be given
  // The lead's move on a turn. `forced`: code made it, because the lead failed or nothing else fitted the bounds.
  | { type: "move"; turn: number; action: "decline" | "direct" | "dispatch" | "write"; forced?: true; why?: string }
  | { type: "task"; id: string; focus: string; search: string; round: number; again: boolean } // one researcher's brief
  | { type: "verdict"; id: string; verdict: Verdict; evidence: EvidenceOut[] } // what that researcher's task stands at
  | { type: "searched"; round: number; chunks: { id: string; title: string }[] } // the fast path's one search
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

// One part of the question a researcher was sent to find, and where it stands.
interface Task {
  id: string; // q1, q2, …
  text: string; // the focus
  searched: string[]; // every set of keywords tried
  verdict: Verdict;
  evidence: EvidenceOut[];
  check?: Check; // the verifier's finding on the evidence it stands on
}

const outcomeOf = (t: Task) =>
  t.verdict === "gap" ? "nothing found" : !t.check ? "found, not verified" : t.check.support === "yes" ? "supported" : `partly supported${t.check.reason ? `: ${t.check.reason}` : ""}`;
const noteOf = (t: Task): TaskNote => ({ id: t.id, focus: t.text, searched: t.searched.join("; "), outcome: outcomeOf(t) });

// What the answer agent wrote, after the code checks.
type Draft =
  | { kind: "off_topic" }
  | { kind: "none"; claimed: number } // in scope, but no quote survived
  | { kind: "grounded"; text: string; evidence: EvidenceOut[]; claimed: number; proseOk: boolean; show?: () => void }; // `show`: sends whatever of the prose has not streamed yet

function confidenceOf(draft: Extract<Draft, { kind: "grounded" }>, tasks: Task[]): Confidence {
  const taskScore = (t: Task) => (t.verdict === "gap" ? 0 : t.check?.support === "yes" ? 1 : 0.5);
  const passed = draft.evidence.length + Number(draft.proseOk) + tasks.reduce((sum, t) => sum + taskScore(t), 0);
  const total = Math.max(draft.claimed, draft.evidence.length) + 1 + tasks.length;
  const score = Math.round((passed / total) * 100) / 100;
  return { score, level: score >= HIGH ? "high" : score >= MEDIUM ? "medium" : "low", passed, total, by: tasks.length ? "code and verifier" : "code" };
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
  const grounded = (draft: Extract<Draft, { kind: "grounded" }>, path: "direct" | "team", tasks: Task[]): Answer => {
    const confidence = confidenceOf(draft, tasks);
    const low = confidence.level === "low";
    if (draft.proseOk) draft.show?.(); // only a draft that is the final answer is shown in full
    // If the prose failed the screen, the checked quotes still stand on their own.
    return { kind: "grounded", text: draft.proseOk ? draft.text : SAY.quotesOnly, evidence: draft.evidence, actions: low || !draft.proseOk ? ["email"] : [], path, confidence, ...(low ? { caution: SAY.checkThis } : {}) };
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

    const rules = answerRules(deps.index.profile);
    let calls = 0; // model calls made for this question, memory aside

    // The answer agent: picks quotes from the excerpts it is given and writes from them.
    // Its prose streams only once the scope flag and the quotes, which come first in the
    // reply, have been read and `mayShow` accepts them.
    async function write(offered: Chunk[], notes: TaskNote[], round: number, mayShow: (claimed: number, kept: number) => boolean): Promise<Draft> {
      let raw = "";
      let streams: boolean | undefined;
      const extract = new JsonStringStream("answer");
      const screened = new ScreenedText(isSafeProse, (text) => run.emit({ type: "delta", text }));
      const onText = (delta: string) => {
        raw += delta;
        const piece = extract.push(delta);
        if (!piece) return;
        streams ??= headAllowsStreaming(raw, (claimed) => mayShow(claimed.length, groundQuotes(claimed, offered, MAX_EVIDENCE).length));
        if (streams) screened.push(piece);
      };
      calls++;
      const out = await run.call("answer", answerUser(question, report, memory, offered, notes), { round, rules, onText });
      if (out.in_scope !== true) return { kind: "off_topic" };
      const claimed = recs(out.evidence);
      let dropped = 0;
      const evidence = groundQuotes(claimed, offered, MAX_EVIDENCE, (reason) => {
        dropped++;
        run.emit({ type: "dropped", reason });
      });
      run.emit({ type: "verified", quotes: evidence.length, dropped });
      if (evidence.length === 0) return { kind: "none", claimed: claimed.length };
      const text = typeof out.answer === "string" ? out.answer.trim() : "";
      const proseOk = text !== "" && text.length <= MAX_ANSWER_CHARS && isSafeProse(text);
      return { kind: "grounded", text, evidence, claimed: claimed.length, proseOk, show: () => screened.flush(text) };
    }

    // The fast path: one search in code. Excerpts cited in the previous turn stay on the
    // table, so "tell me more about that" has something to stand on.
    async function direct(search: string): Promise<Draft> {
      const found = deps.index.offer(search ? `${question} ${search}` : question, TOP_K);
      for (const id of memory.turns.at(-1)?.chunkIds ?? []) {
        const c = deps.byId.get(id);
        if (c && !found.includes(c)) found.push(c);
      }
      run.emit({ type: "searched", round: 1, chunks: found.map((c) => ({ id: c.id, title: c.title })) });
      if (found.length === 0) return { kind: "none", claimed: 0 }; // nothing to stand on: no model call spent
      // Shown as it is written only if every quote it claims is real: anything less goes to the researchers.
      return write(found, [], 1, (claimed, kept) => kept > 0 && kept === claimed);
    }

    // Researchers in parallel, then the verifier. A task sent back keeps its better result.
    const tasks: Task[] = [];
    async function dispatch(args: Record<string, unknown>, turn: number, room: number): Promise<boolean> {
      // A brief that names a task already on the list sends that researcher back; any other is a new task.
      const briefs: { task: Task; search: string; again: boolean }[] = [];
      let next = tasks.length;
      for (const t of recs(args.tasks)) {
        const focus = shown(t.focus, MAX_FOCUS_CHARS);
        const again = tasks.find((x) => x.id === t.id);
        if (briefs.length >= Math.min(MAX_TASKS, room) || (!again && !focus) || briefs.some((b) => b.task === again)) continue;
        briefs.push({ task: again ?? { id: `q${++next}`, text: focus, searched: [], verdict: "gap", evidence: [] }, search: shown(t.search, MAX_SEARCH_CHARS), again: again !== undefined });
      }
      if (briefs.length === 0) return false;
      for (const b of briefs) {
        if (!b.again) tasks.push(b.task);
        b.task.searched.push(b.search || b.task.text);
        run.emit({ type: "task", id: b.task.id, focus: b.task.text, search: b.search, round: turn, again: b.again });
      }
      calls += briefs.length;
      const found = await Promise.all(briefs.map((b) => retrieve(run, deps.index, b.task, b.search ? `${b.task.text} ${b.search}` : b.task.text, turn)));
      const candidates = briefs.map((b, i) => ({ id: b.task.id, text: b.task.text, verdict: found[i].verdict, evidence: found[i].evidence }));
      let checks = new Map<string, Check>();
      if (candidates.some((c) => c.verdict !== "gap")) {
        calls++;
        try {
          checks = await verify(run, candidates, turn);
        } catch (e) {
          if (e instanceof BudgetExhausted) throw e;
          // a failed verifier leaves the findings unverified, which the confidence score counts against them
        }
      }
      for (const [i, b] of briefs.entries()) {
        const c = candidates[i];
        // New evidence replaces the old only when it survived the same checks and is stronger.
        if (!b.again || RANK[c.verdict] > RANK[b.task.verdict]) Object.assign(b.task, { verdict: c.verdict, evidence: c.evidence, check: checks.get(c.id) });
        run.emit({ type: "verdict", id: b.task.id, verdict: b.task.verdict, evidence: b.task.evidence });
      }
      return true;
    }

    // 2. The loop. The lead moves, code carries the move out, and the lead is asked again
    // for as long as it still has a real choice to make.
    let fast: Draft | null = null; // what the fast path produced, if it was tried
    let happened = "";
    for (let turn = 1; turn <= MAX_TURNS; turn++) {
      // A dispatch needs the lead, at least one researcher, the verifier and the writer.
      const room = MAX_ASK_CALLS - calls - 3;
      if (turn > 1 && room < 1) {
        run.emit({ type: "move", turn, action: "write", forced: true, why: "the call limit leaves room for the writer only" });
        break;
      }
      const offered = turn === 1 ? [LEAD_TOOLS.direct, LEAD_TOOLS.dispatch, LEAD_TOOLS.decline] : [LEAD_TOOLS.dispatch, LEAD_TOOLS.write];
      let move: Move;
      let forced: string | undefined;
      calls++;
      try {
        move = await run.move("lead", leadUser(question, report, memory, tasks.map(noteOf), happened, Math.min(MAX_TASKS, room)), { round: turn, rules: LEAD_RULES, tools: offered });
      } catch (e) {
        if (e instanceof BudgetExhausted) throw e;
        // The lead could not be reached. Code takes the safest move left: the fast path
        // on the first turn, the writer with what there is afterwards.
        forced = "the orchestrator did not answer";
        move = { name: turn === 1 ? LEAD_TOOLS.direct.name : LEAD_TOOLS.write.name, args: {} };
      }
      const tell = (action: "decline" | "direct" | "dispatch" | "write", why = forced) => run.emit({ type: "move", turn, action, ...(why ? { forced: true as const, why } : {}) });

      if (move.name === LEAD_TOOLS.decline.name && turn === 1) {
        tell("decline");
        return finish(offTopic());
      }
      if (move.name === LEAD_TOOLS.direct.name && turn === 1) {
        tell("direct");
        try {
          fast = await direct(shown(move.args.search, MAX_SEARCH_CHARS));
        } catch (e) {
          if (e instanceof BudgetExhausted) throw e;
          fast = { kind: "none", claimed: 0 }; // the answer agent failed: the researchers are the way on
        }
        if (fast.kind === "off_topic") return finish(offTopic());
        if (fast.kind === "grounded" && confidenceOf(fast, []).score >= HIGH) return finish(grounded(fast, "direct", []));
        happened = "The fast path was tried and its answer did not pass the checks: " + (fast.kind === "none" ? "no quote was found in the pages it cited." : "some of its quotes were not in the pages it cited.");
        continue;
      }
      if (move.name === LEAD_TOOLS.dispatch.name) {
        tell("dispatch");
        if (await dispatch(move.args, turn, room)) {
          happened = "Researchers reported and the verifier checked what they found.";
          continue;
        }
        // a dispatch with no usable task: nothing was done, so there is nothing new to decide on
      } else {
        tell("write");
      }
      break;
    }

    // 3. The writer, then the last word in code.
    const supported = tasks.filter((t) => t.verdict !== "gap");
    if (supported.length > 0) {
      const chunks = [...new Set(supported.flatMap((t) => t.evidence.map((e) => e.chunkId)))].map((id) => deps.byId.get(id)).filter((c): c is Chunk => c !== undefined);
      let draft: Draft;
      try {
        draft = await write(chunks, tasks.map(noteOf), 2, (_claimed, kept) => kept > 0);
      } catch (e) {
        if (e instanceof BudgetExhausted) throw e;
        // The writer failed. The quotes the researchers found and the verifier read still
        // stand, so they are shown on their own, with no prose.
        // Two researchers can return the same passage: show it once.
        const seen = new Set<string>();
        const evidence = supported.flatMap((t) => t.evidence).filter((e) => !seen.has(e.chunkId + e.quote) && seen.add(e.chunkId + e.quote)).slice(0, MAX_EVIDENCE);
        draft = { kind: "grounded", text: "", evidence, claimed: evidence.length, proseOk: false };
      }
      if (draft.kind === "grounded") return finish(grounded(draft, "team", tasks));
    }
    // Nothing better came of the researchers: the fast answer stands if it has a checked
    // quote, marked for what it is. Otherwise nothing is claimed.
    if (fast?.kind === "grounded") return finish(grounded(fast, "direct", tasks));
    return finish(notShown());
  } catch (e) {
    return { status: e instanceof BudgetExhausted ? "budget_exhausted" : "failed" };
  }
}

// Reads the part of the reply that precedes the prose (`{"in_scope":…,"evidence":[…]`)
// while the reply is still arriving, and says whether the prose may be shown as it streams.
function headAllowsStreaming(raw: string, quotesAllow: (claimed: Record<string, unknown>[]) => boolean): boolean {
  const proseStart = /,\s*"answer"\s*:\s*"/.exec(raw);
  if (!proseStart) return false;
  try {
    const head = rec(JSON.parse(`${raw.slice(0, proseStart.index)}}`));
    return head !== null && head.in_scope === true && quotesAllow(recs(head.evidence));
  } catch {
    return false; // unparseable so far: nothing streams, the final check decides
  }
}
