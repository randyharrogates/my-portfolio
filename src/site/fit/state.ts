// Everything the page shows is derived here from the frames the Worker streams.
// One reducer, so a live run, a cached run and a recorded replay all render the
// same way.

import type { Action, Answer, Evidence, Frame, MoveAction, Support, Totals, Verdict } from "./types.ts";

export interface Card {
  id: string;
  text: string;
  importance: string;
  search: string; // what the orchestrator told the retriever to look for
  chunks: string[];
  verdict?: Verdict;
  evidence: Evidence[];
  dropped: number;
  lowered: boolean;
  checks: { round: number; support: Support; reason: string }[]; // the verifier's findings
  retry?: { search: string; reason: string; improved?: boolean }; // sent back for a second search
}

// One box in the agent graph. A node may be called more than once (the
// orchestrator and the verifier each act in both rounds), so its numbers add up.
export interface GraphNode {
  key: string;
  state: "waiting" | "running" | "done" | "failed";
  calls: number;
  ms: number;
  tokens: number;
  costMicro: number;
  tools: string[]; // the functions this node's model calls invoked
  retries: number; // calls the provider turned away that were tried again
  waitMs: number; // the backoff wait in progress, 0 when there is none
}

// One move of the chat's orchestrator. `forced`: code made it, not the model.
export interface Move {
  turn: number;
  action: MoveAction;
  forced: boolean;
  why: string;
}

export interface Graph {
  kind: "run" | "chat";
  nodes: GraphNode[];
  round: number;
  looping: boolean; // the loop back is in progress
  looped: boolean; // the loop back was taken at least once
  moves: Move[]; // a question's loop: what the orchestrator did, turn by turn
  escalated: boolean; // a question's fast answer failed its checks and went to the researchers
}

export type ChatItem =
  | { from: "visitor"; text: string; note?: string }
  | { from: "agent"; text: string; note?: string; streaming?: boolean; answer?: Answer };

// What the last answer was given to work with: how much of the conversation, and what it cost.
export interface Context {
  kept: number; // turns word for word
  compacted: number; // older turns folded into the summary
  justCompacted: number;
  input: number;
  cached: number;
  excerpts: number;
  dropped: number;
}

// Why a run did not produce a report. Anything the Worker says that is not listed is shown as "failed".
export type Refusal = "not_a_job_description" | "budget_exhausted" | "failed" | "daily" | "burst" | "busy" | "slow_down" | "live_runs_off" | "network" | "report_expired" | "turnstile_failed";

export interface FitState {
  phase: "idle" | "running" | "done" | "refused";
  refusal?: Refusal;
  retryAfterSec: number;
  replay: boolean;
  cached: boolean;
  role: string;
  chat: ChatItem[];
  cards: Card[];
  tasks: Card[]; // the last question's researchers: one card per part of the question
  summaryFallback: boolean; // the summary was computed in code because the writer's was not usable
  run: Graph; // the report's loop
  question: Graph | null; // the last question's loop
  context: Context | null;
  totals: Totals;
  elapsedMs: number; // the time of the last frame; the live clock is the page's own
  summary: string;
  reportId: string | null;
  suggestions: string[];
  actions: Action[];
  runsLeft: number | null;
  questionsLeft: number | null;
  asking: boolean;
  askNote: string; // time, tokens and cost of the answer being written
}

const node = (key: string, state: GraphNode["state"] = "waiting"): GraphNode => ({ key, state, calls: 0, ms: 0, tokens: 0, costMicro: 0, tools: [], retries: 0, waitMs: 0 });
const graph = (kind: Graph["kind"], nodes: GraphNode[]): Graph => ({ kind, nodes, round: 1, looping: false, looped: false, moves: [], escalated: false });
const runGraph = (): Graph => graph("run", ["gate", "orchestrator", "verifier", "writer"].map((k) => node(k)));
const chatGraph = (): Graph => graph("chat", [node("memory", "running"), node("lead"), node("verifier"), node("answer"), node("verify")]);

// The workers an orchestrator hands to: a report's retrievers (r1…), a question's researchers (q1…),
// or the fast path's one search. They join the graph when the orchestrator names them.
export const isWorker = (n: { key: string }) => /^[rq]\d+$/.test(n.key) || n.key === "search";
const addWorker = (g: Graph, key: string, state: GraphNode["state"] = "waiting"): Graph => {
  if (g.nodes.some((n) => n.key === key)) return g;
  const at = g.nodes.findIndex((n) => n.key === "verifier");
  return { ...g, nodes: [...g.nodes.slice(0, at), node(key, state), ...g.nodes.slice(at)] };
};

// What each stage is, and who does it: a model call, plain code, or code around one model call.
export const NODE_NAMES: Record<string, { name: string; does: string; by: "model" | "code" | "code + model" }> = {
  gate: { name: "Gate", does: "is this a job description?", by: "code + model" },
  orchestrator: { name: "Orchestrator", does: "plans the work and directs the retrievers by function call", by: "model" },
  retriever: { name: "Retrievers", does: "search in code, then quote the evidence exactly", by: "code + model" },
  verifier: { name: "Verifier", does: "reads every quote and can lower a verdict", by: "model" },
  writer: { name: "Writer", does: "streams the summary", by: "model" },
  memory: { name: "Memory", does: "keeps the conversation small", by: "code + model" },
  lead: { name: "Orchestrator", does: "picks the next move by function call, every turn", by: "model" },
  search: { name: "Search", does: "one keyword search, in code", by: "code" },
  researcher: { name: "Researchers", does: "search in code, then quote the evidence exactly", by: "code + model" },
  answer: { name: "Writer", does: "writes from the quotes only", by: "model" },
  verify: { name: "Check", does: "every quote against its page, then a confidence score", by: "code" },
};

export const initial: FitState = {
  phase: "idle",
  retryAfterSec: 0,
  replay: false,
  cached: false,
  role: "",
  chat: [],
  cards: [],
  tasks: [],
  summaryFallback: false,
  run: runGraph(),
  question: null,
  context: null,
  totals: { calls: 0, input: 0, cached: 0, output: 0, costMicro: 0 },
  elapsedMs: 0,
  summary: "",
  reportId: null,
  suggestions: [],
  actions: [],
  runsLeft: null,
  questionsLeft: null,
  asking: false,
  askNote: "",
};

export type Event =
  | { kind: "start"; jd: string; replay: boolean }
  | { kind: "frame"; frame: Frame }
  | { kind: "ask"; question: string }
  | { kind: "refuse"; refusal: string; retryAfterSec: number }
  | { kind: "reset" };

export const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
export const cost = (micro: number) => `$${(micro / 1e6).toFixed(micro < 1000 ? 5 : 4)}`;

type StepFrame = Extract<Frame, { type: "step" }>;
type OutcomeFrame = Extract<Frame, { type: "outcome" }>;

const patch = <T extends { id: string }>(list: T[], id: string, change: (item: T) => T) => list.map((x) => (x.id === id ? change(x) : x));
// A worker's news goes to its card: a question's researchers while one is being answered, the report's retrievers otherwise.
const work = (s: FitState, id: string, change: (c: Card) => Card): FitState => (s.asking ? { ...s, tasks: patch(s.tasks, id, change) } : { ...s, cards: patch(s.cards, id, change) });

const setNode = (g: Graph, key: string, change: (n: GraphNode) => GraphNode): Graph => ({ ...g, nodes: g.nodes.map((n) => (n.key === key ? change(n) : n)) });
const mark = (g: Graph, key: string, state: GraphNode["state"]): Graph => setNode(g, key, (n) => ({ ...n, state }));
const settleGraph = (g: Graph): Graph => ({ ...g, looping: false, nodes: g.nodes.map((n) => (n.state === "running" ? { ...n, state: "done" } : n)) });

// Adds text to the agent bubble that is being written, or starts one.
function streamInto(chat: ChatItem[], text: string, note: string): ChatItem[] {
  const last = chat[chat.length - 1];
  if (last?.from === "agent" && last.streaming) return [...chat.slice(0, -1), { ...last, text: last.text + text }];
  return [...chat, { from: "agent", text, note, streaming: true }];
}

// Replaces the bubble being written with its final form, or adds it if nothing streamed.
function settle(chat: ChatItem[], item: ChatItem): ChatItem[] {
  const last = chat[chat.length - 1];
  return last?.from === "agent" && last.streaming ? [...chat.slice(0, -1), item] : [...chat, item];
}

// Which node a model call belongs to. The orchestrator's two moves are one node,
// and each retriever or researcher is its own.
const nodeOf = (f: StepFrame) => (f.step === "replan" ? "orchestrator" : f.step === "retriever" ? (f.id ?? "") : f.step);

function applyStep(s: FitState, f: StepFrame): FitState {
  const key = nodeOf(f);
  const update = (g: Graph): Graph =>
    setNode({ ...g, round: Math.max(g.round, f.round ?? 1) }, key, (n) => {
      if (f.state === "start") return { ...n, state: "running", waitMs: 0 };
      if (f.state === "retrying") return { ...n, state: "running", retries: n.retries + 1, waitMs: f.waitMs ?? 0 };
      return { ...n, state: f.state, waitMs: 0, calls: n.calls + 1, ms: n.ms + (f.ms ?? 0), tokens: n.tokens + (f.usage ? f.usage.input + f.usage.output : 0), costMicro: n.costMicro + (f.costMicro ?? 0), tools: f.tool ? [...n.tools, f.tool] : n.tools };
    });
  if (!s.asking) {
    let run = update(s.run);
    // The writer starting means the loop is over, whichever way it went.
    if (f.step === "writer" && f.state === "start") run = { ...run, looping: false };
    return { ...s, run };
  }
  if (!s.question) return s;
  let question = update(s.question);
  // The writer starting means the loop is over; once it has written, code checks what it wrote.
  if (f.step === "answer" && f.state === "start") question = { ...question, looping: false };
  if (f.step === "answer" && f.state === "done") question = mark(question, "verify", "running");
  const ctx = s.context;
  const context = f.state === "done" && f.usage && ctx ? { ...ctx, input: ctx.input + f.usage.input, cached: ctx.cached + f.usage.cached } : ctx;
  const asked = question.nodes.reduce((sum, n) => ({ calls: sum.calls + n.calls, ms: sum.ms + n.ms, tokens: sum.tokens + n.tokens, costMicro: sum.costMicro + n.costMicro }), { calls: 0, ms: 0, tokens: 0, costMicro: 0 });
  const askNote = asked.calls ? `${asked.calls} ${asked.calls === 1 ? "call" : "calls"} · ${asked.tokens.toLocaleString()} tokens · est. ${cost(asked.costMicro)}` : "";
  return { ...s, question, context, askNote };
}

function applyOutcome(s: FitState, f: OutcomeFrame): FitState {
  if ("questionsLeft" in f) {
    const answered = f.outcome.status === "answered";
    const sorry = f.outcome.status === "budget_exhausted" ? ASK_REFUSALS.live_runs_off : ASK_REFUSALS.failed;
    return {
      ...s,
      asking: false,
      askNote: "",
      question: s.question && settleGraph(s.question),
      questionsLeft: f.questionsLeft,
      suggestions: answered ? f.suggestions : s.suggestions,
      chat: answered ? s.chat : settle(s.chat, { from: "agent", text: sorry, note: "not answered" }),
    };
  }
  if (f.outcome.status !== "done") return { ...s, phase: "refused", refusal: f.outcome.status, runsLeft: f.runsLeft };
  return { ...s, phase: "done", run: settleGraph(s.run), cached: f.cached, reportId: f.reportId, suggestions: f.suggestions, actions: f.actions, runsLeft: f.runsLeft };
}

function applyFrame(prev: FitState, f: Frame): FitState {
  // A question's frames are timed from when it was asked, so they leave the run's clock alone.
  const s = prev.asking ? prev : { ...prev, elapsedMs: Math.max(prev.elapsedMs, f.t ?? 0) };
  const at = seconds(f.t ?? s.elapsedMs);
  switch (f.type) {
    case "say":
      return { ...s, chat: [...s.chat, { from: "agent", text: f.text, note: at }] };
    case "plan": {
      // The retrievers join the graph once the orchestrator has named them.
      const [gate, orchestrator, ...rest] = s.run.nodes.filter((n) => !isWorker(n));
      return {
        ...s,
        role: f.role,
        cards: f.requirements.map((r) => ({ id: r.id, text: r.text, importance: r.importance, search: r.search ?? "", chunks: [], evidence: [], dropped: 0, lowered: false, checks: [] })),
        run: { ...s.run, nodes: [gate, orchestrator, ...f.requirements.map((r) => node(r.id)), ...rest] },
      };
    }
    case "retrieved":
      return work(s, f.id, (c) => ({ ...c, chunks: f.chunks.map((x) => x.title) }));
    case "verdict":
      return work(s, f.id, (c) => ({ ...c, verdict: f.verdict, evidence: f.evidence, retry: c.retry && s.asking ? { ...c.retry, improved: f.verdict !== "gap" && f.verdict !== c.verdict } : c.retry }));
    case "checked":
      return work(s, f.id, (c) => ({ ...c, checks: [...c.checks, { round: f.round, support: f.support, reason: f.reason }] }));
    case "retry":
      return { ...s, run: { ...s.run, looping: true, looped: true, round: 2 }, cards: patch(s.cards, f.id, (c) => ({ ...c, retry: { search: f.search, reason: f.reason ?? "" } })) };
    case "move": {
      if (!s.question) return s;
      const q = s.question;
      const escalated = q.escalated || (f.turn > 1 && q.moves.some((m) => m.action === "direct"));
      let question: Graph = { ...q, round: f.turn, escalated, moves: [...q.moves, { turn: f.turn, action: f.action, forced: f.forced === true, why: f.why ?? "" }] };
      if (f.action === "direct") question = addWorker(question, "search", "running");
      // A draft that was being shown and did not pass its checks is taken back: the next one replaces it.
      const last = s.chat[s.chat.length - 1];
      return { ...s, question, chat: last?.from === "agent" && last.streaming ? s.chat.slice(0, -1) : s.chat };
    }
    case "task": {
      if (!s.question) return s;
      const fresh: Card = { id: f.id, text: f.focus, importance: "", search: f.search, chunks: [], evidence: [], dropped: 0, lowered: false, checks: [] };
      const tasks = f.again ? patch(s.tasks, f.id, (c) => ({ ...c, retry: { search: f.search, reason: "" } })) : [...s.tasks, fresh];
      const again = f.again || s.question.escalated;
      return { ...s, tasks, question: { ...addWorker(s.question, f.id), looping: again, looped: s.question.looped || again } };
    }
    case "retried":
      return { ...s, cards: patch(s.cards, f.id, (c) => (c.retry ? { ...c, retry: { ...c.retry, improved: f.improved } } : c)) };
    case "memory": {
      if (!s.question) return s;
      const question = mark(s.question, "memory", "done");
      return { ...s, question, context: { kept: f.kept, compacted: f.compacted, justCompacted: f.justCompacted, input: 0, cached: 0, excerpts: 0, dropped: 0 } };
    }
    case "searched":
      return s.question ? { ...s, question: mark(s.question, "search", "done"), context: s.context && { ...s.context, excerpts: f.chunks.length } } : s;
    case "verified":
      return s.question ? { ...s, question: mark(s.question, "verify", "done"), context: s.context && { ...s.context, dropped: s.context.dropped + f.dropped } } : s;
    case "dropped": {
      const id = f.id;
      if (!id) return s; // a quote dropped while answering a question: the answer itself reports it
      const quote = f.reason !== "verifier_lowered" && f.reason !== "no_evidence";
      return work(s, id, (c) => ({ ...c, dropped: c.dropped + Number(quote), lowered: c.lowered || f.reason === "verifier_lowered" }));
    }
    case "step":
      return applyStep(s, f);
    case "delta":
      return { ...s, chat: streamInto(s.chat, f.text, s.asking ? "answering" : "summary") };
    case "summary":
      return { ...s, summary: f.text, summaryFallback: f.fallback === true, chat: settle(s.chat, { from: "agent", text: f.text, note: `summary · ${at}` }) };
    case "answer":
      return { ...s, chat: settle(s.chat, { from: "agent", text: f.answer.text, note: s.askNote || undefined, answer: f.answer }) };
    case "usage": {
      if (s.asking) return s;
      const { type: _type, t: _t, ...totals } = f;
      return { ...s, totals };
    }
    case "outcome":
      return applyOutcome(s, f);
  }
}

const RUN_REFUSALS = new Set<string>(["not_a_job_description", "budget_exhausted", "daily", "burst", "busy", "slow_down", "live_runs_off", "network", "report_expired", "turnstile_failed"]);

export function reduce(s: FitState, e: Event): FitState {
  switch (e.kind) {
    case "start":
      return { ...initial, run: runGraph(), phase: "running", replay: e.replay, runsLeft: s.runsLeft, questionsLeft: s.questionsLeft, chat: [{ from: "visitor", text: e.jd, note: `job description · ${e.jd.length.toLocaleString()} characters` }] };
    case "frame":
      return applyFrame(s, e.frame);
    case "ask":
      return { ...s, asking: true, askNote: "", suggestions: [], question: chatGraph(), tasks: [], context: null, chat: [...s.chat, { from: "visitor", text: e.question }] };
    case "refuse":
      if (s.asking) return { ...s, asking: false, question: s.question && settleGraph(s.question), chat: [...s.chat, { from: "agent", text: ASK_REFUSALS[e.refusal] ?? ASK_REFUSALS.failed, note: "not answered" }] };
      return { ...s, phase: "refused", refusal: RUN_REFUSALS.has(e.refusal) ? (e.refusal as Refusal) : "failed", retryAfterSec: e.retryAfterSec };
    case "reset":
      return { ...initial, run: runGraph(), runsLeft: s.runsLeft, questionsLeft: s.questionsLeft };
  }
}

const ASK_REFUSALS: Record<string, string> & { failed: string; live_runs_off: string } = {
  daily: "That's today's 10 questions used. They reset at midnight UTC. Email me and I'll answer the rest myself.",
  burst: "One question every 5 seconds. Give it a moment and ask again.",
  busy: "I'm still answering the last one.",
  slow_down: "Too many requests at once. Give it a few seconds.",
  live_runs_off: "Live answers are paused: this month's budget is used up.",
  report_expired: "This report is more than a day old, so I can't take questions on it. Run the job description again.",
  no_visitor: "This report is more than a day old, so I can't take questions on it. Run the job description again.",
  network: "I couldn't reach the server. Check your connection and ask again.",
  failed: "That answer failed. Try asking again.",
};
