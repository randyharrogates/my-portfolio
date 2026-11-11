// The role-fit run: gate → orchestrator → retrievers (parallel) → verifier, with
// one bounded loop back through the orchestrator → writer.
//
// The orchestrator plans the work and, when the verifier rejects evidence, decides
// whether to search again and with what. Code, not a model, bounds the loop: at
// most MAX_ROUNDS rounds and MAX_RETRIES requirements sent back, so a run can never
// make more than MAX_CALLS model calls. Every quote is checked in code against the
// page it cites, and a verdict can only be raised by new evidence that passes the
// same checks.

import { cleanInput, isSafeProse, looksLikeInjection } from "./guard.ts";
import { BudgetExhausted, Run, StepFailed, recs } from "./metered.ts";
import type { RunDeps, Stamped, StepEvent, UsageEvent } from "./metered.ts";
import type { Step } from "./model.ts";
import { gateUser, orchestratorUser, replanUser, writerUser } from "./prompts.ts";
import { MAX_QUOTE_CHARS } from "./quote.ts";
import type { EvidenceOut } from "./quote.ts";
import { JsonStringStream, ScreenedText } from "./stream.ts";
import { SAY } from "./voice.ts";
import { RANK, retrieve, shown, verify } from "./workers.ts";
import type { Verdict, WorkerEvent } from "./workers.ts";

export type { Verdict } from "./workers.ts";

export const MIN_JD_CHARS = 80;
export const MAX_JD_CHARS = 6000;
export const MAX_REQUIREMENTS = 6;
export const MAX_ROUNDS = 2;
export const MAX_RETRIES = 3;
// gate + orchestrator + retrievers + verifier, then orchestrator + retries + verifier, then writer.
export const MAX_CALLS = 1 + 1 + MAX_REQUIREMENTS + 1 + 1 + MAX_RETRIES + 1 + 1;
const MAX_ROLE_CHARS = 120;
const MAX_SEARCH_CHARS = 120;
const MAX_SUMMARY_CHARS = 700;

interface Requirement {
  id: string; // r1..r6
  text: string;
  importance: "must" | "nice";
  search: string; // the orchestrator's search terms for this requirement
}

export interface RequirementResult extends Omit<Requirement, "search"> {
  verdict: Verdict;
  evidence: EvidenceOut[];
}

export interface Report {
  role: string;
  summary: string;
  results: RequirementResult[];
}

export type Outcome =
  | { status: "done"; report: Report }
  | { status: "not_a_job_description" }
  | { status: "budget_exhausted" }
  | { status: "failed"; step: Step };

// What the page renders, in the order it happened. `id` ties an event to one requirement.
type OwnEvent =
  | WorkerEvent
  | { type: "say"; text: string } // plain-language narration, composed in code
  | { type: "plan"; role: string; requirements: Requirement[] }
  | { type: "verdict"; id: string; verdict: Verdict; evidence: EvidenceOut[] }
  | { type: "retry"; id: string; search: string; reason: string } // the orchestrator sends one back
  | { type: "retried"; id: string; improved: boolean }
  | { type: "delta"; text: string } // a piece of the summary, as the writer produces it
  | { type: "summary"; text: string; fallback?: true }; // the authoritative summary: replaces any deltas. `fallback`: computed in code, the writer's was not usable

export type Event = Stamped<OwnEvent | StepEvent | UsageEvent>;
export type Deps = RunDeps<Event>;

function parsePlan(plan: Record<string, unknown>): { role: string; requirements: Requirement[] } {
  const requirements = recs(plan.requirements)
    .map((r) => ({ text: shown(r.text, MAX_QUOTE_CHARS), importance: r.importance === "nice" ? ("nice" as const) : ("must" as const), search: shown(r.search, MAX_SEARCH_CHARS) }))
    .filter((r) => r.text !== "")
    .slice(0, MAX_REQUIREMENTS)
    .map((r, i) => ({ id: `r${i + 1}`, ...r }));
  return { role: shown(plan.role, MAX_ROLE_CHARS) || "this role", requirements };
}

export async function runPipeline(jdRaw: string, deps: Deps): Promise<Outcome> {
  const jd = cleanInput(jdRaw).slice(0, MAX_JD_CHARS);
  const run = new Run<OwnEvent>(deps);
  const say = (text: string) => run.emit({ type: "say", text });

  const asItem = (r: RequirementResult) => ({ id: r.id, requirement: r.text, verdict: r.verdict, quotes: r.evidence.map((e) => e.quote) });
  const publish = (r: RequirementResult) => run.emit({ type: "verdict", id: r.id, verdict: r.verdict, evidence: r.evidence });

  try {
    // 0. Gate: is this a job description at all? Text that addresses the model
    // instead of describing a job is refused in code, before any call is paid for.
    if (looksLikeInjection(jd)) return { status: "not_a_job_description" };
    const gate = await run.call("gate", gateUser(jd));
    if (gate.is_job_description !== true) return { status: "not_a_job_description" };
    say(SAY.isJob);

    // 1. Orchestrator: which requirements matter, and what to search for each.
    const { role, requirements } = parsePlan(await run.call("orchestrator", orchestratorUser(jd), { round: 1 }));
    if (requirements.length === 0) throw new StepFailed("orchestrator");
    run.emit({ type: "plan", role, requirements });
    say(SAY.planned(requirements.length));

    // 2. Round 1: retrievers in parallel, then the verifier.
    const first = await Promise.all(requirements.map((r) => retrieve(run, deps.index, r, r.search ? `${r.text} ${r.search}` : r.text, 1)));
    const results: RequirementResult[] = requirements.map((r, i) => ({ id: r.id, text: r.text, importance: r.importance, verdict: first[i].verdict, evidence: first[i].evidence }));
    const count = (v: Verdict) => results.filter((r) => r.verdict === v).length;
    say(SAY.retrieved(results.length - count("gap"), results.length, first.reduce((sum, f) => sum + f.dropped, 0)));
    // Why each lowered verdict was lowered.
    const lowered = new Map([...(await verify(run, results, 1))].filter(([, c]) => c.lowered).map(([id, c]) => [id, c.reason]));
    results.forEach(publish);

    // 3. The loop. Requirements the verifier lowered, and must-haves with no evidence,
    // go back to the orchestrator, which may send each for one more search.
    const weak = results
      .filter((r) => lowered.has(r.id) || (r.verdict === "gap" && r.importance === "must"))
      .sort((a, b) => Number(b.importance === "must") - Number(a.importance === "must"))
      .slice(0, MAX_RETRIES);
    let improvedCount = 0;
    if (weak.length > 0 && MAX_ROUNDS > 1) {
      const why = (r: RequirementResult) => lowered.get(r.id) || (r.verdict === "gap" ? "the search found no evidence" : "the evidence was weak");
      const searched = (id: string) => requirements.find((q) => q.id === id)?.search ?? "";
      let replan: Record<string, unknown> = {};
      try {
        replan = await run.call("replan", replanUser(weak.map((r) => ({ id: r.id, requirement: r.text, searched: searched(r.id), problem: why(r) }))), { round: 2 });
      } catch (e) {
        if (e instanceof BudgetExhausted) throw e;
        // a failed second thought is not a failed run: round 1 stands
      }
      const again = recs(replan.items)
        .map((item) => ({ r: weak.find((x) => x.id === item.id), search: item.action === "search_again" ? shown(item.search, MAX_SEARCH_CHARS) : "" }))
        .filter((x): x is { r: RequirementResult; search: string } => x.r !== undefined && x.search !== "")
        .filter((x, i, all) => all.findIndex((y) => y.r.id === x.r.id) === i);
      if (again.length > 0) {
        say(SAY.retrying(again.length));
        for (const { r, search } of again) run.emit({ type: "retry", id: r.id, search, reason: why(r) });
        const second = await Promise.all(again.map(({ r, search }) => retrieve(run, deps.index, r, search, 2)));
        const candidates: RequirementResult[] = again.map(({ r }, i) => ({ ...r, verdict: second[i].verdict, evidence: second[i].evidence }));
        await verify(run, candidates, 2);
        for (const candidate of candidates) {
          const r = results.find((x) => x.id === candidate.id);
          if (!r) continue;
          // New evidence replaces the old only when it survived the same checks and is stronger.
          const improved = RANK[candidate.verdict] > RANK[r.verdict];
          if (improved) {
            r.verdict = candidate.verdict;
            r.evidence = candidate.evidence;
            improvedCount++;
          }
          run.emit({ type: "retried", id: r.id, improved });
          publish(r);
        }
      }
    }
    for (const r of results) if (r.verdict === "gap") run.emit({ type: "dropped", id: r.id, reason: "no_evidence" });
    say(SAY.verified(lowered.size, improvedCount));

    // 4. Writer. Its prose is the one thing not checked quote by quote, so it streams
    // a few words behind and only while it passes the screen; if the finished text
    // fails, it is replaced by a summary computed from the verdicts.
    let summary = SAY.fallbackSummary(results.length, count("strong"), count("partial"), role);
    let fallback = true;
    const extract = new JsonStringStream("summary");
    const screened = new ScreenedText(isSafeProse, (text) => run.emit({ type: "delta", text }));
    try {
      const written = await run.call("writer", writerUser(role, results.map(asItem)), { onText: (d) => screened.push(extract.push(d)) });
      const s = typeof written.summary === "string" ? written.summary.trim() : "";
      if (s && s.length <= MAX_SUMMARY_CHARS && isSafeProse(s)) {
        summary = s;
        fallback = false;
        screened.flush(s);
      }
    } catch {
      // A failed or unaffordable writer is not a failed run: the verdicts and quotes
      // already paid for stand on their own, with the computed summary.
    }
    run.emit({ type: "summary", text: summary, ...(fallback ? { fallback } : {}) });
    return { status: "done", report: { role, summary, results } };
  } catch (e) {
    if (e instanceof BudgetExhausted) return { status: "budget_exhausted" };
    if (e instanceof StepFailed) return { status: "failed", step: e.step };
    throw e;
  }
}
