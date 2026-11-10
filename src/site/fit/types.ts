// The shapes the Worker streams (worker/src/pipeline.ts, ask.ts, index.ts).
// Kept here as a copy because the site build cannot import from outside src/.

export type Verdict = "strong" | "partial" | "gap";
export type Action = "email" | "resume" | "work";
export type Support = "yes" | "partly" | "no";

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

type RunStatus = "done" | "not_a_job_description" | "budget_exhausted" | "failed";
type AskStatus = "answered" | "budget_exhausted" | "failed";

export type Frame = { t?: number } & (
  | { type: "step"; step: string; id?: string; round?: number; state: "start" | "done" | "failed"; usage?: Usage; ms?: number; costMicro?: number }
  | { type: "say"; text: string }
  | { type: "plan"; role: string; requirements: { id: string; text: string; importance: string; search?: string }[] }
  | { type: "retrieved"; id: string; round?: number; chunks: { id: string; title: string }[] }
  | { type: "checked"; id: string; round: number; support: Support; reason: string } // the verifier's finding
  | { type: "retry"; id?: string; search: string; reason?: string } // sent back for another search (no id: a chat question)
  | { type: "retried"; id: string; improved: boolean }
  | { type: "memory"; kept: number; compacted: number; justCompacted: number }
  | { type: "searched"; round: number; chunks: { id: string; title: string }[] }
  | { type: "verified"; quotes: number; dropped: number }
  | { type: "verdict"; id: string; verdict: Verdict; evidence: Evidence[] }
  | { type: "dropped"; id?: string; reason: string }
  | { type: "delta"; text: string }
  | { type: "summary"; text: string }
  | { type: "answer"; answer: Answer }
  | ({ type: "usage" } & Totals)
  | { type: "outcome"; outcome: { status: RunStatus }; cached: boolean; runsLeft: number | null; reportId: string | null; suggestions: string[]; actions: Action[] }
  | { type: "outcome"; outcome: { status: AskStatus }; questionsLeft: number; suggestions: string[] }
);

export interface Replay {
  id: string;
  title: string;
  result: string;
  jd: string;
  frames: Frame[];
}
