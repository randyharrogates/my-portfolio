import { ScriptedModel } from "./model.ts";
import type { ModelRequest } from "./model.ts";

// Local development only (ENVIRONMENT=dev and no API key): a rule-based stand-in
// so the Worker, limits and page can be exercised end to end at zero cost. It says
// nothing about how well a real model does the job.
export function devModel(): ScriptedModel {
  const jdOf = (r: ModelRequest) => /<job_description>\n([\s\S]*)\n<\/job_description>/.exec(r.user)?.[1] ?? "";
  return new ScriptedModel({
    gate: (r) => ({ is_job_description: /\b(experience|responsibilit|requirement|role|engineer|hiring|you will)\b/i.test(jdOf(r)) }),
    planner: (r) => {
      const sentences = jdOf(r)
        .split(/(?<=[.;\n])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 25 && s.length < 200);
      return {
        role: jdOf(r).split(/[.\n]/)[0].slice(0, 80),
        requirements: sentences.slice(0, 6).map((text) => ({ text, importance: "must" })),
      };
    },
    retriever: (r) => {
      const m = /<excerpt id="([^"]+)"[^>]*>\n([^\n]+)/.exec(r.user);
      return m ? { verdict: "partial", evidence: [{ excerpt_id: m[1], quote: m[2].slice(0, 120) }] } : { verdict: "gap", evidence: [] };
    },
    critic: () => ({ items: [] }),
    writer: () => ({ summary: "Development stand-in summary: verdicts below come from keyword search only, not from a model." }),
  });
}
