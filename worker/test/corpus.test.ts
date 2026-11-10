import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildCorpus, cvChunks } from "../corpus/build.ts";
import { P } from "../../src/site/data.ts";
import type { Corpus } from "../src/types.ts";

const cvText = readFileSync(new URL("../corpus/cv.txt", import.meta.url), "utf8");
const corpus = buildCorpus(cvText);

test("every project contributes chunks that link to its case study", () => {
  for (const p of P) {
    const mine = corpus.chunks.filter((c) => c.id.startsWith(`project:${p.id}:`));
    assert.ok(mine.length >= 4, `${p.id} has ${mine.length} chunks`);
    for (const c of mine) assert.equal(c.url, `#/work/${p.id}`);
  }
});

test("chunk ids are unique and no chunk is empty", () => {
  assert.equal(new Set(corpus.chunks.map((c) => c.id)).size, corpus.chunks.length);
  for (const c of corpus.chunks) assert.ok(c.text.length > 20, c.id);
});

test("CV bullets carry the role they sit under", () => {
  const cv = cvChunks(cvText);
  const faiss = cv.find((c) => c.text.includes("FAISS"));
  assert.ok(faiss, "expected the FAISS bullet");
  assert.match(faiss.text, /^TrustPlus AI/);
  assert.equal(faiss.url, "Resume.pdf");
  assert.ok(cv.some((c) => c.id.startsWith("cv:jarvis:") && c.text.startsWith("Jarvis:")));
});

test("skills lines that wrap stay in one chunk", () => {
  const skills = cvChunks(cvText).filter((c) => c.id.startsWith("cv:skills:"));
  for (const c of skills) assert.match(c.text, /^[A-Z][A-Za-z -]{2,30}:/, c.text.slice(0, 60));
});

test("contact details and private facts stay out of the corpus", () => {
  const all = corpus.chunks.map((c) => c.text).join("\n");
  assert.doesNotMatch(all, /@outlook\.com|@gmail\.com/i);
  assert.doesNotMatch(all, /\b[89]\d{3}[ -]?\d{4}\b/, "looks like a Singapore phone number");
  assert.doesNotMatch(all, /10,000\+ users/i);
  assert.doesNotMatch(all, /\bvLLM\b|\bLlama\b/, "defence project must not name its model or serving stack");
});

test("the checked-in corpus.json matches a fresh build", () => {
  const onDisk = JSON.parse(readFileSync(new URL("../corpus/corpus.json", import.meta.url), "utf8")) as Corpus;
  assert.equal(onDisk.hash, corpus.hash, "run `npm run corpus` in worker/");
});
