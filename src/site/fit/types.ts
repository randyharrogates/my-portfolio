// The shapes the Worker streams (worker/src/pipeline.ts, ask.ts, index.ts).
// Kept here as a copy because the site build cannot import from outside src/.

export type Verdict = "strong" | "partial" | "gap";
export type Action = "email" | "resume" | "work";

export interface Usage {
  input: number;
  cached: number;
  output: number;
}

export interface Evidence {
  chunkId: string;
  quote: string;
  title: string;
  url: string;
}

export interface Totals {
  calls: number;
  input: number;
  cached: number;
  output: number;
  costMicro: number;
}

export interface Answer {
  kind: "grounded" | "not_shown" | "off_topic";
  text: string;
  evidence: Evidence[];
  actions: Action[];
}

type RunOutcome =
  | { status: "done" }
  | { status: "not_a_job_description" }
  | { status: "budget_exhausted" }
  | { status: "failed" };

type AskOutcome = { status: "answered" } | { status: "budget_exhausted" } | { status: "failed" };

export type Frame = { t?: number } & (
  | { type: "step"; step: string; id?: string; label: string; state: "start" | "done" | "failed"; usage?: Usage; ms?: number; costMicro?: number }
  | { type: "say"; text: string }
  | { type: "plan"; role: string; requirements: { id: string; text: string; importance: string }[] }
  | { type: "retrieved"; id?: string; chunks: { id: string; title: string }[] }
  | { type: "verdict"; id: string; verdict: Verdict; evidence: Evidence[] }
  | { type: "dropped"; id?: string; reason: string }
  | { type: "delta"; text: string }
  | { type: "summary"; text: string }
  | { type: "answer"; answer: Answer }
  | ({ type: "usage" } & Totals)
  | { type: "outcome"; outcome: RunOutcome; cached: boolean; runsLeft: number | null; reportId: string | null; suggestions: string[]; actions: Action[] }
  | { type: "outcome"; outcome: AskOutcome; questionsLeft: number; suggestions: string[] }
);

export interface Replay {
  id: string;
  title: string;
  result: string;
  jd: string;
  frames: Frame[];
}
