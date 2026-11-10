// The chips under a report or an answer. Computed in code from the verdicts:
// no model call, and nothing a visitor typed is ever echoed into a chip.

import type { Report } from "./pipeline.ts";

// Things the page can do itself. The page owns the links; the Worker only names them.
export type Action = "email" | "resume" | "work";

const MAX_SUGGESTIONS = 3;
const ask = (text: string) => `Tell me more about: ${text.replace(/[.\s]+$/, "")}`;

// Requirements with evidence make good follow-ups, partial ones first because
// that is where a recruiter has the most to find out. Gaps are left out: asking
// about one only returns "not shown".
export function suggestions(report: Report, alreadyAsked: string[] = []): string[] {
  const asked = new Set(alreadyAsked.map((q) => q.trim().toLowerCase()));
  return report.results
    .filter((r) => r.verdict !== "gap")
    .sort((a, b) => Number(a.verdict === "strong") - Number(b.verdict === "strong"))
    .map((r) => ask(r.text))
    .filter((q) => q.length <= 300 && !asked.has(q.toLowerCase()))
    .slice(0, MAX_SUGGESTIONS);
}

export const reportActions = (report: Report): Action[] =>
  report.results.some((r) => r.verdict === "gap") ? ["email", "resume", "work"] : ["resume", "work", "email"];
