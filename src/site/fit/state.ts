// Everything the page shows is derived here from the frames the Worker streams.
// One reducer, so a live run, a cached run and a recorded replay all render the
// same way.

import type { Action, Answer, Evidence, Frame, Totals, Usage, Verdict } from "./types.ts";

export interface Card {
  id: string;
  text: string;
  importance: string;
  chunks: string[];
  verdict?: Verdict;
  evidence: Evidence[];
  dropped: number;
  lowered: boolean;
}

export interface TraceStep {
  key: string; // gate | planner | retriever | critic | writer
  state: "waiting" | "running" | "done" | "failed";
  ms?: number;
  usage?: Usage;
  costMicro?: number;
}

export interface Retriever {
  id: string;
  state: "running" | "done" | "failed";
  ms?: number;
  tokens?: number;
}

export type ChatItem =
  | { from: "visitor"; text: string; note?: string }
  | { from: "agent"; text: string; note?: string; streaming?: boolean; answer?: Answer };

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
  steps: TraceStep[];
  retrievers: Retriever[];
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

export const STEP_NAMES: Record<string, { name: string; does: string }> = {
  gate: { name: "Gate", does: "is this a job description?" },
  planner: { name: "Planner", does: "picks the requirements that matter most" },
  retriever: { name: "Retrievers", does: "search my published pages and quote the evidence exactly" },
  critic: { name: "Critic", does: "can lower a verdict, never raise one" },
  writer: { name: "Writer", does: "streams the summary" },
};

export const initial: FitState = {
  phase: "idle",
  retryAfterSec: 0,
  replay: false,
  cached: false,
  role: "",
  chat: [],
  cards: [],
  steps: Object.keys(STEP_NAMES).map((key) => ({ key, state: "waiting" })),
  retrievers: [],
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
const addUsage = (a: Usage | undefined, b: Usage): Usage => ({ input: (a?.input ?? 0) + b.input, cached: (a?.cached ?? 0) + b.cached, output: (a?.output ?? 0) + b.output });

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

// Up to six retrievers share one row of the trace: it adds their usage up, shows
// the slowest, and is finished once the critic or the writer starts.
function applyStep(s: FitState, f: StepFrame): FitState {
  const state = f.state === "start" ? "running" : f.state;
  if (f.step === "answer") return f.state === "done" && f.usage ? { ...s, askNote: `1 call · ${seconds(f.ms ?? 0)} · ${(f.usage.input + f.usage.output).toLocaleString()} tokens · est. ${cost(f.costMicro ?? 0)}` } : s;
  const steps = s.steps.map((st): TraceStep => {
    if (st.key === "retriever" && f.step !== "retriever") return st.state === "running" ? { ...st, state: "done" } : st;
    if (st.key !== f.step) return st;
    if (f.step !== "retriever") return { ...st, state, ms: f.ms, usage: f.usage, costMicro: f.costMicro };
    return { ...st, state: "running", ms: Math.max(st.ms ?? 0, f.ms ?? 0), costMicro: (st.costMicro ?? 0) + (f.costMicro ?? 0), usage: f.usage ? addUsage(st.usage, f.usage) : st.usage };
  });
  if (f.step !== "retriever" || !f.id) return { ...s, steps };
  const row: Retriever = { id: f.id, state, ms: f.ms, tokens: f.usage ? f.usage.input + f.usage.output : undefined };
  return { ...s, steps, retrievers: [...s.retrievers.filter((r) => r.id !== f.id), row].sort((a, b) => a.id.localeCompare(b.id)) };
}

function applyOutcome(s: FitState, f: OutcomeFrame): FitState {
  if ("questionsLeft" in f) {
    const answered = f.outcome.status === "answered";
    const sorry = f.outcome.status === "budget_exhausted" ? ASK_REFUSALS.live_runs_off : ASK_REFUSALS.failed;
    return { ...s, asking: false, askNote: "", questionsLeft: f.questionsLeft, suggestions: answered ? f.suggestions : s.suggestions, chat: answered ? s.chat : settle(s.chat, { from: "agent", text: sorry, note: "not answered" }) };
  }
  if (f.outcome.status !== "done") return { ...s, phase: "refused", refusal: f.outcome.status, runsLeft: f.runsLeft };
  return {
    ...s,
    phase: "done",
    steps: s.steps.map((st) => (st.state === "running" ? { ...st, state: "done" } : st)),
    cached: f.cached,
    reportId: f.reportId,
    suggestions: f.suggestions,
    actions: f.actions,
    runsLeft: f.runsLeft,
  };
}

function applyFrame(prev: FitState, f: Frame): FitState {
  // A question's frames are timed from when it was asked, so they leave the run's clock alone.
  const s = prev.asking ? prev : { ...prev, elapsedMs: Math.max(prev.elapsedMs, f.t ?? 0) };
  const at = seconds(f.t ?? s.elapsedMs);
  switch (f.type) {
    case "say":
      return { ...s, chat: [...s.chat, { from: "agent", text: f.text, note: at }] };
    case "plan":
      return { ...s, role: f.role, cards: f.requirements.map((r) => ({ ...r, chunks: [], evidence: [], dropped: 0, lowered: false })) };
    case "retrieved":
      return { ...s, cards: patch(s.cards, f.id, (c) => ({ ...c, chunks: f.chunks.map((x) => x.title) })) };
    case "verdict":
      return { ...s, cards: patch(s.cards, f.id, (c) => ({ ...c, verdict: f.verdict, evidence: f.evidence })) };
    case "dropped":
      if (!f.id) return s; // a quote dropped while answering a question: the answer itself reports it
      return { ...s, cards: patch(s.cards, f.id, (c) => ({ ...c, dropped: c.dropped + Number(f.reason !== "critic_lowered" && f.reason !== "no_evidence"), lowered: c.lowered || f.reason === "critic_lowered" })) };
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
      return { ...initial, phase: "running", replay: e.replay, runsLeft: s.runsLeft, questionsLeft: s.questionsLeft, chat: [{ from: "visitor", text: e.jd, note: `job description · ${e.jd.length.toLocaleString()} characters` }] };
    case "frame":
      return applyFrame(s, e.frame);
    case "ask":
      return { ...s, asking: true, askNote: "", suggestions: [], chat: [...s.chat, { from: "visitor", text: e.question }] };
    case "refuse":
      if (s.asking) return { ...s, asking: false, chat: [...s.chat, { from: "agent", text: ASK_REFUSALS[e.refusal] ?? ASK_REFUSALS.failed, note: "not answered" }] };
      return { ...s, phase: "refused", refusal: RUN_REFUSALS.has(e.refusal) ? (e.refusal as Refusal) : "failed", retryAfterSec: e.retryAfterSec };
    case "reset":
      return { ...initial, runsLeft: s.runsLeft, questionsLeft: s.questionsLeft };
  }
}

const ASK_REFUSALS: Record<string, string> & { failed: string; live_runs_off: string } = {
  daily: "That's today's 5 questions used. They reset at midnight UTC. Email me and I'll answer the rest myself.",
  burst: "One question every 5 seconds. Give it a moment and ask again.",
  busy: "I'm still answering the last one.",
  slow_down: "Too many requests at once. Give it a few seconds.",
  live_runs_off: "Live answers are paused: this month's budget is used up.",
  report_expired: "This report is more than a day old, so I can't take questions on it. Run the job description again.",
  no_visitor: "This report is more than a day old, so I can't take questions on it. Run the job description again.",
  network: "I couldn't reach the server. Check your connection and ask again.",
  failed: "That answer failed. Try asking again.",
};
