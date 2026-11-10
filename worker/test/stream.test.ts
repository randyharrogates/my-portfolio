import assert from "node:assert/strict";
import { test } from "node:test";
import { ScriptedModel } from "../src/model.ts";
import type { ModelRequest, Step } from "../src/model.ts";
import { isClean } from "../src/guard.ts";
import { runPipeline } from "../src/pipeline.ts";
import type { Event } from "../src/pipeline.ts";
import { JsonStringStream, ScreenedText } from "../src/stream.ts";
import { byId, firstExcerpt, freeMeter, index, price } from "./fixtures.ts";

const JD = "Senior AI Engineer. You will build multi-agent systems with LangGraph and fine-tune NLP models.";

const pieces = (s: string, size: number) => s.match(new RegExp(`[\\s\\S]{1,${size}}`, "g")) ?? [];

test("a JSON string value is decoded the same however the text is split", () => {
  const value = 'He said "ship it".\nThen: café, 100% \\ done.';
  const raw = JSON.stringify({ summary: value, other: "ignored" });
  for (const size of [1, 2, 3, 5, 11, raw.length]) {
    const s = new JsonStringStream("summary");
    const out = pieces(raw, size).map((p) => s.push(p)).join("");
    assert.equal(out, value.replace("\n", " "), `split into pieces of ${size}`);
  }
});

test("unicode escapes split across pieces are decoded", () => {
  const s = new JsonStringStream("summary");
  assert.equal(['{"summary":"caf\\u', "00", 'e9 ok"}'].map((p) => s.push(p)).join(""), "café ok");
});

test("screened text trails behind and releases everything on flush", () => {
  const sent: string[] = [];
  const s = new ScreenedText(isClean, (t) => sent.push(t));
  const text = "Strong evidence for multi-agent systems and retrieval with evaluation.";
  for (const p of pieces(text, 4)) s.push(p);
  assert.ok(s.sent.length > 0 && s.sent.length < text.length, "some text is held back while streaming");
  assert.ok(text.startsWith(s.sent));
  s.flush(text);
  assert.equal(sent.join(""), text);
});

test("a forbidden phrase is never released, even partially", () => {
  const cases = [
    ["serving 10,000+ users daily", "10,000"],
    ["runs on vllm in production", "vllm"],
    ["call 9123 4567 now", "9123"],
    ["mail a@b.com today", "@b.com"],
  ];
  for (const [bad, token] of cases) {
    const sent: string[] = [];
    const s = new ScreenedText(isClean, (t) => sent.push(t));
    const text = `The published work shows strong delivery, ${bad}, and more besides that follows on.`;
    for (const p of pieces(text, 3)) s.push(p);
    s.flush(text);
    const out = sent.join("");
    assert.ok(isClean(out), `released text stays clean for: ${bad}`);
    assert.ok(!out.includes(token), `nothing from the phrase leaked for: ${bad}`);
  }
});

const script = (summary: string): Partial<Record<Step, (r: ModelRequest) => unknown>> => ({
  gate: () => ({ is_job_description: true }),
  planner: () => ({ role: "Senior AI Engineer", requirements: [{ text: "Building multi-agent systems with LangGraph", importance: "must" }] }),
  retriever: (r) => ({ verdict: "strong", evidence: [firstExcerpt(r.user)] }),
  critic: () => ({ items: [] }),
  writer: () => ({ summary }),
});

async function run(summary: string) {
  const events: Event[] = [];
  let clock = 0;
  const outcome = await runPipeline(JD, {
    model: new ScriptedModel(script(summary)),
    index,
    byId,
    price,
    meter: freeMeter,
    emit: (e) => events.push(e),
    now: () => (clock += 10),
  });
  return { outcome, events };
}

test("the summary streams as deltas that add up to the final summary", async () => {
  const summary = "Strong, cited evidence for building multi-agent systems with LangGraph in production.";
  const { outcome, events } = await run(summary);
  assert.equal(outcome.status, "done");
  const deltas = events.filter((e) => e.type === "delta");
  assert.ok(deltas.length > 1, "more than one delta");
  assert.equal(deltas.map((e) => e.text).join(""), summary);
  const final = events.find((e) => e.type === "summary");
  assert.ok(final?.type === "summary" && final.text === summary);
});

test("a summary that fails the screen is replaced and its bad part never streamed", async () => {
  const { outcome, events } = await run("Great fit, with a product serving 10,000+ users across the region every day.");
  assert.ok(outcome.status === "done");
  const streamed = events.filter((e) => e.type === "delta").map((e) => e.text).join("");
  assert.ok(!/10,000|users/.test(streamed));
  const final = events.find((e) => e.type === "summary");
  assert.ok(final?.type === "summary" && final.text === outcome.report.summary && /^Of 1 requirement for/.test(final.text));
});

test("every event is timestamped in order, and steps carry time, tokens and cost", async () => {
  const { events } = await run("Strong evidence for multi-agent systems with LangGraph across two roles.");
  assert.ok(events.every((e, i) => typeof e.t === "number" && (i === 0 || e.t >= events[i - 1].t)));
  const done = events.filter((e) => e.type === "step" && e.state === "done");
  assert.equal(done.length, 5);
  assert.ok(done.every((e) => e.type === "step" && e.ms! > 0 && e.costMicro! > 0 && e.usage!.input > 0));
  const retriever = done.find((e) => e.type === "step" && e.step === "retriever");
  assert.ok(retriever?.type === "step" && retriever.id === "r1");
  const usage = events.filter((e) => e.type === "usage");
  assert.ok(usage.length >= 5, "running totals after every call");
  const last = usage.at(-1)!;
  assert.ok(last.type === "usage" && last.calls === 5 && last.costMicro === done.reduce((a, e) => a + (e.type === "step" ? e.costMicro! : 0), 0));
  assert.ok(events.some((e) => e.type === "verdict" && e.id === "r1" && e.verdict === "strong" && e.evidence.length === 1));
  assert.deepEqual(
    events.filter((e) => e.type === "say").map((e) => e.type === "say" && e.text),
    [
      "That's a job description. Reading the role.",
      "I picked the one requirement the advert stresses most. A retriever is now searching my case studies and CV.",
      "Evidence found for 1 of 1. A critic is now challenging the evidence.",
      "The critic kept every verdict. Writing the summary.",
    ],
  );
});
