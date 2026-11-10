# Role-fit agent: plan

A visitor pastes a job description. A small multi-agent pipeline reads it, retrieves evidence from the
portfolio's own case studies, and returns a cited fit report with honest gaps. The page shows the run
as it happens (agents, retrieved chunks, context, token usage). No login.

Status: plan only. Nothing here is built. Decisions confirmed by Randy on 2026-11-10 are in section 9.

## 1. What the visitor sees

Route `/fit` (linked from Home and the Ask palette).

1. Paste a JD (or pick one of three sample JDs, which replay a recorded run at zero cost).
2. Turnstile check runs invisibly, then the run starts.
3. Left (1.618): the report as it streams. Requirement, verdict (strong / partial / gap), evidence
   quote, link to the case study. Gaps are listed, not hidden.
4. Right (1): the harness panel. One row per agent step with status, the chunks it retrieved, what the
   critic rejected, context size and tokens used (input, output, cached). No dollar figures are shown. A "memory" card shows what is remembered and a
   clear button.
5. Footer line: runs left today, and "answers come only from this site's case studies and CV".

## 2. Pipeline (fixed shape, code-orchestrated)

The orchestration is plain code in the Worker, not a model-driven loop, so the number of calls per run
is bounded by construction.

| Step | Model call | Purpose | Output cap |
|---|---|---|---|
| 0 Gate | 1 | Is this a job description? If not, stop with a polite message | 100 tokens |
| 1 Planner | 1 | Extract up to 6 requirements as structured JSON | 500 |
| 2 Retrievers | up to 6, parallel | Per requirement: BM25 over the corpus (no model), then one call to pick and quote evidence | 300 each |
| 3 Critic | 1 | Drop any claim whose quote is not in the retrieved text; mark gaps | 600 |
| 4 Writer | 1 | Final report from the surviving evidence only | 900 |

- Maximum 10 calls per run. Model: OpenAI's low-cost GPT-6 tier (GPT-6 Luna, $0.10 / $0.50 per million
  tokens, cached input $0.01, per third-party price trackers in Nov 2026). **Confirm the exact model id and
  price on OpenAI's own models and pricing pages before coding; do not guess the id.** Use the official
  `openai` SDK, lowest reasoning effort, structured outputs (JSON schema) for steps 0 to 3. The model id is
  one Worker variable so it can be swapped without a code change.
- Corpus: `corpus.json`, built at deploy time from `src/site/data.ts` (17 projects, career, About) and the
  public CV text. Chunked with ids and source links. Shipped inside the Worker bundle. Public facts only.
- Retrieval is lexical (BM25) in the Worker. No embedding service, no vector database to pay for or
  secure. The retriever agent does the semantic judgement on the top 8 chunks.
- Every evidence quote is checked in code against the chunk text before it is shown (exact substring).
  A quote that does not match is dropped regardless of what the critic said.
- The system prompt and corpus prefix are identical across calls, so the provider's prompt caching applies.

## 3. No login: how identity works

Nobody signs in. The Worker needs to tell visitors apart only well enough to count runs.

- **Turnstile token per run.** The page gets a token from the invisible widget; the Worker verifies it
  with Cloudflare before doing anything else. No token, no run.
- **Anonymous visitor id.** On the first verified run the Worker issues an HMAC-signed id in an
  `HttpOnly`, `Secure`, `SameSite=None` cookie (the site and the Worker are on different origins). It
  carries no personal data, only a random id and an issue date.
- **Quota key = signed id and hashed IP, both counted.** Clearing cookies does not reset the IP count;
  changing IP does not reset the cookie count. The IP is stored only as a salted hash that rotates daily.
- **Memory lives in the visitor's browser.** Last JD summary and past reports go in `localStorage`
  (wrapped in try/catch). The server keeps no conversation history and does not store the JD text.
- A short notice on the page says what is sent, that it goes to OpenAI's API, and that it is not kept.

## 4. Cost control

Each layer works if the one above it fails.

| Layer | Control | Setting |
|---|---|---|
| Provider | Separate OpenAI project and key with a monthly budget. Confirm in the OpenAI console that the budget is a hard stop and not only an alert; if it is only an alert, the Worker's own monthly counter below is the hard stop | $10 |
| Monthly | Monthly budget in the Durable Object, priced from reported token usage; when spent, live runs stop until the 1st | $10 |
| Global | Daily token budget in a Durable Object (a slice of the monthly budget); when spent, the page switches to replay mode | about $0.33/day, roughly 60 runs |
| Per visitor | Runs per day by signed id and by hashed IP; one run at a time | 5/day |
| Burst | Per-IP short-window limits (section 5) | 1 run per 10 s, 20 requests per 10 s |
| Per run | Fixed pipeline, `max_tokens` per step, JD capped at 6,000 characters, 60 s wall clock | max 10 calls |
| Cache | Normalised JD hash to finished report, 24 h | repeat pastes cost nothing |
| Kill switch | `AGENT_ENABLED=false` Worker variable turns live runs off; replay still works | manual |

Estimated cost per run: about 22k input and 3k output tokens, roughly half a cent at
$0.10 / $0.50 per million. The $10 monthly cap therefore buys roughly 2,000 runs. Realistic traffic is far
lower. Cost is tracked internally for the budget only and never shown to visitors.

Budget is counted from the API's reported `usage` after each call, so the counter reflects real spend,
not an estimate.

## 5. Spam and DDoS

- **Reject cheaply, before any model call.** Order of checks in the Worker: method and `Origin`
  allowlist, body size, Turnstile verify, per-visitor quota, global budget, cache. Only then the gate call.
- **Burst limits against scripts and bots, two windows.** Workers Rate Limiting binding keyed by IP:
  20 requests per 10 seconds to any Worker route, and 1 run start per 10 seconds (confirm the binding's
  allowed periods in its docs). The Durable Object also enforces one in-flight run per visitor and per IP,
  which is exact where the binding is approximate. Over the limit returns 429 with `Retry-After`, before
  Turnstile is even verified. A Turnstile token is single-use, so a script cannot replay one.
- **Volumetric attack.** Cloudflare absorbs network-level floods. On Workers Paid, requests past
  the plan's included monthly quota are billed, so a flood costs a little in request fees but no model
  spend, because rejected requests never reach the model. Add a Cloudflare WAF rate-limiting rule on the
  Worker route as the outer layer so abusive IPs are blocked before the Worker runs. The portfolio itself is
  static on GitHub Pages, so it stays up; `/fit` falls back to replay mode.
- **The key never reaches the browser.** It is a Worker secret. CORS allows only the portfolio origin.
  CORS does not stop scripts, which is why Turnstile and the quotas exist.
- **Prompt injection.** The JD is untrusted input. Agents have no tools except retrieval over the public
  corpus, so the worst outcome is a silly report. Structured outputs, the quote check in code, and the
  gate step limit that. The report is rendered as text, never as HTML.
- **Free-chatbot abuse.** The gate step stops anything that is not a job description, at about 300 tokens.

## 6. Infrastructure

- New folder `worker/` in this repo: Cloudflare Worker (TypeScript, official `openai` SDK), one
  SQLite-backed Durable Object for counters and budget, KV for the report cache, Turnstile, SSE to the page.
- Deployed with `wrangler deploy` from a GitHub Action on changes under `worker/`.
- Runs on Randy's existing Workers Paid plan ($5/month), so the free plan's 10 ms CPU and daily request
  caps do not apply. Confirm the current included quotas and overage rates in the Cloudflare dashboard
  before launch.

## 7. Evaluation (also a public page)

- `evals/fit.jsonl`: about 15 JDs with expected verdicts per requirement, including three adversarial
  ones (injection text, a non-JD, a role with no fit).
- Checks: every quote is a substring of its source; no claim from the forbidden list (no "10,000+
  users", no client or model names that are confidential); gaps are reported where expected.
- Runs in CI before a Worker deploy. Results are written to `public/evals.json` and shown on
  `/fit/evals` as a scoreboard: pass rate per deploy and the current failures.

## 8. Build order

1. Corpus builder and BM25 retrieval, with unit tests. No model.
2. Worker pipeline behind the checks in section 5, tested locally with `wrangler dev`.
3. `/fit` page with the harness panel, replay mode first (recorded runs), then live.
4. Eval set, CI gate, scoreboard page.
5. Budget and key set up by Randy in the OpenAI and Cloudflare consoles (accounts and secrets
   are his to create). Then go live.

## 9. Decisions (Randy, 2026-11-10)

- Monthly cap: $10, total. Per visitor: 5 runs a day.
- Burst limits per 10 seconds against scripts and bots (section 5).
- Cloudflare: existing account on the Workers Paid plan.
- Harness panel shows token usage per run, not cost.
- Model: OpenAI's cheap GPT-6 tier, not Claude Haiku.

Still to confirm: the model's price on OpenAI's own pricing page (the id `gpt-6-luna` is listed in the
official `openai` SDK's model types), and that quality is good enough once the evaluation set runs.

## 10. Build log

- **Step 1 (done):** corpus builder, lexical retrieval, quote grounding check. `worker/corpus`, `worker/src/bm25.ts`, `quote.ts`.
- **Step 2 (done, 2026-11-10):** pipeline (`pipeline.ts`, `prompts.ts`), hard budget (`budget.ts`), visitor
  limits (`limits.ts`), anonymous identity (`visitor.ts`), the ledger Durable Object, the Worker entry and
  the OpenAI adapter. 43 tests with a scripted model; `tsc` clean; smoke-tested under `wrangler dev`
  (origin check, Turnstile, a full run over SSE, cache replay, burst 429, daily cap 429, edge rate limit).
  **Not yet run against a real model, and not deployed.**
- **Changed from the plan:** the visitor id travels in an `X-Visitor` header kept in `localStorage`, not a
  cookie. The site and the Worker are on different origins, so a cookie would be third-party and browsers
  block those. Free-text "notes" from the model were dropped from the report: a requirement shows a
  verdict and exact quotes only, and the summary is screened and falls back to one computed in code.
- **To deploy later:** create the KV namespace and put its id in `wrangler.toml`; set the secrets
  `OPENAI_API_KEY`, `TURNSTILE_SECRET`, `VISITOR_SECRET` with `wrangler secret put`; set
  `AGENT_ENABLED = "true"`.
- **Step 2b, streaming (done, 2026-11-10):** transport stays SSE over `fetch` (one-way, works through the
  Worker with no socket state; WebSockets would add nothing here). Every event now carries `t` (ms since
  the run started) so a cached or recorded run replays at its real pace. New events: `say` (plain-language
  narration for the conversation pane, composed in code, not by a model), `verdict` (a requirement's card
  filling in as its retriever finishes, and again if the critic lowers it), `delta` (the writer's summary
  as it is generated) and `summary` (the authoritative text, which replaces the deltas). `step` events
  carry the requirement id, `ms` and `costMicro`; `usage` is sent after every call with a running
  `costMicro`. The summary stream is screened: text is released four words behind and stops for good if the
  text so far fails the forbidden-claims check (`stream.ts`). 50 tests.
- **Decision reversed (2026-11-10):** estimated cost is now shown beside tokens and elapsed time, labelled
  as an estimate from token counts at list price. It replaces "no dollar figures" in section 1.
- **Designed, not built:** follow-up questions about a finished report (the input at the foot of the
  conversation pane). It needs a second endpoint and its own per-report cap.
- **Step 2c, follow-up chat (done, 2026-11-10):** report first, then questions. `POST /ask {reportId, question}`
  streams one search plus at most one model call (`ask.ts`). The reply is ordered scope, quotes, prose, so
  the code checks scope and grounds the quotes before any prose is streamed; an out-of-scope question or an
  answer with no grounded quote gets a fixed reply. Memory is server-side in KV per visitor and report (last
  4 turns, 24 h), and the previous turn's cited excerpts stay on the table for vague follow-ups. Limits:
  `QUESTIONS_PER_DAY = 5` per visitor and per IP, counted apart from runs, 5 s apart, 8 to 300 characters,
  same budget ledger. `/ask` needs the signed visitor token that `/run` issues after the human check, and a
  report this Worker stored in the last day (`reportId` arrives in the run's final frame). 59 tests;
  exercised under `wrangler dev` (401 without a token, 410 unknown report, 429 too fast, memory carried,
  off-topic refusal, 429 at the sixth question). **Not yet run against a real model.**
- **Step 3, voice, guardrails, page, case study (done, 2026-11-10):**
  - *Voice:* the agent answers as me, in first person (`voice.ts` holds the style notes and every fixed line).
  - *Guardrails in code (`guard.ts`):* hidden characters stripped and text folded before anything reads it;
    text that addresses the model is refused before any call is paid for (job descriptions and questions);
    model prose is screened for links, markup, leaked prompt wording and commitments (pay, dates, offers) and
    replaced by the checked quotes if it fails; role and requirement text a model wrote from visitor text is
    flattened to one plain line before it is shown or reused in a prompt.
  - *Transport hardening:* JSON-only POSTs, `nosniff`, a deny-all CSP and no-referrer on every Worker
    response; a site-wide Content Security Policy in `public/index.html` (no inline scripts, connections
    only to the site, GitHub's profile API and the Worker); links in the stream are rendered only when they
    are one of the site's own routes or the résumé PDF.
  - *Chips:* follow-up suggestions computed from the verdicts (`suggest.ts`) and page actions (email,
    résumé, case studies); a "not shown" answer offers "Email me".
  - *Page:* `src/site/fit/` (`/#/fit`, nav "Role fit"): conversation, report and trace panes at 1 : 1.618 : 1,
    tabs on a phone, elapsed time, tokens and estimated cost, session kept in the browser for 24 hours.
  - *Case study:* `role-fit` in `src/site/data.ts`, so the agent can cite its own design.
  - *Simplify pass:* one metered model caller (`metered.ts`) for the pipeline and the answers, one
    grounding function (`quote.ts`), one sanitiser, the request handler split into three routes, ledger
    state held in memory and written through, unused event fields and options removed.
  - *Real-model check:* `cd worker && npm run eval` runs 8 job descriptions and 12 questions (jailbreak
    attempts included) against the configured model under its own $0.50 cap, prints a scoreboard and, on a
    clean full run, records `public/site/fit/replays.json` for the page. **Not yet run: no key in
    `worker/.dev.vars`.**
- **To deploy later (adds to the list above):** set repository variables `FIT_API` (the Worker's URL) and
  `TURNSTILE_SITE_KEY` for the Pages build; the Worker origin is then allowed by the site CSP
  automatically. Push only after `npm run eval` passes on the real model.
