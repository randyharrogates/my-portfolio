// The two workers the orchestrators hand work to, shared by the report run and the
// chat so that both are held to the same checks.
//
// A retriever searches in code, then makes one model call to pick exact quotes from
// what the search found; code then checks every quote against its source. A verifier
// is a second model call that reads the surviving quotes and may only lower a verdict.

import { isSafeProse, oneLine } from "./guard.ts";
import { BudgetExhausted, recs } from "./metered.ts";
import type { Bm25 } from "./bm25.ts";
import type { Step } from "./model.ts";
import { retrieverUser, verifierUser } from "./prompts.ts";
import { groundQuotes } from "./quote.ts";
import type { DropReason, EvidenceOut } from "./quote.ts";

export type Verdict = "strong" | "partial" | "gap";
export type Support = "yes" | "partly" | "no";
export const RANK: Record<Verdict, number> = { gap: 0, partial: 1, strong: 2 };
const isVerdict = (v: unknown): v is Verdict => v === "strong" || v === "partial" || v === "gap";

const TOP_K = 8;
const MAX_EVIDENCE = 2;
const MAX_REASON_CHARS = 160;

// What the workers tell the page. `id` ties an event to one requirement or one chat task.
export type WorkerEvent =
  | { type: "retrieved"; id: string; round: number; chunks: { id: string; title: string }[] }
  | { type: "dropped"; id: string; reason: DropReason | "verifier_lowered" | "no_evidence" }
  | { type: "checked"; id: string; round: number; support: Support; reason: string }; // the verifier's finding

// The part of a run the workers use.
interface Crew {
  call(step: Step, user: string, opts?: { id?: string; round?: number }): Promise<Record<string, unknown>>;
  emit(event: WorkerEvent): void;
}

// Text a model wrote from a visitor's text is untrusted too: one plain line that
// passes the prose screen, or nothing.
export const shown = (v: unknown, max: number) => {
  const s = typeof v === "string" ? oneLine(v, max) : "";
  return s && isSafeProse(s) ? s : "";
};

// One thing to find evidence for, and what was found.
export interface Finding {
  id: string;
  text: string;
  verdict: Verdict;
  evidence: EvidenceOut[];
}

export interface Found {
  verdict: Verdict;
  evidence: EvidenceOut[];
  dropped: number; // quotes that failed the code check
}

export async function retrieve(crew: Crew, index: Bm25, task: { id: string; text: string }, query: string, round: number): Promise<Found> {
  const found = index.offer(query, TOP_K);
  crew.emit({ type: "retrieved", id: task.id, round, chunks: found.map((c) => ({ id: c.id, title: c.title })) });
  let dropped = 0;
  let verdict: Verdict = "gap";
  let evidence: EvidenceOut[] = [];
  if (found.length > 0) {
    try {
      const out = await crew.call("retriever", retrieverUser(task.text, found), { id: task.id, round });
      // The grounding check: enforced here in code, not left to a model.
      evidence = groundQuotes(recs(out.evidence), found, MAX_EVIDENCE, (reason) => {
        dropped++;
        crew.emit({ type: "dropped", id: task.id, reason });
      });
      verdict = isVerdict(out.verdict) ? out.verdict : "gap";
    } catch (e) {
      if (e instanceof BudgetExhausted) throw e;
      // one failed retriever is a gap for that task, not a failed run
    }
  }
  // A verdict above "gap" needs at least one grounded quote to stand on.
  if (verdict === "gap" || evidence.length === 0) return { verdict: "gap", evidence: [], dropped };
  return { verdict, evidence, dropped };
}

export interface Check {
  support: Support;
  reason: string;
  lowered: boolean;
}

// Reads each finding's quotes and says whether they support it. A finding can only
// be lowered, in place. Returns what the verifier said about each one it read.
export async function verify(crew: Crew, items: Finding[], round: number): Promise<Map<string, Check>> {
  const checks = new Map<string, Check>();
  const withEvidence = items.filter((r) => r.verdict !== "gap");
  if (withEvidence.length === 0) return checks;
  const asked = withEvidence.map((r) => ({ id: r.id, requirement: r.text, verdict: r.verdict, quotes: r.evidence.map((e) => e.quote) }));
  const out = await crew.call("verifier", verifierUser(asked), { round });
  for (const item of recs(out.items)) {
    const r = withEvidence.find((x) => x.id === item.id);
    if (!r || checks.has(r.id)) continue;
    const support: Support = item.supported === "no" ? "no" : item.supported === "partly" ? "partly" : "yes";
    const reason = shown(item.reason, MAX_REASON_CHARS);
    crew.emit({ type: "checked", id: r.id, round, support, reason });
    const to: Verdict = support === "no" ? "gap" : support === "partly" && r.verdict === "strong" ? "partial" : r.verdict;
    const lowered = RANK[to] < RANK[r.verdict];
    checks.set(r.id, { support, reason, lowered });
    if (!lowered) continue;
    r.verdict = to;
    if (to === "gap") r.evidence = [];
    crew.emit({ type: "dropped", id: r.id, reason: "verifier_lowered" });
  }
  return checks;
}
