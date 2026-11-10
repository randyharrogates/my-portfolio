import { isClean } from "./guard.ts";
import type { Chunk } from "./types.ts";

// The grounding check. A model's evidence quote is shown to a visitor only if it
// really appears in the chunk it cites. This runs in code, after the verifier, and
// overrides whatever a model decided.

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

export const MAX_QUOTE_CHARS = 240;

// A quote that passed the check, with where it came from.
export interface EvidenceOut {
  chunkId: string;
  quote: string;
  title: string;
  url: string;
}

export type DropReason = "quote_not_in_source" | "unknown_source";

// Turns a model's claimed evidence into evidence that may be shown. An item
// survives only if it cites an excerpt the model was actually offered, its quote
// really appears in that excerpt, and the quote says nothing the site must never say.
export function groundQuotes(claimed: Record<string, unknown>[], offered: Chunk[], max: number, onDrop: (reason: DropReason) => void = () => {}): EvidenceOut[] {
  const byId = new Map(offered.map((c) => [c.id, c]));
  const kept: EvidenceOut[] = [];
  for (const e of claimed) {
    if (typeof e.excerpt_id !== "string" || typeof e.quote !== "string") continue;
    const chunk = byId.get(e.excerpt_id);
    if (!chunk) onDrop("unknown_source");
    else if (!quoteIsGrounded(e.quote, chunk) || !isClean(e.quote)) onDrop("quote_not_in_source");
    else if (kept.length < max) kept.push({ chunkId: chunk.id, quote: e.quote.trim().slice(0, MAX_QUOTE_CHARS), title: chunk.title, url: chunk.url });
  }
  return kept;
}
