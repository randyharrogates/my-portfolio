import { SOFTWARE_YEARS } from "./years.ts";
export interface Theme {
  id: string;
  name: string;
  blurb: string;
}
export interface Project {
  id: string;
  theme: string;
  vis?: string;
  img?: string;
  art?: string; // generated illustration; never captioned as a screenshot
  shots?: string[];
  phones?: boolean;
  pos?: string;
  org: string;
  year: string;
  status: string;
  featured?: boolean;
  url?: string;
  term?: (string | null | [string, string])[];
  title: string;
  card: string;
  lede: string;
  role: string;
  problem: string;
  flow: [string, string][];
  system: string[];
  decisions: string[];
  results: [string, string][];
  tags: string[];
  links: [string, string][];
}
export interface Answer {
  q: string;
  tag: string;
  trace: string[];
  a: string;
  src: string;
}
export const THEMES: Theme[] = [
  {
    id: "multi",
    name: "Multi-agent systems",
    blurb:
      "Specialist agents that research, extract and check each other's work, with a person approving the decisions that matter.",
  },
  {
    id: "workflows",
    name: "AI-driven workflows",
    blurb:
      "Agents wired into real systems (mail, chat, CRMs, product APIs) that act as the signed-in user and ask before they act.",
  },
  {
    id: "products",
    name: "AI-native products",
    blurb:
      "Live products where an agent is part of the product, not a bolt-on.",
  },
  {
    id: "tooling",
    name: "Tooling for AI work",
    blurb:
      "Tools I built to make agent work repeatable: generated documents and evaluations with a spend cap.",
  },
  {
    id: "ml",
    name: "Applied ML and RAG",
    blurb:
      "Models and retrieval in production: clinical NLP, an on-premise RAG assistant and speech.",
  },
];

export const P: Project[] = [
  // ---------- Multi-agent systems
  {
    id: "credit-memo",
    art: "site/art-credit-memo.webp",
    theme: "multi",
    vis: "vis-memo",
    org: "TrustPlus AI",
    year: "2025–26",
    status: "Employer",
    featured: true,
    title: "Credit memos in minutes, every figure cited",
    card: "Eight specialist agents read statements, filings and the web, then write a credit memo that a judge model checks.",
    lede: "A multi-agent credit-risk and KYB product for financial institutions. Specialist agents research a company and write a cited credit memo; a second model checks every section, and high-risk calls wait for an analyst.",
    role: "Designed and built most of the product across the stack, from requirements and customer proofs of concept to production, and was on call for it.",
    problem:
      "Analysts spent most of a day assembling a credit memo from financial statements, filings and web research, then checking it by hand. The answer had to be faster without becoming less trustworthy.",
    flow: [
      [
        "Ingest",
        "Statements, filings and web results enter an event-driven pipeline",
      ],
      [
        "Research",
        "8 specialist agents in LangGraph, each owning part of the memo",
      ],
      ["Retrieve", "Hybrid search with rank fusion and reranking over FAISS"],
      ["Check", "A judge model checks each section against its sources"],
      [
        "Approve",
        "High-risk calls wait for an analyst; a chat edits the finished memo",
      ],
    ],
    system: [
      "8 specialist research agents orchestrated in LangGraph, with tool calling",
      "Hybrid retrieval with reciprocal rank fusion and reranking over FAISS",
      "A judge model, different from the writer, checks each section against its sources",
      "Evaluation before release: golden test sets re-run on prompt and model changes, RAGAS for retrieval, LangFuse evaluations",
      "Event-driven backend on Azure Service Bus with a LangChain multi-provider LLM layer and an Amazon Bedrock fallback",
    ],
    decisions: [
      "Moved vector search from MongoDB to in-memory FAISS when parallel load hit I/O limits and a bigger tier cost too much",
      "Separate judge and writer models, so a model never grades its own work",
      "Per-step timing and error fields in the run state, so failures are visible to users and to on-call",
      "Human approval only where the risk is high, so analysts review decisions, not typing",
    ],
    results: [
      ["5–60 min", "per memo, down from 6–24 hours"],
      ["~85%", "faster retrieval (700–1,400 ms to 100–250 ms)"],
      ["~4 → ~20", "releases a month after the move to Claude Code"],
    ],
    tags: [
      "LangGraph",
      "LangChain",
      "FastAPI",
      "React",
      "FAISS",
      "Azure Service Bus",
      "LangFuse",
    ],
    links: [],
  },
  {
    id: "kestrel",
    art: "site/art-kestrel.webp",
    theme: "multi",
    vis: "vis-kestrel",
    org: "Personal",
    year: "2026",
    status: "Private",
    featured: true,
    title: "Kestrel, policy review for financial advisers",
    card: "Four agents read an insurance policy, with confidence and a citation on every field, and nothing saves until an adviser confirms.",
    lede: "A multi-agent system that reads old insurance policies for financial advisers. Every field comes with a confidence score and a citation, and nothing is saved until an adviser confirms it.",
    role: "Solo: product, design and build.",
    problem:
      "Advisers re-key old policies by hand before they can review a client's cover, and every insurer formats documents differently. A wrong field is a compliance problem, not just a typo.",
    flow: [
      ["Read", "OCR on the policy document"],
      [
        "Extract",
        "Four agents fill about 19 fields, each with confidence and a citation",
      ],
      ["Clarify", "Batched questions instead of guesses"],
      ["Gate", "Deterministic compliance checks"],
      ["Confirm", "The adviser confirms; an audit trail is written"],
    ],
    system: [
      "OCR, then four field-group agents on the open-source claw-code agent runtime",
      "Per-field confidence and citations back to the page",
      "Batched clarification questions instead of guesses",
      "Deterministic compliance gates, a required human confirmation and an immutable audit trail",
      "Run progress streamed to a React front end over Server-Sent Events",
    ],
    decisions: [
      "Known cases are handled by rules, so the LLM only handles the edge cases",
      "Per-insurer memory playbooks grow through versioned updates with rollback",
      "Descriptive only: it never gives advice",
    ],
    results: [
      ["~19", "fields extracted per policy"],
      ["4", "specialist extraction agents"],
      ["3", "swappable LLM providers"],
    ],
    tags: ["Multi-agent", "OCR", "FastAPI", "React", "SSE", "audit trail"],
    links: [],
  },
  {
    id: "leetee",
    art: "site/art-leetee.webp",
    theme: "multi",
    org: "Personal",
    year: "2026",
    status: "Private",
    url: "leetee · research run (sample)",
    term: [
      ["k", "→ "],
      "scout     story beats in the company history",
      null,
      ["k", "→ "],
      "research  one agent per beat",
      null,
      ["k", "→ "],
      "judge     10 criteria · 7 gating",
      null,
      ["ok", "✓ "],
      "verdict   cited · with a buy ladder",
    ],
    title: "LeeTee, a cited stock-research agent",
    card: "Claude skills and multi-agent workflows that research a growth stock and write a cited verdict.",
    lede: "Research skills and multi-agent workflows that study a growth company against ten criteria and write a cited verdict, published to a private multi-tenant catalogue. Research only; it never trades.",
    role: "Solo.",
    problem:
      "Stock research is slow, and most summaries skip the hard history and the sources.",
    flow: [
      ["Scout", "Finds the real story beats in the company's history"],
      ["Research", "One agent per beat"],
      ["Judge", "Ten criteria, seven of them gating"],
      ["Publish", "A cited verdict with a buy ladder, to a private catalogue"],
    ],
    system: [
      "A scout pass finds the story beats, then one research agent runs per beat",
      "A ten-criteria pipeline with gating rules and a cited report",
      "A private multi-tenant catalogue on Next.js and Supabase",
    ],
    decisions: [
      "The company story is told but never scored, so narrative cannot sway the verdict",
      "Valuation sets the buy ladder, not the verdict",
      "Research only: no trading path exists",
    ],
    results: [
      ["10", "criteria, 7 of them gating"],
      ["2–24", "story chapters, sized to the company"],
      ["0", "trades: research only"],
    ],
    tags: ["Claude skills", "Multi-agent", "Python", "Next.js", "Supabase"],
    links: [],
  },
  {
    id: "agent-pilot",
    art: "site/art-agent-pilot.webp",
    theme: "multi",
    org: "AI Singapore",
    year: "2024",
    status: "Research pilot",
    url: "planner · agents (sample)",
    term: [
      ["k", "→ "],
      "agent  venue discovery",
      null,
      ["k", "→ "],
      "agent  activity recommendation",
      null,
      ["k", "→ "],
      "agent  itinerary optimisation",
      null,
      ["ok", "✓ "],
      "plan returned · LangGraph",
    ],
    title: "A multi-agent RAG planner",
    card: "Three LangGraph agents plan an outing together. A research pilot, not a production system.",
    lede: "A research pilot at AI Singapore: specialist LangGraph agents discover venues, recommend activities and optimise an itinerary over a retrieval layer.",
    role: "Part of the team on a research pilot.",
    problem:
      "Testing how specialist agents coordinate on a planning task with real retrieval.",
    flow: [
      ["Discover", "A venue agent searches the retrieval layer"],
      ["Recommend", "An activity agent proposes what to do"],
      ["Optimise", "An itinerary agent orders the plan"],
      ["Return", "LangGraph assembles the result"],
    ],
    system: [
      "LangGraph orchestration of three specialist agents",
      "FastAPI and Pinecone for retrieval",
      "A React chat front end, deployed on AWS ECS with ECR",
    ],
    decisions: [
      "Kept as a research pilot; the clinical NLP work was the production system",
    ],
    results: [
      ["3", "specialist agents"],
      ["AWS", "ECS and ECR"],
      ["Pilot", "research, not production"],
    ],
    tags: ["LangGraph", "RAG", "Pinecone", "FastAPI", "AWS"],
    links: [],
  },

  {
    id: "role-fit",
    art: "site/art-role-fit.webp",
    theme: "multi",
    org: "Personal",
    year: "2026",
    status: "Open source",
    title: "A role-fit agent, running on this site",
    card: "Paste a job description and five agents check it against my published work. Every claim is an exact quote, and you watch each step run.",
    lede: "The multi-agent system built into this portfolio. A visitor pastes a job description; a planner, up to six parallel retrievers, a critic and a writer return a cited fit report with the gaps listed, then answer follow-up questions in my voice. No login, a hard monthly spend cap, and the whole run streams to the page.",
    role: "Solo. I designed it and built it with Claude Code.",
    problem:
      "A chatbot that answers questions about me proves very little. I wanted the site itself to run a real multi-agent system that a stranger can try without signing in, that cannot invent experience I do not have, and that cannot run up a bill.",
    flow: [
      ["Gate", "Refuses anything that is not a job description"],
      ["Plan", "Picks the six requirements the advert stresses most"],
      ["Retrieve", "Six agents search in parallel and must quote exactly"],
      ["Critique", "A critic can lower a verdict, never raise one"],
      ["Write", "A summary streams, then follow-up questions open"],
    ],
    system: [
      "A fixed pipeline written in code on a Cloudflare Worker: gate, planner, up to six parallel retrievers, critic, writer. At most 10 model calls a run, each with a strict JSON schema and an output cap",
      "Retrieval is BM25 over excerpts built from this site's case studies and my CV. Search runs in code; a model only judges what search found",
      "Every quote must be an exact substring of the excerpt it cites, checked in code before it is shown. A claim with no surviving quote becomes a gap",
      "Typed server-sent events stream each step with elapsed time, tokens and estimated cost. Cached and recorded runs replay at the pace they really ran",
      "A Durable Object ledger reserves the worst-case cost before every call and settles the real one afterwards, so the monthly cap is a hard limit and not an alert",
      "No login: a signed anonymous token and a salted IP hash, a Turnstile check, 5 runs and 5 questions a day, and a 10-second gap between runs",
      "Follow-up questions keep the last four turns on the server, so the visitor cannot rewrite the agent's memory",
    ],
    decisions: [
      "A fixed pipeline over a free-roaming agent: the cost per run has a ceiling, and every step can be tested with a scripted model",
      "Keyword search over embeddings: a few hundred excerpts do not need a vector store, and every hit can be explained",
      "Server-sent events over WebSockets: the stream only flows one way, and it needs no connection state",
      "Guardrails in code, not in prompts: text that addresses the model is refused before any call, and the agent's prose is screened for links, leaked instructions and commitments made on my behalf",
      "A small, cheap model with the harness doing the hard part: the model picks quotes, the code decides what is true enough to show",
    ],
    results: [
      ["10", "model calls at most per run"],
      ["$10", "hard monthly spend cap"],
      ["TESTS", "automated tests"],
    ],
    tags: [
      "Cloudflare Workers",
      "Durable Objects",
      "OpenAI Responses API",
      "Server-sent events",
      "BM25",
      "TypeScript",
      "React",
    ],
    links: [
      ["Try it", "#/fit"],
      ["Code", "https://github.com/randyharrogates/my-portfolio/tree/master/worker"],
    ],
  },
  // ---------- AI-driven workflows
  {
    id: "jarvis",
    art: "site/art-jarvis.webp",
    theme: "workflows",
    vis: "vis-jarvis",
    org: "Personal",
    year: "2026",
    status: "Private",
    featured: true,
    title: "Jarvis, the agent I run my day on",
    card: "One long-lived Claude Code session that briefs me, keeps my notes, and asks before it sends anything.",
    lede: "My own long-running agent, built on Claude Code and in daily use since early 2026. It wakes on timers and on new mail, calendar and chat events, briefs me, files what I tell it, and asks my phone before it sends anything.",
    role: "Solo. I designed it, and built it by planning with Claude and implementing with Codex.",
    problem:
      "Mail, calendar, notes, training and job search lived in separate apps. I wanted one assistant that remembers, works in the background, and never acts on my behalf without asking.",
    flow: [
      [
        "Wake",
        "launchd timers and mail, calendar and chat watchers queue events",
      ],
      ["Recall", "Reads the Markdown vault and its search index"],
      ["Act", "Runs one of 27 skills: brief, triage, log, draft"],
      ["Gate", "Outbound or destructive actions ask my phone first"],
      ["Learn", "My corrections become standing rules"],
    ],
    system: [
      "One long-lived Claude Code session woken by launchd jobs and local watchers",
      "An event queue with cursors and idempotent handling, so every pass is safe to repeat",
      "A Markdown knowledge base as the source of truth, with a rebuildable SQLite and vector index",
      "Voice notes over chat with on-device speech-to-text and text-to-speech",
      "A pre-tool-use hook that gates outbound and destructive actions and relays approvals to my phone",
    ],
    decisions: [
      "Explored OpenClaw and ClaudeClaw early in 2026, then built my own",
      "Every email and web page is untrusted data, never instructions",
      "Timing lives in the operating system's scheduler, not in the agent",
    ],
    results: [
      ["27", "custom skills"],
      ["46", "test files"],
      ["9", "architecture decision records"],
    ],
    tags: [
      "Claude Code",
      "MCP",
      "Python",
      "SQLite + vectors",
      "on-device speech",
    ],
    links: [],
  },
  {
    id: "mcp-pack",
    art: "site/art-mcp-pack.webp",
    theme: "workflows",
    org: "TrustPlus AI",
    year: "2025–26",
    status: "Employer",
    url: "claude · tools (sample)",
    term: [
      ["k", "$ "],
      "claude mcp list",
      null,
      ["", "app-mcp   connected · 8 tools"],
      null,
      ["k", "→ "],
      "call memo.create  as the signed-in analyst",
      null,
      ["ok", "✓ "],
      "scope inherited · audit logged",
      null,
      ["k", "$ "],
      "skills regenerate --from openapi.json",
      null,
      ["ok", "✓ "],
      "14 skills · new endpoints picked up",
    ],
    title: "An MCP server and skill pack generated from the API",
    card: "Assistants drive the product as the signed-in user, and the skill pack regenerates from the OpenAPI spec.",
    lede: "A tool surface for AI assistants: an MCP server where every call runs as the signed-in user, and a Claude Code skill pack generated from the OpenAPI spec so new endpoints become agent tools automatically.",
    role: "Built the MCP server and the generator for the skill pack.",
    problem:
      "Assistants, skills and tests each needed their own way into the product, with their own authentication, and every new endpoint meant hand-writing another tool.",
    flow: [
      ["Spec", "The product's OpenAPI spec"],
      ["Generate", "14 Claude Code skills, one per router"],
      ["Serve", "An MCP server with 8 tools"],
      ["Sign in", "OAuth and JWT as the acting user"],
      ["Audit", "Every call logged under that user"],
    ],
    system: [
      "An MCP server over the product API with OAuth and JWT sign-in as the acting user",
      "Transparent re-authentication when a session expires",
      "A Claude Code skill pack and CLI shim generated from the OpenAPI spec, one skill per router",
    ],
    decisions: [
      "Generate the tool surface from the API contract instead of hand-writing it",
      "Scopes inherit the acting user, so permissions and the audit trail stay correct",
    ],
    results: [
      ["8", "MCP tools"],
      ["14", "skills generated from the spec"],
      ["1", "auth flow shared by every client"],
    ],
    tags: ["MCP", "Claude Code skills", "OpenAPI", "OAuth", "JWT"],
    links: [],
  },
  {
    id: "kestrel-mcp",
    art: "site/art-kestrel-mcp.webp",
    theme: "workflows",
    org: "Personal",
    year: "2026",
    status: "Private",
    url: "claude · kestrel tools (sample)",
    term: [
      ["k", "→ "],
      "tool  upload_document  policy.pdf",
      null,
      ["k", "→ "],
      "tool  validate_and_save_record",
      null,
      ["ok", "✓ "],
      "35 fields mapped · confidence + citations",
      null,
      ["w", "⚠ "],
      "3 gaps flagged for the adviser",
    ],
    title: "Kestrel MCP, policy review inside an assistant",
    card: "The MCP-native sibling of Kestrel: an AI assistant reviews policies through tools on one Cloudflare Worker.",
    lede: "An MCP-native version of Kestrel. Instead of another app, an adviser's AI assistant reviews old insurance policies through MCP tools served from a single Cloudflare Worker.",
    role: "Solo.",
    problem:
      "Advisers already work inside an AI assistant; they needed policy review there, with the same validation as the full app.",
    flow: [
      ["Upload", "A policy document through an MCP tool"],
      ["Map", "A 35-field roster with confidence and citations"],
      ["Flag", "Gaps flagged for the adviser"],
      ["Save", "Server-side validation on every save"],
    ],
    system: [
      "An MCP server on one Cloudflare Worker",
      "Document upload, field mapping with confidence and citations, gap flags",
      "Validated saves of records, summaries and customer reports",
    ],
    decisions: [
      "Ship the product as tools for an assistant, not a separate UI",
      "Validation happens on the server for every save, whatever the assistant sends",
    ],
    results: [
      ["35", "policy fields in the roster"],
      ["~19", "MCP tools"],
      ["1", "Cloudflare Worker"],
    ],
    tags: ["MCP", "Cloudflare Workers", "TypeScript"],
    links: [],
  },
  {
    id: "lee-rooms",
    art: "site/art-lee-rooms.webp",
    theme: "workflows",
    org: "Personal",
    year: "2026",
    status: "Private",
    url: "whatsapp · concierge (sample)",
    term: [
      ["k", "← "],
      "guest: is the room near the MRT?",
      null,
      ["k", "→ "],
      "ground  listings knowledge",
      null,
      ["k", "→ "],
      "draft   reply with the matching listing",
      null,
      ["w", "⏸ "],
      "booking → owner approves on Telegram",
    ],
    title: "A WhatsApp concierge with an approval gate",
    card: "An agent that answers rental enquiries on WhatsApp and books only with the owner's approval.",
    lede: "A WhatsApp concierge agent for a co-living rental brand. It answers enquiries from listing data and saves a booking only after the owner approves it on Telegram.",
    role: "Solo.",
    problem:
      "Rental enquiries arrive at all hours, and most are the same questions about rooms, prices and location.",
    flow: [
      ["Receive", "An enquiry arrives on WhatsApp"],
      ["Ground", "The answer is drawn from the listings"],
      ["Draft", "The agent drafts a reply"],
      ["Approve", "The owner approves bookings, or every reply, on Telegram"],
    ],
    system: [
      "A long-lived agent session wired to WhatsApp",
      "Answers grounded in the listings, with completeness checks",
      "A Telegram approval gate for bookings, or for every reply",
      "A local dashboard for the owner",
    ],
    decisions: [
      "Approval is configurable per mode instead of all or nothing",
      "No outbound messages to people who did not write first",
    ],
    results: [
      ["1", "long-lived agent session"],
      ["2", "approval modes"],
      ["0", "unsolicited messages"],
    ],
    tags: ["Claude Code", "WhatsApp", "Telegram", "TypeScript"],
    links: [],
  },

  // ---------- AI-native products
  {
    id: "twc",
    theme: "products",
    vis: "vis-twc",
    img: "site/twc.webp",
    shots: ["site/twc.webp", "site/twc-chat.webp"],
    org: "Personal",
    year: "2025",
    status: "Live · Open source",
    title: "TWC, an expense splitter with its own agent loop",
    card: "Drop in a receipt photo and an agent drafts the split for one-tap approval, entirely in the browser.",
    lede: "A group expense splitter whose centrepiece is a receipt-reading agent. It runs entirely in the browser, on an agent loop I wrote from scratch.",
    role: "Solo: design and build; open source.",
    problem:
      "Splitting a group dinner from a receipt photo, in mixed currencies, is slow and error-prone.",
    flow: [
      ["Upload", "A receipt photo, in the browser"],
      ["Read", "A vision model returns line items, validated by Zod"],
      ["Plan", "The agent drafts the split with idempotent tools"],
      ["Approve", "One tap to accept; nothing is written before"],
    ],
    system: [
      "An agent loop of up to 32 iterations with streamed phase labels and permission-gated tool dispatch",
      "Receipt vision with structured outputs validated by Zod",
      "One client interface over Anthropic, OpenAI and local OpenAI-compatible servers, each a hand-written fetch call",
      "API keys stay in a passphrase-encrypted vault in the browser, with spend caps",
    ],
    decisions: [
      "Plan mode removes write tools from the schema instead of trusting the prompt",
      "Conversation pruning at 60% of the context budget",
      "Money held in integer minor units so balances reconcile to zero",
    ],
    results: [
      ["32", "max iterations per agent run"],
      ["0", "servers or databases"],
      ["5", "idempotent tools"],
    ],
    tags: ["Agent loop", "Vision", "React", "TypeScript", "Zod"],
    links: [
      ["Try the demo", "https://randyharrogates.github.io/twc/"],
      ["Code", "https://github.com/randyharrogates/twc"],
    ],
  },
  {
    id: "leeseidon",
    theme: "products",
    vis: "vis-leeseidon",
    img: "site/leeseidon.webp",
    org: "Personal",
    year: "2026",
    status: "Live",
    title: "Leeseidon, investment tracking with an encryption-blind server",
    card: "Agents read your statements; the sync server only ever stores ciphertext.",
    lede: "A privacy-first investment tracker. Agents turn statements, PDFs and screenshots into trades, and the sync server only ever sees ciphertext.",
    role: "Solo: product, design and build.",
    problem:
      "Portfolio trackers want your financial data on their servers. I wanted the analytics without handing that over.",
    flow: [
      ["Drop", "A CSV, PDF or screenshot"],
      [
        "Extract",
        "A multi-turn agent turns it into trades through schematized tools",
      ],
      ["Reconcile", "The same engine as manual entry"],
      ["Sync", "Encrypted on the device; the server stores ciphertext"],
    ],
    system: [
      "Multi-turn agents extract trades from CSV, PDF and images through schematized tools",
      "A model-agnostic tool executor with streaming, retries and rate-limit handling",
      "One isomorphic TypeScript core powers the web app and a CLI that ships Claude Code skills",
      "Heavy simulations run in Web Workers",
    ],
    decisions: [
      "The vault passphrase never leaves the device",
      "AI-parsed statements go through the same engine as manual entry",
    ],
    results: [
      ["E2E", "encrypted sync"],
      ["1", "TypeScript core for web and CLI"],
      ["Live", "at leeseidon.com"],
    ],
    tags: ["React", "TypeScript", "Cloudflare Workers", "AES-GCM"],
    links: [["Visit leeseidon.com", "https://leeseidon.com"]],
  },
  {
    id: "tide-tally",
    theme: "products",
    url: "tide tally · agent (sample)",
    term: [
      ["k", "← "],
      "receipt.jpg  · read once, not stored",
      null,
      ["k", "→ "],
      "draft  Kopi  $3.40  Food & Drink",
      null,
      ["k", "→ "],
      "draft  Lunch $8.50  Food & Drink",
      null,
      ["w", "⏸ "],
      "review 2 drafts before saving",
      null,
      ["ok", "✓ "],
      "saved · synced when back online",
    ],
    img: "site/tally.webp",
    pos: "left center",
    shots: [
      "site/tally-1.webp",
      "site/tally-2.webp",
      "site/tally-3.webp",
      "site/tally-4.webp",
    ],
    phones: true,
    org: "Personal",
    year: "2026",
    status: "Live",
    title: "Tide Tally, an offline-first expense tracker with an agent",
    card: "Three taps to log a spend, even with no signal; hand the agent a receipt or statement and review what it drafts.",
    lede: "A mobile-first expense tracker built around one number and one gesture: how much is left, and three taps to log what you just spent. It works offline, and an agent turns receipts and statements into draft expenses you review before anything is saved.",
    role: "Solo: product, design and build, with Claude Code.",
    problem:
      "Most budgeting apps open onto a dashboard, need a signal, and nag. Logging a $3.40 coffee should take seconds, in a basement food court or on the MRT.",
    flow: [
      ["Capture", "The numpad is the home screen: amount, category, save"],
      ["Store", "Every write lands on the device first (IndexedDB)"],
      ["Sync", "A Cloudflare Pages Function and D1 sync in the background"],
      ["Ask", "The agent reads a receipt or statement and drafts expenses"],
      ["Review", "You confirm drafts; other software can log through OAuth"],
    ],
    system: [
      "React 19, TypeScript and Tailwind on Vite, with a hand-written WebGL shader for the water",
      "Offline-first storage in IndexedDB (Dexie) with background sync to a Cloudflare Pages Function and D1, on one origin",
      "An agent that turns an uploaded receipt or statement into draft expenses on the same review screen as manual entry",
      "An OAuth device flow with three scopes, so a coding agent or a script can log an expense, with an OpenAPI spec generated from the route table and a skill package published by CI",
      "Android and iOS builds with Capacitor; Vitest, Playwright (including an offline-capture suite) and invariant checks in CI",
    ],
    decisions: [
      "Uploaded documents are read once in the request and never stored",
      "The agent only drafts; nothing reaches the ledger until you save it",
      "Dropped end-to-end encryption that depended on a key another app could rotate, and said so plainly in the privacy note",
      "A free stack by design: Cloudflare Pages, Functions and D1",
    ],
    results: [
      ["3", "taps to log an expense"],
      ["Offline", "every write lands on the device first"],
      ["Live", "at tally.leeseidon.com"],
    ],
    tags: [
      "React",
      "TypeScript",
      "IndexedDB",
      "Cloudflare D1",
      "WebGL",
      "Capacitor",
      "OAuth",
    ],
    links: [["Visit Tide Tally", "https://tally.leeseidon.com"]],
  },
  {
    id: "verona",
    theme: "products",
    vis: "vis-verona",
    img: "site/verona.webp",
    org: "Personal",
    year: "2026",
    status: "Live",
    title: "Verona, a wedding app an agent can drive",
    card: "Guest list to dance floor: RSVPs, seating and a live photo wall, with an API an agent can use.",
    lede: "A mobile-first wedding app, from guest list to the dance floor. An OpenAPI contract keeps the API in step with the UI, so an agent can do anything a guest or couple can.",
    role: "Solo: product, design and build.",
    problem:
      "Wedding planning is spread across spreadsheets, chat groups and paper seating plans.",
    flow: [
      ["Contract", "One OpenAPI contract for the UI and the API"],
      ["App", "A Next.js PWA on Cloudflare Workers"],
      ["Data", "Supabase Postgres with row-level security and realtime"],
      ["Agent", "A bring-your-own agent can use every feature"],
    ],
    system: [
      "Next.js (App Router) PWA on Cloudflare Workers",
      "Supabase Postgres with row-level security, Google sign-in and realtime updates",
      "Photo uploads to object storage and a moderated live photo wall",
      "Playwright tests and CI auto-deploy; English, Chinese and Malay",
    ],
    decisions: [
      "An OpenAPI parity contract so an agent can use every feature",
      "Free-tier-only infrastructure as a cost guardrail",
    ],
    results: [
      ["3", "languages"],
      ["RLS", "row-level security in Postgres"],
      ["Live", "at verona.leeseidon.com"],
    ],
    tags: ["Next.js", "Supabase", "row-level security", "PWA"],
    links: [["Visit Verona", "https://verona.leeseidon.com"]],
  },

  // ---------- Tooling
  {
    id: "resume-builder",
    art: "site/art-resume-builder.webp",
    theme: "tooling",
    org: "Personal",
    year: "2026",
    status: "Private",
    url: "claude code · /resume (sample)",
    term: [
      ["k", "$ "],
      "/resume tailor jd.md",
      null,
      ["k", "→ "],
      "read     career notes · 8 roles",
      null,
      ["k", "→ "],
      "tool     compile · ats-check",
      null,
      ["ok", "✓ "],
      "resume.pdf · 2 pages · ATS ok",
    ],
    title: "Résumé Builder, a Claude Code plugin",
    card: "Three skills and an MCP server that turn career notes into tailored, ATS-safe résumés.",
    lede: "A Claude Code plugin that turns career notes into tailored, ATS-safe résumés and cover letters, with the deterministic build steps exposed as MCP tools.",
    role: "Solo. I directed Claude Code, which wrote most of the code.",
    problem:
      "Every application meant rewriting a CV from a blank page, and claims drifted from what actually happened.",
    flow: [
      ["Notes", "One source of truth for career facts"],
      ["Tailor", "A skill maps a job description to evidence"],
      ["Build", "MCP tools compile the PDF"],
      ["Check", "An ATS check on every build"],
    ],
    system: [
      "Skills for building the career notes, tailoring a résumé and writing a cover letter",
      "An MCP server that exposes the deterministic build steps (compile, checks) as tools",
      "A local companion app alongside the plugin",
    ],
    decisions: [
      "Every CV is generated from one source of truth",
      "Deterministic steps are tools; judgement stays with the model and the person",
    ],
    results: [
      ["3", "skills"],
      ["15", "MCP tools"],
      ["ATS", "check on every build"],
    ],
    tags: ["Claude Code plugin", "MCP", "LaTeX", "Python"],
    links: [],
  },
  {
    id: "eval-code",
    art: "site/art-eval-code.webp",
    theme: "tooling",
    org: "Personal",
    year: "2026",
    status: "Early",
    url: "eval-code · workspace (sample)",
    term: [
      ["k", "→ "],
      "ingest   raw dataset",
      null,
      ["k", "→ "],
      "clean    + explore with charts",
      null,
      ["k", "→ "],
      "eval     target system · hard spend cap",
      null,
      ["ok", "✓ "],
      "compare runs · drill into failures",
    ],
    title: "eval-code, an agent-first eval workbench",
    card: "A workspace for LLM, RAG and agent projects: data in, evals run under a hard spend cap, failures compared.",
    lede: "A workbench that replaces notebooks for LLM, RAG and multi-agent projects: ingest and clean data, define an eval target, run evals under a hard spend cap and compare runs.",
    role: "Solo; early stage.",
    problem:
      "LLM projects live in scattered notebooks, and eval runs can quietly burn money.",
    flow: [
      ["Ingest", "A raw dataset"],
      ["Explore", "Clean it and chart it"],
      ["Evaluate", "Run against a target under a hard spend cap"],
      ["Compare", "Compare runs and drill into failures"],
    ],
    system: [
      "Dataset ingest, cleaning and chart-based exploration",
      "Eval targets for RAG and agent systems",
      "A spend tracker that stops runs at a cap",
    ],
    decisions: [
      "Agent-first: the same tools serve the UI and an agent",
      "Spend limits are enforced, not just reported",
    ],
    results: [
      ["Hard", "spend cap on every run"],
      ["1", "workspace from raw data to compared runs"],
      ["May", "2026 start"],
    ],
    tags: ["Python", "LLM evals", "RAG", "agents"],
    links: [],
  },

  // ---------- Applied ML and RAG
  {
    id: "clinical-nlp",
    art: "site/art-clinical-nlp.webp",
    theme: "ml",
    vis: "vis-nlp",
    org: "AI Singapore",
    year: "2024",
    status: "Employer",
    title: "Clinical NLP in production",
    card: "Fine-tuned BioClinicalBERT and a downstream classifier, explained to clinicians.",
    lede: "A production NLP pipeline for a healthcare environment: entity extraction from clinical notes feeding a classifier that predicts clinical interventions, with explanations clinicians can read.",
    role: "AI engineer on the project: data preparation, fine-tuning, evaluation and serving. Also mentored 12 apprentices across two cohorts.",
    problem:
      "Clinical notes are unstructured, and clinicians need to see why a model made each call before they trust it.",
    flow: [
      ["Prepare", "Clean and explore clinical notes"],
      ["Extract", "Fine-tuned BioClinicalBERT tags entities"],
      ["Predict", "A classifier predicts interventions"],
      ["Explain", "EBM shows clinicians why"],
      ["Serve", "FastAPI and Docker, tracked in MLflow"],
    ],
    system: [
      "Data cleaning and exploration of unstructured clinical notes",
      "BioClinicalBERT fine-tuned in PyTorch for named-entity recognition, with other BERT models as baselines",
      "Extracted entities feed a downstream intervention classifier",
      "Evaluated on held-out data (precision, recall, F1); Kedro pipelines and MLflow tracking",
      "Served with FastAPI and Docker, and handed over with documentation",
    ],
    decisions: [
      "Explainable Boosting Machines so clinicians can read each prediction",
      "Hyperparameter tuning with documented quality, latency and compute-cost trade-offs",
    ],
    results: [
      ["5", "models in the pipeline"],
      ["12", "apprentices mentored"],
      ["EBM", "explanations for clinicians"],
    ],
    tags: ["PyTorch", "BioClinicalBERT", "Kedro", "MLflow", "FastAPI"],
    links: [],
  },
  {
    id: "defence-rag",
    art: "site/art-defence-rag.webp",
    theme: "ml",
    org: "BGC Group",
    year: "2024–25",
    status: "Employer",
    url: "assistant · on-premise (sample)",
    term: [
      ["k", "→ "],
      "retrieve  top chunks · vector store",
      null,
      ["k", "→ "],
      "answer    cited · 2 sources",
      null,
      ["w", "⚠ "],
      "complex request → hand off to a human",
      null,
      ["ok", "✓ "],
      "session state kept across turns",
    ],
    title: "An on-premise RAG assistant for a defence-sector client",
    card: "A knowledge assistant on a fully on-premise stack, with hand-off to a person for complex requests.",
    lede: "An enterprise knowledge assistant for a Singapore defence-sector client. The data could not leave the environment, so the whole stack ran on premise.",
    role: "Led the on-premise deployment of the whole stack with Docker, built the React front end, worked with the client's business users, and handed the system over with documentation.",
    problem:
      "Staff needed answers from internal documents that could not leave the client's environment.",
    flow: [
      ["Chunk", "Semantic-aware chunking of internal documents"],
      ["Retrieve", "Vector search, on premise"],
      ["Answer", "Cited answers in multi-turn sessions"],
      ["Escalate", "Complex requests hand off to a person"],
    ],
    system: [
      "A FastAPI application layer and middleware to the model endpoints",
      "Stateful multi-turn sessions with escalation to a human agent",
      "Semantic-aware chunking, tuned with embedding visualisations",
      "Weaviate for vectors, MongoDB for state, a React front end and Docker CI/CD across three environments",
    ],
    decisions: [
      "A fully on-premise stack instead of a cloud model API",
      "Hand complex intents to a person rather than guess",
    ],
    results: [
      ["On-prem", "the data never left"],
      ["3", "environments: dev, staging, production"],
      ["HITL", "hand-off to a person"],
    ],
    tags: ["RAG", "FastAPI", "Weaviate", "MongoDB", "React", "Docker"],
    links: [],
  },
  {
    id: "speech",
    art: "site/art-speech.webp",
    theme: "ml",
    org: "Personal",
    year: "2024",
    status: "Open source",
    url: "speech · transcribe (sample)",
    term: [
      ["k", "$ "],
      "upload meeting.m4a",
      null,
      ["k", "→ "],
      "whisper  transcribe",
      null,
      ["ok", "✓ "],
      "saved to history · searchable",
    ],
    title: "Speech-to-text with Whisper",
    card: "Whisper transcription served with FastAPI, with history and a React front end.",
    lede: "An end-to-end model-serving app: Whisper transcription behind FastAPI, a SQLite history and a React front end, all in Docker.",
    role: "Solo; open source.",
    problem:
      "A simple, private way to transcribe recordings and keep them searchable.",
    flow: [
      ["Upload", "An audio file"],
      ["Transcribe", "Whisper behind FastAPI"],
      ["Store", "SQLite history"],
      ["Search", "A React front end"],
    ],
    system: [
      "Whisper inference behind a FastAPI gateway",
      "SQLite for transcript history",
      "A React front end, all containerised",
    ],
    decisions: [
      "A small split of gateway, inference and storage that can scale out later",
    ],
    results: [
      ["Whisper", "served with FastAPI"],
      ["Docker", "end to end"],
      ["Multi", "language and format support"],
    ],
    tags: ["Whisper", "FastAPI", "React", "Docker"],
    links: [["Code", "https://github.com/randyharrogates/speech"]],
  },
];
export const CAREER: string[][] = [
  [
    "2026–now",
    "The Assembly Place",
    "Head of Technology and AI",
    "Leads a small team building the company's CRM, internal tools and an AI-agent console with approvals.",
  ],
  [
    "2025–26",
    "TrustPlus AI",
    "Senior AI Software Engineer",
    "Built most of a multi-agent credit-risk and KYB product.",
  ],
  [
    "2024–25",
    "BGC Group",
    "Senior Software Engineer (AI)",
    "An on-premise RAG assistant for a defence-sector client.",
  ],
  [
    "2024",
    "AI Singapore",
    "AI Engineer",
    "Clinical NLP in production; mentored 12 apprentices.",
  ],
  [
    "2022–23",
    "NCS",
    "Business Systems Analyst",
    "Automation for a nation-wide public healthcare application.",
  ],
  [
    "2022",
    "Bitopia",
    "Full-Stack Software Engineer",
    "Logistics and real-estate platforms.",
  ],
  [
    "2019–21",
    "Napshot",
    "Solutions and Software Engineer",
    "Custom platforms for small businesses.",
  ],
  [
    "2012–18",
    "Singapore Army",
    "Combat Engineer, Regular",
    "Led and trained teams before moving into software.",
  ],
];
export const LOOP: string[][] = [
  [
    "claude",
    "Plan",
    "Reads the codebase and breaks the work into concrete steps.",
  ],
  [
    "codex × several",
    "Build",
    "Implements in parallel worktrees and runs the tests until they pass.",
  ],
  ["claude", "Review", "Checks the diff against the plan and sends gaps back."],
  [
    "randy",
    "Own it",
    "Reads, approves, merges and stands behind every change.",
  ],
];
export const PILLARS: string[][] = [
  [
    "01",
    "AI-native development",
    "Claude Code and Codex in parallel every day; I plan, review and own every merge.",
    "#about",
    "How I work →",
  ],
  [
    "02",
    "AI-driven workflows",
    "Agents wired into mail, chat, CRMs and product APIs, acting as the signed-in user and asking before they act.",
    "#work/workflows",
    "See the workflows →",
  ],
  [
    "03",
    "Multi-agent systems",
    "Specialist agents that research, extract and check each other's work, with people approving what matters.",
    "#work/multi",
    "See the systems →",
  ],
  [
    "04",
    "Model training and fine-tuning",
    "Fine-tuned BioClinicalBERT for clinical NER in a healthcare deployment, and trained PyTorch classification models that run in production.",
    "#work/ml",
    "See the models →",
  ],
];

export const QA: Answer[] = [
  {
    q: "What has he shipped?",
    tag: "4 sources",
    trace: [
      "search  cv · projects",
      "read    TrustPlus AI, Jarvis, TWC, Leeseidon",
    ],
    a: "A multi-agent credit-risk and KYB product at TrustPlus AI, Jarvis (his own long-running agent), and live side products: Leeseidon, TWC and Verona.",
    src: "CV · TrustPlus AI · Projects",
  },
  {
    q: "How does he use coding agents?",
    tag: "2 sources",
    trace: [
      'search  cv · "Claude Code"',
      "read    TrustPlus AI · The Assembly Place",
    ],
    a: "Claude Code plans and reviews while Codex implements and runs the tests, in parallel git worktrees. Moving a team onto this took releases from about 4 a month to about 20.",
    src: "CV · TrustPlus AI · The Assembly Place",
  },
  {
    q: "Has he built multi-agent systems?",
    tag: "2 sources",
    trace: ['search  cv · "agents"', "read    TrustPlus AI · Kestrel"],
    a: "Yes. Eight specialist LangGraph agents that write cited credit memos checked by a judge model, and Kestrel, where four agents extract policy fields with confidence and citations before an adviser confirms.",
    src: "CV · TrustPlus AI · Projects",
  },
  {
    q: "How does he evaluate AI output?",
    tag: "2 sources",
    trace: ['search  cv · "evaluation"', "read    TrustPlus AI · AI Singapore"],
    a: "Golden test sets re-run on prompt and model changes, RAGAS for retrieval, LangFuse evaluations, a judge model checking each section against its sources, and human approval on high-risk decisions. For classic ML, precision, recall and F1 on held-out data.",
    src: "CV · TrustPlus AI · AI Singapore",
  },
  {
    q: "Has he built MCP servers?",
    tag: "2 sources",
    trace: ['search  cv · "MCP"', "read    TrustPlus AI · The Assembly Place"],
    a: "Yes. At TrustPlus, an MCP server where assistants sign in as the acting user. At The Assembly Place, an MCP server over the company CRM with a confirmation step before any write.",
    src: "CV · TrustPlus AI · The Assembly Place",
  },
  {
    q: "What is his background?",
    tag: "1 source",
    trace: ["read    cv · roles (8)"],
    a: `${SOFTWARE_YEARS}+ years in software since 2019: platforms for small businesses, NCS, clinical NLP at AI Singapore, AI products in fintech, and now Head of Technology and AI at The Assembly Place. Before that, seven years in the Singapore Army.`,
    src: "CV · Experience",
  },
];

export const ARCHIVE: [string, string, string][] = [
  [
    "HR system",
    "HR management system.",
    " Node.js and Express API with a React and TypeScript front end: employee records, Excel import and export, an admin dashboard.",
  ],
  [
    "Bookings",
    "Holiday booking app.",
    " Flask and SQL: package browsing, bookings with availability checks, and an admin interface.",
  ],
  [
    "Storefront",
    "VietMala Eatery.",
    " A responsive Vue storefront for a food and beverage shop.",
  ],
  [
    "Video",
    "Programmatic social reels.",
    " Short videos built in code with Remotion.",
  ],
];
export const TAP = {
  title: "CRM, internal tools and an AI-agent console",
  thumb: ["Current employer", "no public case study"],
  org: "The Assembly Place",
  year: "2026–now",
  status: "Employer",
};
export const ORDER = THEMES.flatMap((t) => P.filter((p) => p.theme === t.id));
