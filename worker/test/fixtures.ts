// Shared by the tests and the eval runner: the real corpus, its search index, the
// configured-style price, a meter that never refuses, and a "model" helper that
// quotes the first excerpt it was offered.

import { readFileSync } from "node:fs";
import { Bm25 } from "../src/bm25.ts";
import type { Meter } from "../src/metered.ts";
import type { Corpus } from "../src/types.ts";

export const corpus = JSON.parse(readFileSync(new URL("../corpus/corpus.json", import.meta.url), "utf8")) as Corpus;
export const index = new Bm25(corpus.chunks);
export const byId = new Map(corpus.chunks.map((c) => [c.id, c]));
export const price = { inputPerM: 0.1, cachedPerM: 0.01, writePerM: 0.125, outputPerM: 0.5 };
export const freeMeter: Meter = { reserve: async () => "r", settle: async () => {} };

// Picks the first excerpt offered in a prompt and quotes its opening words.
export function firstExcerpt(prompt: string): { excerpt_id: string; quote: string } {
  const m = /<excerpt id="([^"]+)"[^>]*>\n([^\n]+)/.exec(prompt);
  if (!m) throw new Error("the prompt carries no excerpts");
  return { excerpt_id: m[1], quote: m[2].slice(0, 60) };
}
