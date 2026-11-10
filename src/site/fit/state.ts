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

export type Refusal = "not_a_job_description" | "budget_exhausted" | "failed" | "daily" | "burst" | "busy" | "slow_down" | "live_runs_off" | "network" | "report_expired" | "turnstile_failed" | "stopped";

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
  elapsedMs: number;
  guardrails: { quotesDropped: number; lowered: number; gaps: number };
  summary: string;
  reportId: string | null;
  suggestions: string[];
  actions: Action[];
  runsLeft: number | null;
  questionsLeft: number | null;
  asking: boolean;
}

export const STEP_NAMES: Record<string, { name: string; waiting: string }> = {
  gate: { name: "Gate", waiting: "is this a job description?" },
  planner: { name: "Planner", waiting: "picks the requirements that matter most" },
  retriever: { name: "Retrievers", waiting: "search 160 excerpts and quote the evidence exactly" },
  critic: { name: "Critic", waiting: "can lower a verdict, never raise one" },
  writer: { name: "Writer", waiting: "streams the summary" },
};

const zero: Totals = { calls: 0, input: 0, cached: 0, output: 0, costMicro: 0 };

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
  totals: zero,
  elapsedMs: 0,
  guardrails: { quotesDropped: 0, lowered: 0, gaps: 0 },
  summary: "",
  reportId: null,
  suggestions: [],
  actions: [],
  runsLeft: null,
  questionsLeft: null,
  asking: false,
};

export type Event =
  | { kind: "start"; jd: string; replay: boolean }
  | { kind: "frame"; frame: Frame }
  | { kind: "ask"; question: string }
  | { kind: "refuse"; refusal: Refusal; retryAfterSec: number }
  | { kind: "tick"; elapsedMs: number }
  | { kind: "restore"; state: FitState }
  | { kind: "reset" };

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

// The last agent bubble, if it is still being written.
function streamInto(chat: ChatItem[], text: string, note: string): ChatItem[] {
  const last = chat[chat.length - 1];
  if (last?.from === "agent" && last.streaming) return [...chat.slice(0, -1), { ...last, text: last.text + text }];
  return [...chat, { from: "agent", text, note, streaming: true }];
}

function settle(chat: ChatItem[], item: ChatItem): ChatItem[] {
  const last = chat[chat.length - 1];
  return last?.from === "agent" && last.streaming ? [...chat.slice(0, -1), item] : [...chat, item];
}

const patch = <T extends { id: string }>(list: T[], id: string, change: (item: T) => T) => list.map((x) => (x.id === id ? change(x) : x));

function applyFrame(s: FitState, f: Frame): FitState {
  const elapsedMs = Math.max(s.elapsedMs, f.t ?? 0);
  const at = seconds(f.t ?? s.elapsedMs);
  switch (f.type) {
    case "say":
      return { ...s, elapsedMs, chat: [...s.chat, { from: "agent", text: f.text, note: at }] };
    case "plan":
      return {
        ...s,
        elapsedMs,
        role: f.role,
        cards: f.requirements.map((r) => ({ ...r, chunks: [], evidence: [], dropped: 0, lowered: false })),
      };
    case "retrieved":
      return f.id ? { ...s, elapsedMs, cards: patch(s.cards, f.id, (c) => ({ ...c, chunks: f.chunks.map((x) => x.title) })) } : { ...s, elapsedMs };
    case "verdict":
      return { ...s, elapsedMs, cards: patch(s.cards, f.id, (c) => ({ ...c, verdict: f.verdict, evidence: f.evidence })) };
    case "dropped": {
      const quote = f.reason === "quote_not_in_source" || f.reason === "unknown_source";
      const lowered = f.reason === "critic_lowered";
      return {
        ...s,
        elapsedMs,
        guardrails: {
          ...s.guardrails,
          quotesDropped: s.guardrails.quotesDropped + Number(quote),
          lowered: s.guardrails.lowered + Number(lowered),
        },
        cards: f.id ? patch(s.cards, f.id, (c) => ({ ...c, dropped: c.dropped + Number(quote), lowered: c.lowered || lowered })) : s.cards,
      };
    }
    case "step": {
      if (f.step === "search" || f.step === "answer") return { ...s, elapsedMs };
      const steps = s.steps.map((st) => {
        if (st.key !== f.step) return st;
        if (f.step !== "retriever") return { ...st, state: f.state === "start" ? ("running" as const) : f.state, ms: f.ms, usage: f.usage, costMicro: f.costMicro };
        // six retrievers share one row: it is done when the critic or writer starts
        return {
          ...st,
          state: "running" as const,
          ms: Math.max(st.ms ?? 0, f.ms ?? 0),
          costMicro: (st.costMicro ?? 0) + (f.costMicro ?? 0),
          usage: f.usage
            ? { input: (st.usage?.input ?? 0) + f.usage.input, cached: (st.usage?.cached ?? 0) + f.usage.cached, output: (st.usage?.output ?? 0) + f.usage.output }
            : st.usage,
        };
      });
      const closed = f.step === "critic" || f.step === "writer" ? steps.map((st) => (st.key === "retriever" && st.state === "running" ? { ...st, state: "done" as const } : st)) : steps;
      if (f.step !== "retriever" || !f.id) return { ...s, elapsedMs, steps: closed };
      const row: Retriever = { id: f.id, state: f.state === "start" ? "running" : f.state, ms: f.ms, tokens: f.usage ? f.usage.input + f.usage.output : undefined };
      return { ...s, elapsedMs, steps: closed, retrievers: [...s.retrievers.filter((r) => r.id !== f.id), row].sort((a, b) => a.id.localeCompare(b.id)) };
    }
    case "delta":
      return { ...s, elapsedMs, chat: streamInto(s.chat, f.text, s.asking ? "answering" : "summary") };
    case "summary":
      return { ...s, elapsedMs, summary: f.text, chat: settle(s.chat, { from: "agent", text: f.text, note: `summary · ${at}` }) };
    case "answer":
      return { ...s, chat: settle(s.chat, { from: "agent", text: f.answer.text, answer: f.answer }) };
    case "usage": {
      const { type: _type, t: _t, ...totals } = f;
      return s.asking ? s : { ...s, elapsedMs, totals };
    }
    case "outcome": {
      if ("questionsLeft" in f) {
        const failed = f.outcome.status !== "answered";
        return {
          ...s,
          asking: false,
          questionsLeft: f.questionsLeft,
          suggestions: failed ? s.suggestions : f.suggestions,
          chat: failed ? settle(s.chat, { from: "agent", text: f.outcome.status === "budget_exhausted" ? "Live answers are paused: this month's budget is used up." : "That answer failed. Try asking again.", note: "not answered" }) : s.chat,
        };
      }
      if (f.outcome.status !== "done") return { ...s, phase: "refused", refusal: f.outcome.status, runsLeft: f.runsLeft };
      const steps = s.steps.map((st) => (st.state === "running" ? { ...st, state: "done" as const } : st));
      return {
        ...s,
        phase: "done",
        steps,
        cached: f.cached,
        reportId: f.reportId,
        suggestions: f.suggestions ?? [],
        actions: f.actions ?? [],
        runsLeft: f.runsLeft,
        guardrails: { ...s.guardrails, gaps: s.cards.filter((c) => c.verdict === "gap").length },
      };
    }
    default:
      return s;
  }
}

export function reduce(s: FitState, e: Event): FitState {
  switch (e.kind) {
    case "start":
      return { ...initial, phase: "running", replay: e.replay, runsLeft: s.runsLeft, questionsLeft: s.questionsLeft, chat: [{ from: "visitor", text: e.jd, note: `job description · ${e.jd.length.toLocaleString()} characters` }] };
    case "frame":
      return applyFrame(s, e.frame);
    case "ask":
      return { ...s, asking: true, suggestions: [], chat: [...s.chat, { from: "visitor", text: e.question }] };
    case "refuse":
      return s.asking ? { ...s, asking: false, chat: [...s.chat, { from: "agent", text: ASK_REFUSALS[e.refusal] ?? ASK_REFUSALS.failed!, note: "not answered" }] } : { ...s, phase: "refused", refusal: e.refusal, retryAfterSec: e.retryAfterSec };
    case "tick":
      return s.phase === "running" ? { ...s, elapsedMs: Math.max(s.elapsedMs, e.elapsedMs) } : s;
    case "restore":
      return e.state;
    case "reset":
      return { ...initial, runsLeft: s.runsLeft, questionsLeft: s.questionsLeft };
  }
}

const ASK_REFUSALS: Partial<Record<Refusal, string>> = {
  daily: "That's today's 5 questions used. They reset at midnight UTC. Email me and I'll answer the rest myself.",
  burst: "One question every 5 seconds. Give it a moment and ask again.",
  busy: "I'm still answering the last one.",
  slow_down: "Too many requests at once. Give it a few seconds.",
  live_runs_off: "Live answers are paused: this month's budget is used up.",
  report_expired: "This report is more than a day old, so I can't take questions on it. Run the job description again.",
  network: "I couldn't reach the server. Check your connection and ask again.",
  failed: "That answer failed. Try asking again.",
};
