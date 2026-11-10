// The role-fit pipeline. The shape is fixed in code, not chosen by a model:
// gate, planner, up to 6 parallel retrievers, critic, writer. At most 10 model
// calls per run, each with a hard output cap and a budget reservation.

import { cleanInput, isSafeProse, looksLikeInjection, oneLine } from "./guard.ts";
import { BudgetExhausted, Run, StepFailed, recs } from "./metered.ts";
import type { RunDeps, Stamped, StepEvent, UsageEvent } from "./metered.ts";
import type { Step } from "./model.ts";
import { criticUser, gateUser, plannerUser, retrieverUser, writerUser } from "./prompts.ts";
import { MAX_QUOTE_CHARS, groundQuotes } from "./quote.ts";
import type { DropReason, EvidenceOut } from "./quote.ts";
import { JsonStringStream, ScreenedText } from "./stream.ts";
import { SAY } from "./voice.ts";

export const MIN_JD_CHARS = 80;
export const MAX_JD_CHARS = 6000;
export const MAX_REQUIREMENTS = 6;
const TOP_K = 8;
const MAX_EVIDENCE = 2;
const MAX_ROLE_CHARS = 120;
const MAX_SUMMARY_CHARS = 700;

export type Verdict = "strong" | "partial" | "gap";
const RANK: Record<Verdict, number> = { gap: 0, partial: 1, strong: 2 };
const isVerdict = (v: unknown): v is Verdict => v === "strong" || v === "partial" || v === "gap";

interface Requirement {
  id: string; // r1..r6
  text: string;
  importance: "must" | "nice";
}

export interface RequirementResult extends Requirement {
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
  | { type: "say"; text: string } // plain-language narration, composed in code
  | { type: "plan"; role: string; requirements: Requirement[] }
  | { type: "retrieved"; id: string; chunks: { id: string; title: string }[] }
  | { type: "verdict"; id: string; verdict: Verdict; evidence: EvidenceOut[] }
  | { type: "dropped"; id: string; reason: DropReason | "critic_lowered" | "no_evidence" }
  | { type: "delta"; text: string } // a piece of the summary, as the writer produces it
  | { type: "summary"; text: string }; // the authoritative summary: replaces any deltas

export type Event = Stamped<OwnEvent | StepEvent | UsageEvent>;
export type Deps = RunDeps<Event>;

// The planner's reply, reduced to what may be shown: plain one-line text that
// passes the prose screen. The role and requirements were written by a model
// from a visitor's text, so they are treated as untrusted too.
function parsePlan(plan: Record<string, unknown>): { role: string; requirements: Requirement[] } {
  const roleText = typeof plan.role === "string" ? oneLine(plan.role, MAX_ROLE_CHARS) : "";
  const requirements = recs(plan.requirements)
    .filter((r) => typeof r.text === "string" && r.text.trim() !== "" && isSafeProse(r.text))
    .slice(0, MAX_REQUIREMENTS)
    .map((r, i) => ({
      id: `r${i + 1}`,
      text: oneLine(r.text as string, MAX_QUOTE_CHARS),
      importance: r.importance === "nice" ? ("nice" as const) : ("must" as const),
    }));
  return { role: roleText && isSafeProse(roleText) ? roleText : "this role", requirements };
}

export async function runPipeline(jdRaw: string, deps: Deps): Promise<Outcome> {
  const jd = cleanInput(jdRaw).slice(0, MAX_JD_CHARS);
  const run = new Run<OwnEvent>(deps);
  const say = (text: string) => run.emit({ type: "say", text });

  // One retriever: search in code, then one model call to judge what search found.
  async function retrieve(r: Requirement): Promise<{ result: RequirementResult; dropped: number }> {
    const found = deps.index.offer(r.text, TOP_K);
    run.emit({ type: "retrieved", id: r.id, chunks: found.map((c) => ({ id: c.id, title: c.title })) });
    let dropped = 0;
    let verdict: Verdict = "gap";
    let evidence: EvidenceOut[] = [];
    if (found.length > 0) {
      try {
        const out = await run.call("retriever", retrieverUser(r.text, found), { id: r.id });
        // The grounding check: enforced here in code, not left to a model.
        evidence = groundQuotes(recs(out.evidence), found, MAX_EVIDENCE, (reason) => {
          dropped++;
          run.emit({ type: "dropped", id: r.id, reason });
        });
        verdict = isVerdict(out.verdict) ? out.verdict : "gap";
      } catch (e) {
        if (e instanceof BudgetExhausted) throw e;
        // one failed retriever is a gap for that requirement, not a failed run
      }
    }
    // A verdict above "gap" needs at least one grounded quote to stand on.
    if (verdict === "gap" || evidence.length === 0) {
      if (verdict !== "gap" || found.length === 0) run.emit({ type: "dropped", id: r.id, reason: "no_evidence" });
      verdict = "gap";
      evidence = [];
    }
    run.emit({ type: "verdict", id: r.id, verdict, evidence });
    return { result: { ...r, verdict, evidence }, dropped };
  }

  try {
    // 0. Gate: is this a job description at all? Text that addresses the model
    // instead of describing a job is refused in code, before any call is paid for.
    if (looksLikeInjection(jd)) return { status: "not_a_job_description" };
    const gate = await run.call("gate", gateUser(jd));
    if (gate.is_job_description !== true) return { status: "not_a_job_description" };
    say(SAY.isJob);

    // 1. Planner
    const { role, requirements } = parsePlan(await run.call("planner", plannerUser(jd)));
    if (requirements.length === 0) throw new StepFailed("planner");
    run.emit({ type: "plan", role, requirements });
    say(SAY.planned(requirements.length));

    // 2. Retrievers, in parallel.
    const retrieved = await Promise.all(requirements.map(retrieve));
    const results = retrieved.map((r) => r.result);
    const count = (v: Verdict) => results.filter((r) => r.verdict === v).length;
    say(SAY.retrieved(results.length - count("gap"), results.length, retrieved.reduce((sum, r) => sum + r.dropped, 0)));

    const asItems = () => results.map((r) => ({ id: r.id, requirement: r.text, verdict: r.verdict, quotes: r.evidence.map((e) => e.quote) }));

    // 3. Critic: may lower a verdict, can never raise one.
    if (count("gap") < results.length) {
      const critic = await run.call("critic", criticUser(asItems()));
      let lowered = 0;
      for (const item of recs(critic.items)) {
        const r = results.find((x) => x.id === item.id);
        if (!r || !isVerdict(item.verdict) || RANK[item.verdict] >= RANK[r.verdict]) continue;
        r.verdict = item.verdict;
        if (item.verdict === "gap") r.evidence = [];
        lowered++;
        run.emit({ type: "dropped", id: r.id, reason: "critic_lowered" });
        run.emit({ type: "verdict", id: r.id, verdict: r.verdict, evidence: r.evidence });
      }
      say(SAY.critic(lowered));
    }

    // 4. Writer. Its prose is the one thing not checked quote by quote, so it streams
    // a few words behind and only while it passes the screen; if the finished text
    // fails, it is replaced by a summary computed from the verdicts.
    let summary = SAY.fallbackSummary(results.length, count("strong"), count("partial"), role);
    const extract = new JsonStringStream("summary");
    const screened = new ScreenedText(isSafeProse, (text) => run.emit({ type: "delta", text }));
    try {
      const written = await run.call("writer", writerUser(role, asItems()), { onText: (d) => screened.push(extract.push(d)) });
      const s = typeof written.summary === "string" ? written.summary.trim() : "";
      if (s && s.length <= MAX_SUMMARY_CHARS && isSafeProse(s)) {
        summary = s;
        screened.flush(s);
      }
    } catch {
      // A failed or unaffordable writer is not a failed run: the verdicts and quotes
      // already paid for stand on their own, with the computed summary.
    }
    run.emit({ type: "summary", text: summary });
    return { status: "done", report: { role, summary, results } };
  } catch (e) {
    if (e instanceof BudgetExhausted) return { status: "budget_exhausted" };
    if (e instanceof StepFailed) return { status: "failed", step: e.step };
    throw e;
  } finally {
    run.emitUsage();
  }
}
