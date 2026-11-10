// Everything the page shows is derived here from the frames the Worker streams.
// One reducer, so a live run, a cached run and a recorded replay all render the
// same way.

import type { Action, Answer, Evidence, Frame, Support, Totals, Verdict } from "./types.ts";

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
}

export interface Graph {
  kind: "run" | "chat";
  nodes: GraphNode[];
  round: number;
  looping: boolean; // the loop back is in progress
  looped: boolean; // the loop back was taken at least once
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

const node = (key: string, state: GraphNode["state"] = "waiting"): GraphNode => ({ key, state, calls: 0, ms: 0, tokens: 0, costMicro: 0 });
const runGraph = (): Graph => ({ kind: "run", nodes: ["gate", "orchestrator", "verifier", "writer"].map((k) => node(k)), round: 1, looping: false, looped: false });
const chatGraph = (): Graph => ({ kind: "chat", nodes: [node("question", "done"), node("memory", "running"), node("search"), node("answer"), node("verify")], round: 1, looping: false, looped: false });

export const NODE_NAMES: Record<string, { name: string; does: string }> = {
  gate: { name: "Gate", does: "is this a job description?" },
  orchestrator: { name: "Orchestrator", does: "plans the work and decides what to retry" },
  retriever: { name: "Retrievers", does: "search my pages and quote the evidence exactly" },
  verifier: { name: "Verifier", does: "checks every citation, can send one back" },
  writer: { name: "Writer", does: "streams the summary" },
  question: { name: "Question", does: "what you asked" },
  memory: { name: "Memory", does: "keeps the conversation small" },
  search: { name: "Search", does: "finds excerpts in my pages" },
  answer: { name: "Answer", does: "writes from the quotes only" },
  verify: { name: "Verify", does: "checks each quote against its page" },
};

export const initial: FitState = {
  phase: "idle",
  retryAfterSec: 0,
  replay: false,
  cached: false,
  role: "",
  chat: [],
  cards: [],
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
// and each retriever is its own.
const nodeOf = (f: StepFrame) => (f.step === "replan" ? "orchestrator" : f.step === "retriever" ? (f.id ?? "") : f.step);

function applyStep(s: FitState, f: StepFrame): FitState {
  const key = nodeOf(f);
  const update = (g: Graph): Graph =>
    setNode({ ...g, round: Math.max(g.round, f.round ?? 1) }, key, (n) =>
      f.state === "start"
        ? { ...n, state: "running" }
        : { ...n, state: f.state, calls: n.calls + 1, ms: n.ms + (f.ms ?? 0), tokens: n.tokens + (f.usage ? f.usage.input + f.usage.output : 0), costMicro: n.costMicro + (f.costMicro ?? 0) },
    );
  if (!s.asking) {
    let run = update(s.run);
    // The writer starting means the loop is over, whichever way it went.
    if (f.step === "writer" && f.state === "start") run = { ...run, looping: false };
    return { ...s, run };
  }
  if (!s.question) return s;
  let question = update(s.question);
  if (f.step === "answer" && f.state === "done") question = mark(question, "verify", "running");
  const ctx = s.context;
  const context = f.step === "answer" && f.state === "done" && f.usage && ctx ? { ...ctx, input: ctx.input + f.usage.input, cached: ctx.cached + f.usage.cached } : ctx;
  const asked = question.nodes.reduce((sum, n) => ({ calls: sum.calls + n.calls, ms: sum.ms + n.ms, tokens: sum.tokens + n.tokens, costMicro: sum.costMicro + n.costMicro }), { calls: 0, ms: 0, tokens: 0, costMicro: 0 });
  const askNote = asked.calls ? `${asked.calls} ${asked.calls === 1 ? "call" : "calls"} · ${seconds(asked.ms)} · ${asked.tokens.toLocaleString()} tokens · est. ${cost(asked.costMicro)}` : "";
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
      const [gate, orchestrator, ...rest] = s.run.nodes.filter((n) => !/^r\d+$/.test(n.key));
      return {
        ...s,
        role: f.role,
        cards: f.requirements.map((r) => ({ id: r.id, text: r.text, importance: r.importance, search: r.search ?? "", chunks: [], evidence: [], dropped: 0, lowered: false, checks: [] })),
        run: { ...s.run, nodes: [gate, orchestrator, ...f.requirements.map((r) => node(r.id)), ...rest] },
      };
    }
    case "retrieved":
      return { ...s, cards: patch(s.cards, f.id, (c) => ({ ...c, chunks: f.chunks.map((x) => x.title) })) };
    case "verdict":
      return { ...s, cards: patch(s.cards, f.id, (c) => ({ ...c, verdict: f.verdict, evidence: f.evidence })) };
    case "checked":
      return { ...s, cards: patch(s.cards, f.id, (c) => ({ ...c, checks: [...c.checks, { round: f.round, support: f.support, reason: f.reason }] })) };
    case "retry": {
      const id = f.id;
      if (id === undefined) {
        // a question: the answer step asked for one more search
        return s.question ? { ...s, question: mark(mark({ ...s.question, looping: true, looped: true, round: 2 }, "search", "running"), "verify", "done") } : s;
      }
      return { ...s, run: { ...s.run, looping: true, looped: true, round: 2 }, cards: patch(s.cards, id, (c) => ({ ...c, retry: { search: f.search, reason: f.reason ?? "" } })) };
    }
    case "retried":
      return { ...s, cards: patch(s.cards, f.id, (c) => (c.retry ? { ...c, retry: { ...c.retry, improved: f.improved } } : c)) };
    case "memory": {
      if (!s.question) return s;
      const question = mark(mark(s.question, "memory", "done"), "search", "running");
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
      return { ...s, cards: patch(s.cards, id, (c) => ({ ...c, dropped: c.dropped + Number(quote), lowered: c.lowered || f.reason === "verifier_lowered" })) };
    }
    case "step":
      return applyStep(s, f);
    case "delta":
      return { ...s, chat: streamInto(s.chat, f.text, s.asking ? "answering" : "summary") };
    case "summary":
      return { ...s, summary: f.text, chat: settle(s.chat, { from: "agent", text: f.text, note: `summary · ${at}` }) };
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
      return { ...s, asking: true, askNote: "", suggestions: [], question: chatGraph(), context: null, chat: [...s.chat, { from: "visitor", text: e.question }] };
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
