// The read-only tools over the published corpus. The chat's answer step may call
// search_portfolio; the MCP endpoint publishes both to any MCP client. Neither
// makes a model call, so neither can spend the budget.

import type { Bm25 } from "./bm25.ts";
import type { Tool } from "./model.ts";
import type { Chunk } from "./types.ts";

export const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

export const SEARCH_TOOL: Tool = {
  name: "search_portfolio",
  description: "Keyword search over Randy Chan's published case studies, career notes and CV. Returns the best-matching excerpts, each with an id, a title and its text.",
  parameters: obj({ query: { type: "string", description: "3 to 8 plain keywords: the skill, its other names, the tools it implies" } }),
};

export const EXCERPT_TOOL: Tool = {
  name: "get_excerpt",
  description: "Fetch one excerpt of Randy Chan's published work by the id that search_portfolio returned.",
  parameters: obj({ id: { type: "string", description: 'An excerpt id, for example "project:credit-memo:overview"' } }),
};

export const MAX_QUERY_CHARS = 200;
const MAX_HITS = 8;

export interface Excerpt {
  id: string;
  title: string;
  url: string;
  text: string;
}
// A chunk's url is a route on the site ("#/work/…") or its résumé file; outside the site it needs the whole address.
const SITE = "https://randyharrogates.github.io/my-portfolio/";
const excerpt = (c: Chunk): Excerpt => ({ id: c.id, title: c.title, url: SITE + c.url, text: c.text });

export const searchPortfolio = (index: Bm25, query: string, limit = MAX_HITS): Excerpt[] =>
  index.search(query.slice(0, MAX_QUERY_CHARS), Math.max(1, Math.min(MAX_HITS, limit))).map((h) => excerpt(h.chunk));

export const getExcerpt = (byId: Map<string, Chunk>, id: string): Excerpt | null => {
  const c = byId.get(id);
  return c ? excerpt(c) : null;
};
