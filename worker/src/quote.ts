import type { Chunk } from "./types.ts";

// The grounding check. A model's evidence quote is shown to a visitor only if it
// really appears in the chunk it cites. This runs in code, after the critic, and
// overrides whatever the critic decided.

const MIN_QUOTE_CHARS = 12;

export function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function quoteIsGrounded(quote: string, chunk: Chunk): boolean {
  const q = normalize(quote).replace(/^["'.\s]+|["'.\s]+$/g, "");
  if (q.length < MIN_QUOTE_CHARS) return false;
  return normalize(chunk.text).includes(q);
}

export interface Evidence {
  chunkId: string;
  quote: string;
}

// Keeps only evidence whose chunk exists and whose quote is in that chunk.
export function groundedEvidence(evidence: Evidence[], byId: Map<string, Chunk>): Evidence[] {
  return evidence.filter((e) => {
    const chunk = byId.get(e.chunkId);
    return chunk !== undefined && quoteIsGrounded(e.quote, chunk);
  });
}
