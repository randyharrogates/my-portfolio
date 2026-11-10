// The HTTP entry. Every request passes the same gate (origin, burst limit), then
// one of four routes: GET /status, POST /run (a job description in, a streamed
// report out), POST /ask (a follow-up question about a stored report) and
// POST /mcp (the read-only search, published to MCP clients).

import corpusJson from "../corpus/corpus.json";
import { MAX_QUESTION_CHARS, MIN_QUESTION_CHARS, emptyMemory, runAsk } from "./ask.ts";
import type { AskEvent, AskOutcome, Memory } from "./ask.ts";
import { Bm25 } from "./bm25.ts";
import { dayOf } from "./budget.ts";
import { Burst } from "./burst.ts";
import { devModel } from "./devmodel.ts";
import { Ledger } from "./ledger.ts";
import { handleMcp } from "./mcp.ts";
import type { Kind } from "./ledger.ts";
import type { Meter } from "./metered.ts";
import type { Model, Price } from "./model.ts";
import { OpenAIModel } from "./openai.ts";
import { MAX_JD_CHARS, MIN_JD_CHARS, runPipeline } from "./pipeline.ts";
import type { Event, Outcome, Report } from "./pipeline.ts";
import { reportActions, suggestions } from "./suggest.ts";
import type { Action } from "./suggest.ts";
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
const CORPUS_ID = corpus.hash.slice(0, 12);

const MAX_BODY_BYTES = 16_384;
const burst = new Burst(20, 10_000); // the same 20 per 10 seconds as the BURST binding
// Below these there is no point starting: roughly the gate plus orchestrator calls, and one answer call.
const MIN_MICRO: Record<Kind, number> = { run: 1_500, question: 400 };
const DAY_SEC = 24 * 3600;

type Headers = Record<string, string>;

// On every response: nothing here is a document, so it may not be sniffed, framed, or run anything.
const SECURE: Headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
};

const json = (status: number, body: unknown, headers: Headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...SECURE, ...headers } });

function cors(env: Env, origin: string | null): Headers | null {
  const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
  if (!origin || !allowed.includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Visitor, Mcp-Protocol-Version",
    "Access-Control-Expose-Headers": "X-Visitor, Retry-After",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

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

// What the page is sent when a run or a question ends. The report itself has
// already been streamed piece by piece, so only the status travels here.
type Frame =
  | Event
  | AskEvent
  | { type: "outcome"; outcome: { status: Outcome["status"] }; cached: boolean; runsLeft: number | null; reportId: string | null; suggestions: string[]; actions: Action[] }
  | { type: "outcome"; outcome: { status: AskOutcome["status"] }; questionsLeft: number; suggestions: string[] };

// A finished run, kept for a day: its events replay the same job description for
// free, and its report is what follow-up questions are asked about.
interface Stored {
  events: Event[];
  report: Report;
}

const sse = (frames: Frame[]) => frames.map((f) => `data: ${JSON.stringify(f)}\n\n`).join("");

const runEnd = (outcome: Outcome, cached: boolean, runsLeft: number | null, reportId: string | null): Frame => ({
  type: "outcome",
  outcome: { status: outcome.status },
  cached,
  runsLeft,
  reportId,
  suggestions: outcome.status === "done" ? suggestions(outcome.report) : [],
  actions: outcome.status === "done" ? reportActions(outcome.report) : [],
});

// Runs `work` in the background and streams every frame it sends as one SSE message.
function stream(ctx: ExecutionContext, headers: Headers, work: (send: (f: Frame) => void) => Promise<void>): Response {
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

// Everything a route needs once the request has passed the shared checks.
interface Ctx {
  env: Env;
  ctx: ExecutionContext;
  ip: string;
  cors: Headers;
  sse: Headers;
  ledger: DurableObjectStub<Ledger>;
  model: Model;
  price: Price;
  meter: Meter;
  visitorHeader: string | null;
}

const liveOff = (c: { cors: Headers }) => json(503, { error: "live_runs_off", fallback: "replay" }, c.cors);

// Counts this run or question against the visitor's limits, or says why not.
async function begin(c: Ctx, kind: Kind, visitorId: string): Promise<{ keys: string[]; left: number } | Response> {
  const prefix = kind === "question" ? "q:" : "";
  const keys = [`${prefix}v:${visitorId}`, `${prefix}ip:${await hashIp(c.env.VISITOR_SECRET, c.ip, dayOf(Date.now()))}`];
  const started = await c.ledger.begin(keys, MIN_MICRO[kind], kind);
  if (started.ok) return { keys, left: started.runsLeft };
  if (started.reason === "budget") return liveOff(c);
  return json(429, { error: started.reason }, { ...c.cors, "Retry-After": String(started.retryAfterSec) });
}

async function handleRun(c: Ctx, body: Record<string, unknown>): Promise<Response> {
  const jd = typeof body.jd === "string" ? body.jd.trim() : "";
  if (jd.length < MIN_JD_CHARS || jd.length > MAX_JD_CHARS) return json(400, { error: "jd_length", min: MIN_JD_CHARS, max: MAX_JD_CHARS }, c.cors);

  // A fresh, single-use human check per run.
  if (!(await turnstileOk(c.env, body.turnstileToken, c.ip))) return json(403, { error: "turnstile_failed" }, c.cors);

  // Anonymous visitor identity: a signed token the page keeps and sends back.
  let visitorId = await verifyVisitorToken(c.env.VISITOR_SECRET, c.visitorHeader);
  const headers = { ...c.sse };
  if (!visitorId) {
    const issued = await issueVisitorToken(c.env.VISITOR_SECRET);
    visitorId = issued.id;
    headers["X-Visitor"] = issued.token;
  }

  // The same job description within a day costs nothing and uses no run.
  const reportId = await sha256Hex(jd.replace(/\s+/g, " ").toLowerCase());
  const cacheKey = `fit:${CORPUS_ID}:${reportId}`;
  const hit = await c.env.CACHE.get<Stored>(cacheKey, "json");
  if (hit) return new Response(sse([...hit.events, runEnd({ status: "done", report: hit.report }, true, null, reportId)]), { headers });

  const started = await begin(c, "run", visitorId);
  if (started instanceof Response) return started;

  return stream(c.ctx, headers, async (send) => {
    const events: Event[] = [];
    let outcome: Outcome = { status: "failed", step: "gate" };
    let stored = false;
    try {
      outcome = await runPipeline(jd, {
        model: c.model,
        index,
        byId,
        price: c.price,
        meter: c.meter,
        emit: (e) => {
          events.push(e);
          send(e);
        },
      });
      if (outcome.status === "done") {
        await c.env.CACHE.put(cacheKey, JSON.stringify({ events, report: outcome.report } satisfies Stored), { expirationTtl: DAY_SEC });
        stored = true;
      }
    } finally {
      // an unexpected error still ends the stream with a clear outcome
      await c.ledger.end(started.keys, "run");
      send(runEnd(outcome, false, started.left, stored ? reportId : null));
    }
  });
}

async function handleAsk(c: Ctx, body: Record<string, unknown>): Promise<Response> {
  const reportId = typeof body.reportId === "string" && /^[0-9a-f]{64}$/.test(body.reportId) ? body.reportId : "";
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!reportId) return json(400, { error: "bad_report" }, c.cors);
  if (question.length < MIN_QUESTION_CHARS || question.length > MAX_QUESTION_CHARS)
    return json(400, { error: "question_length", min: MIN_QUESTION_CHARS, max: MAX_QUESTION_CHARS }, c.cors);

  // Only a visitor who already passed the human check on /run holds a signed token.
  const visitor = await verifyVisitorToken(c.env.VISITOR_SECRET, c.visitorHeader);
  if (!visitor) return json(401, { error: "no_visitor" }, c.cors);

  // Conversation memory lives here, per visitor and report, never in the request.
  const memoryKey = `chat:${reportId}:${visitor}`;
  const [stored, remembered] = await Promise.all([c.env.CACHE.get<Stored>(`fit:${CORPUS_ID}:${reportId}`, "json"), c.env.CACHE.get<Memory>(memoryKey, "json")]);
  if (!stored) return json(410, { error: "report_expired" }, c.cors);
  const memory = remembered && Array.isArray(remembered.turns) ? remembered : emptyMemory();

  const started = await begin(c, "question", visitor);
  if (started instanceof Response) return started;

  return stream(c.ctx, c.sse, async (send) => {
    let outcome: AskOutcome = { status: "failed" };
    try {
      outcome = await runAsk(question, stored.report, memory, { model: c.model, index, byId, price: c.price, meter: c.meter, emit: send });
      if (outcome.status === "answered") {
        await c.env.CACHE.put(memoryKey, JSON.stringify(outcome.memory), { expirationTtl: DAY_SEC });
      }
    } finally {
      await c.ledger.end(started.keys, "question");
      const asked = [...memory.turns.map((t) => t.q), question];
      send({ type: "outcome", outcome: { status: outcome.status }, questionsLeft: started.left, suggestions: outcome.status === "answered" ? suggestions(stored.report, asked) : [] });
    }
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. Origin. Browsers from other sites, and anything with no Origin, stop here.
    // The one exception: MCP clients are programs, not pages, and send no Origin.
    // /mcp reads public text and makes no model call, so there is nothing to protect
    // from them beyond the burst limit. A browser on another site is still refused.
    const origin = request.headers.get("Origin");
    const isMcp = url.pathname === "/mcp";
    const corsHeaders = cors(env, origin) ?? (isMcp && !origin ? {} : null);
    if (!corsHeaders) return json(403, { error: "origin_not_allowed" });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

    // 2. Burst limit per IP, before any other work.
    const ip = request.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
    if (!burst.allow(ip, Date.now()) || !(await env.BURST.limit({ key: ip })).success) return json(429, { error: "slow_down" }, { ...corsHeaders, "Retry-After": "10" });

    // 3. The kill switch, and whether a model is configured at all.
    const hasModel = Boolean(env.OPENAI_API_KEY) || env.ENVIRONMENT === "dev";
    const enabled = env.AGENT_ENABLED === "true" && hasModel;
    const ledger = env.LEDGER.get(env.LEDGER.idFromName("global"));

    if (request.method === "GET" && url.pathname === "/status") {
      return json(200, { live: enabled && (await ledger.live(MIN_MICRO.run)), corpus: CORPUS_ID }, corsHeaders);
    }
    if (isMcp && request.method !== "POST") return json(405, { error: "post_only" }, { ...corsHeaders, Allow: "POST" });
    const route = request.method === "POST" ? { "/run": handleRun, "/ask": handleAsk }[url.pathname] : undefined;
    if (!route && !isMcp) return json(404, { error: "not_found" }, corsHeaders);

    // 4. Size and shape of the request. JSON only: a plain HTML form cannot send it.
    if (!(request.headers.get("Content-Type") ?? "").toLowerCase().startsWith("application/json")) return json(415, { error: "json_only" }, corsHeaders);
    if (Number(request.headers.get("Content-Length") ?? "0") > MAX_BODY_BYTES) return json(413, { error: "too_large" }, corsHeaders);
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json(413, { error: "too_large" }, corsHeaders);
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
    if (isMcp) {
      const reply = handleMcp(body, { index, byId, version: CORPUS_ID });
      return reply.body === null ? new Response(null, { status: reply.status, headers: { ...SECURE, ...corsHeaders } }) : json(reply.status, reply.body, corsHeaders);
    }
    if (typeof body !== "object" || body === null || Array.isArray(body) || !route) return json(400, { error: "bad_json" }, corsHeaders);
    if (!enabled) return liveOff({ cors: corsHeaders });

    return route(
      {
        env,
        ctx,
        ip,
        cors: corsHeaders,
        sse: { ...corsHeaders, ...SECURE, "Content-Type": "text/event-stream" },
        ledger,
        model: env.OPENAI_API_KEY ? new OpenAIModel(env.OPENAI_API_KEY, env.OPENAI_MODEL, env.OPENAI_REASONING_EFFORT) : devModel(),
        price: { inputPerM: Number(env.PRICE_INPUT_PER_M), cachedPerM: Number(env.PRICE_CACHED_PER_M), outputPerM: Number(env.PRICE_OUTPUT_PER_M) },
        meter: { reserve: (m) => ledger.reserve(m), settle: (id, m) => ledger.settle(id, m) },
        visitorHeader: request.headers.get("X-Visitor"),
      },
      body as Record<string, unknown>,
    );
  },
} satisfies ExportedHandler<Env>;
