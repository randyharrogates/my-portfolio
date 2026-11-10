import type { Chunk } from "./types.ts";

// Lexical retrieval over the corpus. No model, no network: it runs inside the
// Worker for every requirement, so it has to be cheap and deterministic.

const STOP = new Set(
  // function words, plus the filler every job advert shares ("experience", "strong", "ability")
  "a an and are as at be by for from has have in is it its of on or that the this to was were will with you your we our they their i he his experience experienced required requirement requirements strong ability able work working using use plus role team teams years year including such etc preferred must should knowledge understanding familiarity proven skills skill"
    .split(" "),
);

// Terms that job descriptions and the corpus spell differently.
const ALIASES: Record<string, string[]> = {
  llm: ["llms", "gpt", "claude"],
  rag: ["retrieval"],
  retrieval: ["rag"],
  agent: ["agents", "agentic", "multiagent"],
  agents: ["agent", "agentic", "multiagent"],
  agentic: ["agent", "agents"],
  multiagent: ["agent", "agents"],
  eval: ["evals", "evaluation"],
  evaluation: ["eval", "evals"],
  k8s: ["kubernetes"],
  kubernetes: ["k8s"],
  js: ["javascript"],
  ts: ["typescript"],
  ml: ["machine", "learning"],
  nlp: ["ner"],
  finetuning: ["finetuned", "finetune"],
  finetune: ["finetuned", "finetuning"],
  ci: ["cicd"],
  cd: ["cicd"],
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/fine[- ]tun/g, "finetun")
    .replace(/multi[- ]agent/g, "multiagent")
    .replace(/ci\/cd/g, "cicd")
    .replace(/[^a-z0-9+#.]+/g, " ")
    .split(" ")
    .map((t) => t.replace(/^[.]+|[.]+$/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map(stem);
}

// A deliberately small stemmer: enough that "mentoring" finds "mentored" and
// "agents" finds "agent". Words with digits or symbols (node.js, c++) are left alone.
export function stem(t: string): string {
  if (t.length < 5 || /[^a-z]/.test(t)) return t;
  for (const [suffix, min] of [["ing", 4], ["ed", 4], ["es", 4], ["s", 3]] as const) {
    if (t.endsWith(suffix) && t.length - suffix.length >= min && !t.endsWith("ss")) {
      const base = t.slice(0, -suffix.length);
      // doubled consonant: "planned" -> "plan"
      return /([b-df-hj-np-tv-z])\1$/.test(base) && suffix !== "s" ? base.slice(0, -1) : base;
    }
  }
  return t;
}

const ALIAS_STEMS = new Map(
  Object.entries(ALIASES).map(([k, v]) => [stem(k), v.map(stem)] as const),
);

export interface Hit {
  chunk: Chunk;
  score: number;
}

export class Bm25 {
  private docs: { chunk: Chunk; tf: Map<string, number>; len: number }[];
  private df = new Map<string, number>();
  private avgLen: number;
  private readonly k1: number;
  private readonly b: number;

  constructor(chunks: Chunk[], k1 = 1.4, b = 0.75) {
    this.k1 = k1;
    this.b = b;
    this.docs = chunks.map((chunk) => {
      // The title is indexed with the text so "Jarvis" finds every Jarvis chunk.
      const tokens = tokenize(chunk.title + " " + chunk.text);
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
      return { chunk, tf, len: tokens.length };
    });
    const total = this.docs.reduce((n, d) => n + d.len, 0);
    this.avgLen = this.docs.length ? total / this.docs.length : 0;
  }

  // `perSource` caps how many chunks one project or CV role can contribute, so
  // one long case study cannot fill the whole context.
  search(query: string, k = 8, perGroup = 3): Hit[] {
    const terms = new Map<string, number>();
    for (const t of tokenize(query)) {
      terms.set(t, 1);
      for (const a of ALIAS_STEMS.get(t) ?? []) if (!terms.has(a)) terms.set(a, 0.5);
    }
    const n = this.docs.length;
    const hits: Hit[] = [];
    for (const d of this.docs) {
      let score = 0;
      for (const [t, weight] of terms) {
        const f = d.tf.get(t);
        if (!f) continue;
        const df = this.df.get(t) ?? 0;
        const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
        const norm = f + this.k1 * (1 - this.b + (this.b * d.len) / (this.avgLen || 1));
        score += weight * idf * ((f * (this.k1 + 1)) / norm);
      }
      if (score > 0) hits.push({ chunk: d.chunk, score });
    }
    hits.sort((x, y) => y.score - x.score || x.chunk.id.localeCompare(y.chunk.id));
    const out: Hit[] = [];
    const used = new Map<string, number>();
    for (const h of hits) {
      const group = h.chunk.id.split(":").slice(0, 2).join(":");
      const c = used.get(group) ?? 0;
      if (c >= perGroup) continue;
      used.set(group, c + 1);
      out.push(h);
      if (out.length === k) break;
    }
    return out;
  }
}
