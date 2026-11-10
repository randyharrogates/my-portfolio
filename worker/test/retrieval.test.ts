import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Bm25, tokenize } from "../src/bm25.ts";
import { groundQuotes, quoteIsGrounded } from "../src/quote.ts";
import type { Chunk, Corpus } from "../src/types.ts";

const corpus = JSON.parse(readFileSync(new URL("../corpus/corpus.json", import.meta.url), "utf8")) as Corpus;
const index = new Bm25(corpus.chunks);
const ids = (q: string, k = 8) => index.search(q, k).map((h) => h.chunk.id);

test("stemming joins word forms without touching technical tokens", () => {
  assert.deepEqual(tokenize("mentoring mentored agents planned leads"), ["mentor", "mentor", "agent", "plan", "lead"]);
  assert.deepEqual(tokenize("aws k8s process"), ["aws", "k8s", "process"]);
});

test("tokenizer folds the spellings job descriptions use", () => {
  assert.deepEqual(tokenize("Fine-tuning multi-agent CI/CD"), ["finetun", "multiagent", "cicd"]);
  assert.deepEqual(tokenize("Node.js, C++ and the API."), ["node.js", "c++", "api"]);
});

// Requirement-style queries, as the planner will produce them, and where the evidence lives.
const CASES: [string, RegExp][] = [
  ["Experience building multi-agent systems with LangGraph", /credit-memo|agent-pilot|trustplus/],
  ["Fine-tuning transformer models for NLP", /clinical-nlp|ai-singapore/],
  ["Deploying on-premise RAG for sensitive data", /defence-rag|bgc-group/],
  ["Building MCP servers with OAuth", /mcp-pack|kestrel-mcp|trustplus|the-assembly-place/],
  ["Speech to text transcription", /speech/],
  ["Evaluation of LLM outputs, LLM-as-a-judge", /eval-code|credit-memo|trustplus|skills/],
  ["Infrastructure as code with Terraform on AWS", /the-assembly-place|trustplus/],
  ["Leading and mentoring engineers", /the-assembly-place|ai-singapore|singapore-army/],
];

for (const [query, expected] of CASES)
  test(`retrieves evidence for: ${query}`, () => {
    const top = ids(query, 5);
    assert.ok(top.some((id) => expected.test(id)), `top 5 were ${top.join(", ")}`);
  });

test("a requirement with no evidence returns little or nothing", () => {
  assert.deepEqual(ids("zzzz qqqq"), []);
});

test("no single project or role fills the whole result", () => {
  const groups = index.search("agent", 8).map((h) => h.chunk.id.split(":").slice(0, 2).join(":"));
  for (const g of new Set(groups)) assert.ok(groups.filter((x) => x === g).length <= 3, g);
});

test("search is deterministic", () => {
  assert.deepEqual(ids("RAG with hybrid retrieval and reranking"), ids("RAG with hybrid retrieval and reranking"));
});

const chunk: Chunk = {
  id: "t:1",
  source: "cv",
  title: "t",
  url: "Resume.pdf",
  text: "Moved search to in-memory FAISS and parallelised it; latency fell about 85% (700–1,400 ms to 100–250 ms). The team’s releases rose.",
};

test("a quote is grounded only when it appears in the cited chunk", () => {
  assert.ok(quoteIsGrounded("latency fell about 85%", chunk));
  assert.ok(quoteIsGrounded("“Moved search  to in-memory FAISS”", chunk), "quotes and whitespace are normalised");
  assert.ok(quoteIsGrounded("700-1,400 ms to 100-250 ms", chunk), "dash style is normalised");
  assert.ok(quoteIsGrounded("the team's releases rose", chunk), "apostrophe style and case are normalised");
  assert.ok(!quoteIsGrounded("latency fell about 95%", chunk), "a changed number is not grounded");
  assert.ok(!quoteIsGrounded("moved search to Elasticsearch", chunk));
  assert.ok(!quoteIsGrounded("FAISS", chunk), "too short to count as evidence");
});

test("evidence citing a missing chunk or an invented quote is dropped, and says why", () => {
  const drops: string[] = [];
  const kept = groundQuotes(
    [
      { excerpt_id: "t:1", quote: "latency fell about 85%" },
      { excerpt_id: "t:1", quote: "ten years of Rust experience" },
      { excerpt_id: "t:404", quote: "latency fell about 85%" },
      { excerpt_id: "t:1", quote: 42 },
    ],
    [chunk],
    3,
    (reason) => drops.push(reason),
  );
  assert.deepEqual(kept.map((e) => [e.chunkId, e.quote]), [["t:1", "latency fell about 85%"]]);
  assert.deepEqual(drops, ["quote_not_in_source", "unknown_source"]);
});
