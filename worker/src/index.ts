import corpusJson from "../corpus/corpus.json";
import { MAX_QUESTION_CHARS, MAX_TURNS_REMEMBERED, MIN_QUESTION_CHARS, runAsk } from "./ask.ts";
import type { AskEvent, AskOutcome, Turn } from "./ask.ts";
import { Bm25 } from "./bm25.ts";
import { dayOf } from "./budget.ts";
import { devModel } from "./devmodel.ts";
import { Ledger } from "./ledger.ts";
import type { Model, Price } from "./model.ts";
import { OpenAIModel } from "./openai.ts";
import { MAX_JD_CHARS, runPipeline } from "./pipeline.ts";
import type { Event, Outcome } from "./pipeline.ts";
import type { Chunk, Corpus } from "./types.ts";
import { hashIp, issueVisitorToken, verifyVisitorToken } from "./visitor.ts";

export { Ledger };

interface Env {
  LEDGER: DurableObjectNamespace<Ledger>;
  CACHE: KVNamespace;
  BURST: RateLimit;
  ALLOWED_ORIGINS: string; // comma-separated
  AGENT_ENABLED: string; // "true" turns live runs on: the kill switch
  ENVIRONMENT: string; // "dev" allows the keyless stand-in model
  OPENAI_MODEL: string;
  OPENAI_REASONING_EFFORT?: string;
  PRICE_INPUT_PER_M: string;
  PRICE_CACHED_PER_M: string;
  PRICE_OUTPUT_PER_M: string;
  MONTHLY_BUDGET_USD: string;
  DAILY_BUDGET_USD: string;
  RUNS_PER_DAY: string;
  QUESTIONS_PER_DAY: string;
  OPENAI_API_KEY?: string; // secret
  TURNSTILE_SECRET: string; // secret
  VISITOR_SECRET: string; // secret
}

const corpus = corpusJson as Corpus;
const index = new Bm25(corpus.chunks);
const byId = new Map<string, Chunk>(corpus.chunks.map((c) => [c.id, c]));

const MIN_JD_CHARS = 80;
const MAX_BODY_BYTES = 16_384;
// Below this there is no point starting a run (roughly the gate plus planner calls).
const MIN_RUN_MICRO = 1_500;
const CACHE_TTL_SEC = 24 * 3600;
// Roughly one answer call: below this a question is refused before any work.
const MIN_ASK_MICRO = 400;

function cors(env: Env, origin: string | null): Record<string, string> | null {
  const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
  if (!origin || !allowed.includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Visitor",
    "Access-Control-Expose-Headers": "X-Visitor, Retry-After",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers } });

const normalizeJd = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function turnstileOk(env: Env, token: unknown, ip: string): Promise<boolean> {
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const body = new FormData();
  body.set("secret", env.TURNSTILE_SECRET);
  body.set("response", token);
  body.set("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    return ((await r.json()) as { success?: boolean }).success === true;
  } catch {
    return false; // fail closed
  }
}

function pickModel(env: Env): Model | null {
  if (env.OPENAI_API_KEY) return new OpenAIModel(env.OPENAI_API_KEY, env.OPENAI_MODEL, env.OPENAI_REASONING_EFFORT);
  return env.ENVIRONMENT === "dev" ? devModel() : null;
}

// `reportId` is what a follow-up question quotes to say which report it is about.
type Frame =
  | Event
  | AskEvent
  | { type: "outcome"; outcome: Outcome; cached: boolean; runsLeft: number | null; reportId: string | null }
  | { type: "outcome"; outcome: AskOutcome; questionsLeft: number };

interface Stored {
  events: Event[];
  outcome: Outcome;
}

const sse = (frames: Frame[]) => frames.map((f) => `data: ${JSON.stringify(f)}\n\n`).join("");

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const corsHeaders = cors(env, origin);

    // 1. Origin. Browsers from other sites, and anything with no Origin, stop here.
    if (!corsHeaders) return json(403, { error: "origin_not_allowed" });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

    // 2. Burst limit per IP, before any other work.
    const ip = request.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
    const burst = await env.BURST.limit({ key: ip });
    if (!burst.success) return json(429, { error: "slow_down" }, { ...corsHeaders, "Retry-After": "10" });

    const ledger = env.LEDGER.get(env.LEDGER.idFromName("global"));
    const model = pickModel(env);
    const enabled = env.AGENT_ENABLED === "true" && model !== null;

    if (request.method === "GET" && url.pathname === "/status") {
      const live = enabled && (await ledger.live(MIN_RUN_MICRO));
      return json(200, { live, corpus: corpus.hash.slice(0, 12) }, corsHeaders);
    }
    if (request.method !== "POST" || (url.pathname !== "/run" && url.pathname !== "/ask")) return json(404, { error: "not_found" }, corsHeaders);

    // 3. Size and shape of the request.
    if (Number(request.headers.get("Content-Length") ?? "0") > MAX_BODY_BYTES) return json(413, { error: "too_large" }, corsHeaders);
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json(413, { error: "too_large" }, corsHeaders);
    let body: { jd?: unknown; turnstileToken?: unknown; reportId?: unknown; question?: unknown };
    try {
      body = JSON.parse(raw);
    } catch {
      return json(400, { error: "bad_json" }, corsHeaders);
    }
    const price: Price = {
      inputPerM: Number(env.PRICE_INPUT_PER_M),
      cachedPerM: Number(env.PRICE_CACHED_PER_M),
      outputPerM: Number(env.PRICE_OUTPUT_PER_M),
    };
    const meter = { reserve: (m: number) => ledger.reserve(m), settle: (id: string, m: number) => ledger.settle(id, m) };
    const sseHeaders = { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-store" };

    // A follow-up question about a report this Worker produced in the last day.
    if (url.pathname === "/ask") {
      const reportId = typeof body.reportId === "string" && /^[0-9a-f]{64}$/.test(body.reportId) ? body.reportId : "";
      const question = typeof body.question === "string" ? body.question.trim() : "";
      if (!reportId) return json(400, { error: "bad_report" }, corsHeaders);
      if (question.length < MIN_QUESTION_CHARS || question.length > MAX_QUESTION_CHARS)
        return json(400, { error: "question_length", min: MIN_QUESTION_CHARS, max: MAX_QUESTION_CHARS }, corsHeaders);
      if (!enabled || !model) return json(503, { error: "live_runs_off", fallback: "replay" }, corsHeaders);
      // Only a visitor who already passed the human check on /run holds a signed token.
      const visitor = await verifyVisitorToken(env.VISITOR_SECRET, request.headers.get("X-Visitor"));
      if (!visitor) return json(401, { error: "no_visitor" }, corsHeaders);
      const stored = await env.CACHE.get<Stored>(`fit:${corpus.hash.slice(0, 12)}:${reportId}`, "json");
      if (!stored || stored.outcome.status !== "done") return json(410, { error: "report_expired" }, corsHeaders);
      const report = stored.outcome.report;

      const qKeys = [`q:v:${visitor}`, `q:ip:${await hashIp(env.VISITOR_SECRET, ip, dayOf(Date.now()))}`];
      const begun = await ledger.begin(qKeys, MIN_ASK_MICRO, "question");
      if (!begun.ok) {
        if (begun.reason === "budget") return json(503, { error: "live_runs_off", fallback: "replay" }, corsHeaders);
        return json(429, { error: begun.reason }, { ...corsHeaders, "Retry-After": String(begun.retryAfterSec) });
      }
      // Conversation memory lives here, per visitor and report, never in the request.
      const memoryKey = `chat:${reportId}:${visitor}`;
      const history = (await env.CACHE.get<Turn[]>(memoryKey, "json")) ?? [];
      return stream(ctx, sseHeaders, async (send) => {
        let outcome: AskOutcome = { status: "failed" };
        try {
          outcome = await runAsk(question, report, history, { model, index, byId, price, meter, emit: send });
          if (outcome.status === "answered") {
            const turn: Turn = { q: question, a: outcome.answer.text, chunkIds: outcome.answer.evidence.map((e) => e.chunkId) };
            await env.CACHE.put(memoryKey, JSON.stringify([...history, turn].slice(-MAX_TURNS_REMEMBERED)), { expirationTtl: CACHE_TTL_SEC });
          }
        } catch {
          // an unexpected error still ends the stream with a clear outcome
        } finally {
          await ledger.end(qKeys);
          send({ type: "outcome", outcome, questionsLeft: begun.runsLeft });
        }
      });
    }

    const jd = typeof body.jd === "string" ? body.jd.trim() : "";
    if (jd.length < MIN_JD_CHARS || jd.length > MAX_JD_CHARS) return json(400, { error: "jd_length", min: MIN_JD_CHARS, max: MAX_JD_CHARS }, corsHeaders);

    // 4. Kill switch, or no model configured.
    if (!enabled || !model) return json(503, { error: "live_runs_off", fallback: "replay" }, corsHeaders);

    // 5. Turnstile: a fresh, single-use token per run.
    if (!(await turnstileOk(env, body.turnstileToken, ip))) return json(403, { error: "turnstile_failed" }, corsHeaders);

    // 6. Anonymous visitor identity.
    let visitorId = await verifyVisitorToken(env.VISITOR_SECRET, request.headers.get("X-Visitor"));
    let visitorToken: string | null = null;
    if (!visitorId) {
      const issued = await issueVisitorToken(env.VISITOR_SECRET);
      visitorId = issued.id;
      visitorToken = issued.token;
    }
    const streamHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      ...(visitorToken ? { "X-Visitor": visitorToken } : {}),
    };

    // 7. Cache: the same job description within a day costs nothing and uses no run.
    const reportId = await sha256Hex(normalizeJd(jd));
    const cacheKey = `fit:${corpus.hash.slice(0, 12)}:${reportId}`;
    const hit = await env.CACHE.get<Stored>(cacheKey, "json");
    if (hit) return new Response(sse([...hit.events, { type: "outcome", outcome: hit.outcome, cached: true, runsLeft: null, reportId }]), { headers: streamHeaders });

    // 8. Per-visitor limits and the budget check, in the ledger.
    const keys = [`v:${visitorId}`, `ip:${await hashIp(env.VISITOR_SECRET, ip, dayOf(Date.now()))}`];
    const started = await ledger.begin(keys, MIN_RUN_MICRO);
    if (!started.ok) {
      if (started.reason === "budget") return json(503, { error: "live_runs_off", fallback: "replay" }, corsHeaders);
      return json(429, { error: started.reason }, { ...corsHeaders, "Retry-After": String(started.retryAfterSec) });
    }

    // 9. Run, streaming each event as it happens.
    return stream(ctx, streamHeaders, async (send) => {
      const events: Event[] = [];
      let outcome: Outcome = { status: "failed", step: "gate" };
      let stored = false;
      try {
        outcome = await runPipeline(jd, {
          model,
          index,
          byId,
          price,
          meter,
          emit: (e) => {
            events.push(e);
            send(e);
          },
        });
        if (outcome.status === "done") {
          await env.CACHE.put(cacheKey, JSON.stringify({ events, outcome } satisfies Stored), { expirationTtl: CACHE_TTL_SEC });
          stored = true;
        }
      } catch {
        // an unexpected error still ends the stream with a clear outcome
      } finally {
        await ledger.end(keys);
        send({ type: "outcome", outcome, cached: false, runsLeft: started.runsLeft, reportId: stored ? reportId : null });
      }
    });
  },
} satisfies ExportedHandler<Env>;

// Runs `work` in the background and streams every frame it sends as one SSE message.
function stream(ctx: ExecutionContext, headers: Record<string, string>, work: (send: (f: Frame) => void) => Promise<void>): Response {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  let closed = false;
  const send = (f: Frame) => {
    if (!closed) writer.write(enc.encode(sse([f]))).catch(() => (closed = true));
  };
  ctx.waitUntil(
    work(send)
      .catch(() => {})
      .finally(() => writer.close().catch(() => {})),
  );
  return new Response(readable, { headers });
}
