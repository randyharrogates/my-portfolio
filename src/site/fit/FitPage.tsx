import React, { memo, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { jump } from "../shared.tsx";
import { API, isLive } from "./api.ts";
import { NODE_NAMES, cost, isWorker, seconds } from "./state.ts";
import type { Card, ChatItem, FitState, Graph, GraphNode, Move, Refusal } from "./state.ts";
import type { Action, Evidence, Replay } from "./types.ts";
import { CvProvider, useCv } from "./CvDrawer.tsx";
import { useFit } from "./useFit.ts";
import "./fit.css";

const MIN_JD = 80;
const MAX_JD = 6000;
const MIN_QUESTION = 8;
const MAX_QUESTION = 300;

// These mirror the Worker's own limits (worker/src/pipeline.ts, ask.ts, wrangler.toml), which it enforces whatever the page says.
const MAX_CALLS = 15;
const RUNS_PER_DAY = 5;
const QUESTIONS_PER_DAY = 10;
const count = (n: number) => n.toLocaleString();
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// A source is only ever one of the site's own pages or its résumé. A case study is a
// link to its page; the résumé opens in a drawer beside the report, with the quote
// highlighted. Anything else the stream might carry is shown as plain text, never as a link.
function Source({ evidence }: { evidence: Evidence }) {
  const openCv = useCv();
  if (/^#\/[a-z0-9/_-]*$/i.test(evidence.url)) return <Link className="fit-src" to={evidence.url.slice(1)}>{evidence.title}</Link>;
  if (evidence.url === "Resume.pdf") return <button type="button" className="fit-src" onClick={(e) => openCv(evidence.quote, e.currentTarget)}>{evidence.title} <span aria-hidden="true">▸</span><span className="sr-only"> (opens my résumé beside the report)</span></button>;
  return <span className="fit-src">{evidence.title}</span>;
}

// Whose words a quote is: always mine, from one of three places.
const origin = (e: Evidence) => (e.url === "Resume.pdf" ? "my résumé" : e.url.startsWith("#/work/") ? "my case study" : "my site");

function Quote({ evidence, small, delay = 0 }: { evidence: Evidence; small?: boolean; delay?: number }) {
  return (
    <figure className={"fit-quote" + (small ? " small" : "")} style={{ animationDelay: `${delay}ms` }}>
      <blockquote>“{evidence.quote}”</blockquote>
      <figcaption><span className="ok">✓ exact words from {origin(evidence)}</span><Source evidence={evidence} /></figcaption>
    </figure>
  );
}

// A clock that ticks on its own while something is in progress, so the rest of
// the page does not re-render ten times a second.
function Elapsed({ running, ms }: { running: boolean; ms: number }) {
  const [now, setNow] = useState(ms);
  useEffect(() => {
    if (!running) return;
    const startedAt = performance.now() - ms;
    const timer = window.setInterval(() => setNow(performance.now() - startedAt), 100);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when the work starts or stops
  }, [running]);
  return <b className={running ? "ticking" : ""}>{seconds(running ? Math.max(now, ms) : ms)}</b>;
}

function ActionChip({ action }: { action: Action }) {
  if (action === "email") return <button type="button" className="chip" onClick={() => jump("emailText")}>Email me</button>;
  return action === "resume" ? <Link className="chip" to="/resume">Open my résumé</Link> : <Link className="chip" to="/work">Browse the case studies</Link>;
}

// A segmented switch whose thumb slides between options, stretching a little as it moves.
function Seg<T extends string>({ options, value, onChange, label, className = "" }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  const index = options.indexOf(value);
  const last = useRef(index);
  const from = last.current;
  useEffect(() => { last.current = index; }, [index]);
  return (
    <div className={`fit-seg ${className}`} role="tablist" aria-label={label} style={{ "--n": options.length, "--from": from, "--to": index } as React.CSSProperties}>
      <i key={index} className="fit-thumb" aria-hidden="true" />
      {options.map((o) => <button key={o} type="button" role="tab" aria-selected={o === value} onClick={() => onChange(o)}>{o}</button>)}
    </div>
  );
}

/* ---------- the agent graph ---------- */

// The graph is drawn on a fixed board and scaled to its pane: nodes are placed in
// percentages of it, edges are paths in the same coordinates. A phone gets a
// narrower board, so the boxes stay large enough to read.
const H = 608;
interface Box { x: number; y: number; w: number; h: number }
interface Dims { W: number; mid: number; main: { x: number; w: number; h: number }; loopX: number; gap: number; chip: number }
const WIDE: Dims = { W: 760, mid: 380, main: { x: 280, w: 200, h: 64 }, loopX: 16, gap: 14, chip: 120 };
const NARROW: Dims = { W: 420, mid: 210, main: { x: 100, w: 220, h: 64 }, loopX: 10, gap: 8, chip: 96 };
const WORKER_H = 56;
// Where each row sits. A question has one more stage than a report, so its rows are closer.
const ROWS = {
  run: { gate: 24, orchestrator: 136, workers: 264, verifier: 392, writer: 520 } as Record<string, number>,
  chat: { memory: 16, lead: 110, workers: 212, verifier: 306, answer: 402, verify: 498 } as Record<string, number>,
};
const MAX_TURNS = 3;

function useNarrow(): boolean {
  const query = "(max-width: 959px)";
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setNarrow(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

function layout(graph: Graph, d: Dims): Record<string, Box> {
  const rows = ROWS[graph.kind];
  const boxes: Record<string, Box> = {};
  const workers = graph.nodes.filter(isWorker);
  const slots = Math.max(workers.length, 1);
  const span = d.W - 2 * (d.loopX + d.gap);
  // The fast path's one search is as wide as a stage; researchers and retrievers share the row.
  const w = workers[0]?.key === "search" ? d.main.w : Math.min(d.chip, (span - (slots - 1) * d.gap) / slots);
  const x0 = (d.W - (slots * w + (slots - 1) * d.gap)) / 2;
  for (const n of graph.nodes) if (!isWorker(n)) boxes[n.key] = { ...d.main, y: rows[n.key] };
  workers.forEach((n, i) => (boxes[n.key] = { x: x0 + i * (w + d.gap), y: rows.workers, w, h: WORKER_H }));
  return boxes;
}

type EdgeState = "idle" | "live" | "done";
const into = (n?: GraphNode): EdgeState => (!n || n.state === "waiting" ? "idle" : n.state === "running" ? "live" : "done");

function edges(graph: Graph, boxes: Record<string, Box>, d: Dims): { d: string; state: EdgeState; loop?: boolean }[] {
  const at = (key: string) => graph.nodes.find((n) => n.key === key);
  const rows = ROWS[graph.kind];
  const out: { d: string; state: EdgeState; loop?: boolean }[] = [];
  const stages = graph.nodes.filter((n) => !isWorker(n));
  const head = graph.kind === "run" ? "orchestrator" : "lead"; // who hands out the work
  // straight down between stages, except across the workers' row
  stages.slice(1).forEach((n, i) => {
    const from = stages[i];
    if (from.key !== head) out.push({ d: `M${d.mid} ${rows[from.key] + d.main.h} V${rows[n.key]}`, state: into(n) });
  });
  // the fan: out to every worker, and back in to the verifier
  const top = rows[head] + d.main.h;
  const fanOut = (top + rows.workers) / 2;
  const fanIn = (rows.workers + WORKER_H + rows.verifier) / 2;
  const verifier = at("verifier");
  for (const n of graph.nodes.filter(isWorker)) {
    const cx = boxes[n.key].x + boxes[n.key].w / 2;
    out.push({ d: `M${d.mid} ${top} V${fanOut} H${cx} V${rows.workers}`, state: into(n) });
    // The fast path's search goes past the verifier: code checks it, further down.
    const next = n.key === "search" ? into(at("answer")) : into(verifier);
    out.push({ d: `M${cx} ${rows.workers + WORKER_H} V${fanIn} H${d.mid} V${rows.verifier}`, state: n.state === "done" || n.state === "failed" ? next : "idle" });
  }
  const live = graph.looping ? "live" : "done";
  // the loop back: from the verifier to whoever hands out the work, up the left side
  if (graph.looped) out.push({ d: `M${d.main.x} ${rows.verifier + 32} H${d.loopX} V${rows[head] + 32} H${d.main.x - 6}`, state: live, loop: true });
  // a question's backup: a fast answer that failed its check goes back up the right side
  if (graph.escalated) out.push({ d: `M${d.main.x + d.main.w} ${rows.verify + 32} H${d.W - d.loopX} V${rows.lead + 32} H${d.main.x + d.main.w + 6}`, state: "done", loop: true });
  return out;
}

const SUPPORT: Record<string, string> = { yes: "supported", partly: "partly supported", no: "not supported" };
const cardsOf = (graph: Graph, s: FitState) => (graph.kind === "chat" ? s.tasks : s.cards);
const lastAnswer = (s: FitState) => s.chat.findLast((c) => c.from === "agent" && c.answer)?.answer;

function moveText(m: Move, s: FitState): string {
  const text = { decline: "declined: not about my work", direct: "fast path: one search, then the writer", dispatch: m.turn === 1 ? `started ${plural(s.tasks.length, "researcher")} in parallel` : "sent researchers out again", write: "handed the findings to the writer" }[m.action];
  return m.forced ? `${text} (decided in code: ${m.why})` : text;
}

// One line of status under a node's name, read off the state.
function status(n: GraphNode, graph: Graph, s: FitState): string {
  if (n.waitMs > 0) return `retry ${n.retries} in ${(n.waitMs / 1000).toFixed(1)}s`;
  const cards = cardsOf(graph, s);
  const card = cards.find((c) => c.id === n.key);
  if (card) {
    if (n.state === "running") return card.retry ? "searching again" : card.chunks.length ? `reading ${card.chunks.length}` : "searching";
    if (!card.verdict) return n.state === "failed" ? "failed: a gap" : n.state === "done" ? "verifying" : card.chunks.length || graph.kind === "run" ? "queued" : "searching";
    return card.verdict === "gap" ? "no evidence" : `${card.verdict} · ${card.evidence.length}`;
  }
  const lowered = cards.filter((c) => c.lowered).length;
  const sentBack = cards.filter((c) => c.retry).length;
  const move = graph.moves[graph.moves.length - 1];
  switch (n.key) {
    case "gate":
      return n.state === "running" ? "reading the text" : n.state === "done" ? "a real job advert" : NODE_NAMES.gate.does;
    case "orchestrator":
      if (n.state === "running") return graph.round > 1 ? "deciding what to retry" : "planning the work";
      return n.state === "done" ? `${s.cards.length} planned${sentBack ? ` · ${sentBack} retried` : ""}` : "plans the work";
    case "verifier":
      if (n.state === "running") return graph.round > 1 ? "checking new quotes" : "checking citations";
      if (n.state === "done") return lowered ? `lowered ${lowered}` : "kept every verdict";
      if (graph.kind === "chat" && graph.nodes.some((x) => x.key === "search") && !s.tasks.length) return "skipped: one search";
      return "reads every quote";
    case "writer":
      return n.state === "running" ? "writing the summary" : n.state === "done" ? (s.summaryFallback ? "fallback: built in code" : "summary written") : n.state === "failed" ? "failed: built in code" : "waits for the verifier";
    case "memory":
      if (n.state === "running") return "compacting";
      if (!s.context) return "skipped";
      if (s.context.kept + s.context.compacted === 0) return "first question";
      return `${plural(s.context.kept, "turn")} kept${s.context.compacted ? ` · ${s.context.compacted} summarised` : ""}`;
    case "lead":
      if (n.state === "running") return graph.moves.length ? "reviewing the findings" : "choosing a route";
      if (!move) return n.state === "failed" ? "failed: code takes over" : "picks the next move";
      return { decline: "declined", direct: "fast path", dispatch: sentBack ? `sent ${sentBack} back` : plural(s.tasks.length, "researcher"), write: "to the writer" }[move.action] + (move.forced ? " (code)" : "");
    case "search":
      return n.state === "running" ? "searching my pages" : s.context ? plural(s.context.excerpts, "excerpt") : "done";
    case "answer":
      return n.state === "running" ? "writing" : n.state === "done" ? "written" : n.state === "failed" ? "failed: quotes only" : "waits";
    case "verify": {
      if (n.state === "running") return "checking quotes";
      if (n.state !== "done") return "checks every quote";
      const confidence = lastAnswer(s)?.confidence;
      if (s.asking) return graph.escalated ? "did not pass: escalated" : "quotes checked";
      return confidence ? `${confidence.level} · ${confidence.passed} of ${confidence.total}` : "nothing to show";
    }
    default:
      return "";
  }
}

// What a node was asked and what it returned, for the detail panel. Prompts are never shown.
function detail(n: GraphNode, graph: Graph, s: FitState): { title: string; rows: [string, string][] } {
  const cards = cardsOf(graph, s);
  const card = cards.find((c) => c.id === n.key);
  const kind = card ? (graph.kind === "chat" ? "researcher" : "retriever") : n.key;
  const rows: [string, string][] = [["Done by", NODE_NAMES[kind]?.by ?? ""]];
  if (n.retries) rows.push(["Retried", `${plural(n.retries, "time")}: the provider turned the call away, so it waited and tried again (exponential backoff)`]);
  if (card) {
    rows.push(["Asked", card.text]);
    if (card.search) rows.push(["Searched", card.search]);
    if (card.chunks.length) rows.push(["Offered", plural(card.chunks.length, "excerpt")]);
    for (const c of card.checks) rows.push([`Verifier, round ${c.round}`, `${SUPPORT[c.support]}${c.reason ? `: ${c.reason}` : ""}`]);
    if (card.retry) rows.push(["Sent back", `${card.retry.reason ? `${card.retry.reason}. ` : ""}New search: ${card.retry.search}${card.retry.improved === undefined ? "" : card.retry.improved ? ". Better evidence found." : ". Nothing better found."}`]);
    if (card.verdict) rows.push(["Returned", card.verdict === "gap" ? "no evidence: reported as a gap" : `${card.verdict}, ${plural(card.evidence.length, "checked quote")}`]);
    return { title: `${n.key} · ${graph.kind === "chat" ? "Researcher" : "Retriever"}`, rows };
  }
  rows.push(["Job", NODE_NAMES[n.key]?.does ?? ""]);
  if (n.state !== "waiting") rows.push(["Now", status(n, graph, s)]);
  const sentBack = cards.filter((c) => c.retry);
  const called: Record<string, string> = {
    dispatch_retrievers: `dispatch_retrievers(${plural(s.cards.length, "requirement")}): one retriever started for each`,
    redirect_retrievers: `redirect_retrievers(${sentBack.length} sent back for a second search)`,
  };
  if (n.key === "lead") for (const m of graph.moves) rows.push([`Turn ${m.turn}`, moveText(m, s)]);
  else for (const tool of n.tools) rows.push(["Tool call", called[tool] ?? tool]);
  for (const c of n.key === "orchestrator" || n.key === "lead" ? sentBack : []) rows.push([`Sent ${c.id} back`, c.retry!.search]);
  if (n.key === "verifier") for (const c of cards) for (const k of c.checks.filter((x) => x.support !== "yes")) rows.push([`${c.id}, round ${k.round}`, k.reason || k.support]);
  if (n.key === "writer" && s.summaryFallback) rows.push(["Fallback", "the writer's summary was not usable, so this one was computed from the verdicts"]);
  if (n.key === "memory" && s.context) rows.push(["Context", `${plural(s.context.kept, "turn")} word for word, ${s.context.compacted} older folded into a summary`]);
  if (n.key === "verify") {
    const answer = lastAnswer(s);
    if (s.context?.dropped) rows.push(["Dropped", plural(s.context.dropped, "quote") + " not found in the source"]);
    if (graph.escalated) rows.push(["Backup", "the fast answer did not pass every check, so the question went back to the orchestrator and out to the researchers"]);
    if (!s.asking && answer?.confidence) rows.push(["Confidence", `${answer.confidence.level}: ${answer.confidence.passed} of ${answer.confidence.total} checks passed, run by ${answer.confidence.by}`]);
  }
  return { title: NODE_NAMES[n.key]?.name ?? n.key, rows };
}

const Board = memo(function Board({ graph, state, selected, onSelect }: { graph: Graph; state: FitState; selected: string | null; onSelect: (key: string | null) => void }) {
  const d = useNarrow() ? NARROW : WIDE;
  const W = d.W;
  const boxes = layout(graph, d);
  const rows = ROWS[graph.kind];
  const pct = (b: Box) => ({ left: `${(b.x / W) * 100}%`, top: `${(b.y / H) * 100}%`, width: `${(b.w / W) * 100}%`, height: `${(b.h / H) * 100}%` });
  // The detail panel grows out of the node that was clicked and shrinks back into it,
  // so it stays mounted for the length of its exit.
  const [shown, setShown] = useState<string | null>(selected);
  useEffect(() => {
    if (selected !== null) return setShown(selected);
    const timer = window.setTimeout(() => setShown(null), 160);
    return () => window.clearTimeout(timer);
  }, [selected]);
  const picked = graph.nodes.find((n) => n.key === (selected ?? shown));
  const info = picked ? detail(picked, graph, state) : null;
  const origin = picked && boxes[picked.key] ? `${((boxes[picked.key].x + boxes[picked.key].w / 2) / W) * 100}% 0` : "50% 0";
  const cards = cardsOf(graph, state);
  const head = graph.kind === "run" ? "orchestrator" : "lead";
  return (
    <>
      <div className="fit-board-scroll">
        <div className="fit-board" data-kind={graph.kind} style={{ aspectRatio: `${W} / ${H}`, maxWidth: W }}>
          <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            <defs>
              <marker id="fit-head" orient="auto" markerWidth="6" markerHeight="6" refX="3" refY="3"><path d="M0 0 L6 3 L0 6 Z" /></marker>
            </defs>
            {edges(graph, boxes, d).map((e, i) => <path key={i} d={e.d} className={`fit-edge ${e.state}${e.loop ? " loop" : ""}`} markerEnd={e.loop ? "url(#fit-head)" : undefined} />)}
          </svg>
          {!graph.nodes.some(isWorker) && (
            <span className="fit-node ghost" style={pct({ x: d.mid - 170, y: rows.workers, w: 340, h: WORKER_H })}>{graph.kind === "run" ? "retrievers join once the plan is made" : "one search, or researchers in parallel"}</span>
          )}
          {graph.looped && <span className="fit-loop-label" style={{ left: `${((d.loopX + 12) / W) * 100}%`, top: `${((rows[head] + 68) / H) * 100}%` }}>{graph.kind === "chat" ? (graph.looping ? "back to the orchestrator" : "orchestrator asked again") : graph.looping ? "searching again" : "second search done"}</span>}
          {graph.escalated && <span className="fit-loop-label right" style={{ right: `${((d.loopX + 12) / W) * 100}%`, top: `${((rows.lead + 68) / H) * 100}%` }}>check failed: escalated</span>}
          {graph.nodes.map((n, i) => {
            const card = cards.find((c) => c.id === n.key);
            return (
              <button
                key={n.key}
                type="button"
                className={`fit-node ${n.state}${card ? " small" : ""}${card?.verdict ? ` v-${card.verdict}` : ""}${selected === n.key ? " picked" : ""}${n.waitMs ? " backoff" : ""}`}
                style={{ ...pct(boxes[n.key]), animationDelay: `${i * 30}ms` }}
                aria-pressed={selected === n.key}
                onClick={() => onSelect(selected === n.key ? null : n.key)}
              >
                <b>{card ? n.key : NODE_NAMES[n.key]?.name}{n.state === "running" ? <i className="fit-spin" aria-hidden="true" /> : !card && <em className="fit-by">{NODE_NAMES[n.key]?.by}</em>}</b>
                <span>{status(n, graph, state)}</span>
              </button>
            );
          })}
        </div>
      </div>
      {info && picked ? (
        <div className={"fit-detail" + (selected === null ? " leaving" : "")} key={picked.key} style={{ transformOrigin: origin }}>
          <div className="fit-row"><b>{info.title}</b><button type="button" className="fit-x" aria-label="Close detail" onClick={() => onSelect(null)}>×</button></div>
          <dl>{info.rows.map(([k, v], i) => <React.Fragment key={i}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>
          <span className="fit-usage">{picked.calls ? `${plural(picked.calls, "call")} · ${seconds(picked.ms)} · ${count(picked.tokens)} tokens · est. ${cost(picked.costMicro)}` : picked.state === "waiting" ? "not started" : "done in code, no model call"}</span>
        </div>
      ) : (
        <p className="fit-muted fit-hint">Click any node to see what it was asked, what it returned, and its time, tokens and cost. Each stage is tagged with who does it: a model, code, or code around one model call.</p>
      )}
    </>
  );
});

// One state for a row of workers: running if any is, done once all have reported.
const together = (workers: GraphNode[]): GraphNode["state"] => (workers.some((n) => n.state === "running") ? "running" : workers.length && workers.every((n) => n.state === "done" || n.state === "failed") ? "done" : "waiting");

// The folded graph: one dot per stage, still live. Clicking it opens the graph.
function Rail({ graph, onOpen }: { graph: Graph; onOpen: () => void }) {
  const workers = graph.nodes.filter(isWorker);
  const group = { key: graph.kind === "run" ? "retriever" : workers[0]?.key === "search" ? "search" : "researcher", state: together(workers) };
  const dots = graph.nodes.filter((n) => !isWorker(n)).flatMap((n) => (n.key === "verifier" ? [group, { key: n.key, state: n.state }] : [{ key: n.key, state: n.state }]));
  return (
    <button type="button" className="fit-rail" onClick={onOpen} aria-label="Open the agent graph">
      <span className="fit-rail-open" aria-hidden="true">›</span>
      <span className="fit-rail-title">{graph.kind === "chat" ? "last question" : "report run"}</span>
      {dots.map((d) => (
        <span key={d.key} className={`fit-dot ${d.state}`}><i aria-hidden="true" />{NODE_NAMES[d.key]?.name.toLowerCase()}</span>
      ))}
      {(graph.looped || graph.escalated) && <span className="fit-rail-loop">↺ looped</span>}
    </button>
  );
}

// A question's route, in a few words, for the graph's heading.
function route(graph: Graph): string {
  if (graph.moves.some((m) => m.action === "decline")) return "declined";
  if (graph.escalated) return "fast path failed its check · escalated to researchers";
  if (graph.moves.some((m) => m.action === "dispatch")) return "researchers in parallel";
  return graph.moves.some((m) => m.action === "direct") ? "fast path" : "choosing a route";
}

function GraphPane({ state, open, onToggle }: { state: FitState; open: boolean; onToggle: () => void }) {
  const [which, setWhich] = useState<"run" | "chat">("run");
  const [selected, setSelected] = useState<string | null>(null);
  // Follow the action: a new question shows its own loop, a new run shows the run's.
  useEffect(() => { if (state.asking) setWhich("chat"); setSelected(null); }, [state.asking]);
  useEffect(() => { if (state.phase === "running") setWhich("run"); }, [state.phase]);
  const graph = which === "chat" && state.question ? state.question : state.run;
  const latest = state.question ?? state.run;
  const heading = graph.kind === "chat" ? `Turn ${Math.max(1, graph.round)} of ${MAX_TURNS} · ${route(graph)}` : graph.looped ? `Looped back · round ${graph.round} of 2` : "Round 1";
  return (
    <aside className={"fit-pane fit-graph" + (open ? " open" : "")} aria-label="Agent graph">
      {open ? (
        <div className="fit-graph-full">
          <header>
            <div><span className="eyebrow">Agent graph · {graph.kind === "chat" ? "last question" : "report run"}</span><b>{heading}</b></div>
            <div className="fit-row">
              {state.question && (
                <Seg options={["Report", "Question"] as const} value={graph.kind === "chat" ? "Question" : "Report"} label="Which loop" onChange={(v) => { setWhich(v === "Question" ? "chat" : "run"); setSelected(null); }} />
              )}
              <button type="button" className="btn fit-fold" onClick={onToggle}>Fold</button>
            </div>
          </header>
          <Board graph={graph} state={state} selected={selected} onSelect={setSelected} />
        </div>
      ) : (
        <Rail graph={latest} onOpen={onToggle} />
      )}
    </aside>
  );
}

/* ---------- report ---------- */

const BADGE: Record<string, [string, string]> = { strong: ["●", "strong"], partial: ["◐", "partial"], gap: ["○", "gap"] };

function ReportCard({ card, index, checking }: { card: Card; index: number; checking: boolean }) {
  const [mark, label] = card.verdict ? BADGE[card.verdict] : ["", ""];
  const kind = card.importance === "nice" ? "nice-to-have" : "must-have";
  const searching = card.retry && card.retry.improved === undefined;
  return (
    <article className={"fit-card " + (card.verdict ?? "pending") + (searching ? " retrying" : "")} style={{ animationDelay: `${index * 30}ms` }}>
      <div className="fit-card-head">
        <div><span className="fit-from jd">The job description asks for</span><h3>{card.text}</h3></div>
        {searching ? (
          <span className="fit-badge live">second search</span>
        ) : card.verdict ? (
          <span className={"fit-badge " + card.verdict}>{mark} {label} · {kind}</span>
        ) : (
          <span className="fit-badge live">{checking ? "with the verifier" : card.chunks.length ? `reading ${plural(card.chunks.length, "excerpt")}` : "searching"}</span>
        )}
      </div>
      {!card.verdict && <><div className="fit-skel" /><div className="fit-skel short" /></>}
      {card.evidence.length > 0 && <span className="fit-from mine">What my résumé and case studies say, word for word</span>}
      {card.evidence.map((e, i) => <Quote key={e.chunkId + e.quote} evidence={e} delay={i * 30} />)}
      {card.verdict === "gap" && !searching && <p className="fit-muted">Nothing in my case studies or CV shows this.</p>}
      {(card.dropped > 0 || card.lowered || card.retry?.improved !== undefined) && (
        <p className="fit-flags">
          {card.dropped > 0 && <span>▲ {plural(card.dropped, "quote")} not found in the source, removed</span>}
          {card.lowered && <span>▲ lowered by the verifier</span>}
          {card.retry?.improved === true && <span className="ok">↺ improved by a second search</span>}
          {card.retry?.improved === false && <span>↺ searched twice</span>}
        </p>
      )}
    </article>
  );
}

const Report = memo(function Report({ state, onReset }: { state: FitState; onReset: () => void }) {
  const tally = (v: string) => state.cards.filter((c) => c.verdict === v).length;
  const narration = state.chat.filter((c) => c.from === "agent" && !c.answer && !c.note?.startsWith("summary") && c.note !== "answering" && c.note !== "not answered");
  const last = narration[narration.length - 1];
  return (
    <section className="fit-report" aria-label="Fit report">
      <div className="fit-title">
        <span className="eyebrow">Fit report{state.phase === "running" ? " · filling in as evidence arrives" : state.replay ? " · recorded run" : state.cached ? " · from the last 24 hours" : ""}</span>
        <h1>{state.role || "Reading the role…"}</h1>
        {state.phase === "running" && last && <p className="fit-now" aria-live="polite" key={last.text}><i className="fit-spin" aria-hidden="true" />{last.text}</p>}
        {state.summary && <p className="fit-summary">{state.summary}</p>}
        {state.cards.length > 0 && <p className="fit-legend"><span className="fit-from jd">Job description</span> each heading below is a requirement the orchestrator took from the advert you pasted. <span className="fit-from mine">My words</span> each quote under it is copied exactly from my résumé or a case study, and links to where it sits.</p>}
      </div>
      {state.phase === "done" && (
        <div className="fit-tally">
          <div><b className="strong">{tally("strong")}</b><span>strong</span></div>
          <div><b className="partial">{tally("partial")}</b><span>partial</span></div>
          <div className="gap"><b>{tally("gap")}</b><span>gap</span></div>
        </div>
      )}
      {state.cards.map((c, i) => <ReportCard key={c.id} card={c} index={i} checking={state.run.nodes.some((n) => n.key === c.id && n.state === "done")} />)}
      {state.phase === "done" && (
        <div className="fit-foot">
          <span className="fit-muted">Every quote is checked in code against the page it cites before it is shown.</span>
          <button className="btn" type="button" onClick={onReset}>Try another job description</button>
        </div>
      )}
    </section>
  );
});

/* ---------- chat ---------- */

function Bubble({ item }: { item: ChatItem }) {
  if (item.from === "visitor") return <div className="fit-bubble visitor"><span>{item.text}</span></div>;
  return (
    <div className={"fit-bubble agent" + (item.answer && item.answer.kind !== "grounded" ? " plain" : "")}>
      <span>{item.text}{item.streaming && <i className="fit-caret" aria-hidden="true" />}</span>
      {item.answer?.caution && <p className="fit-caution" role="note">▲ {item.answer.caution}</p>}
      {item.answer?.evidence.map((e) => <Quote key={e.chunkId + e.quote} evidence={e} small />)}
      {item.answer?.confidence && (
        <small className={"fit-conf " + item.answer.confidence.level} title={`Checks run by ${item.answer.confidence.by}: each quote against its page, the wording, and each researcher's finding`}>
          confidence {item.answer.confidence.level} · {item.answer.confidence.passed} of {item.answer.confidence.total} checks passed · {item.answer.path === "team" ? "researchers and verifier" : "fast path, checked in code"}
        </small>
      )}
      {item.note && item.answer && <small>{item.note}</small>}
      {item.answer && item.answer.actions.length > 0 && <div className="fit-chips">{item.answer.actions.map((a) => <ActionChip key={a} action={a} />)}</div>}
    </div>
  );
}

const stageName = (key: string) => NODE_NAMES[/^q\d+$/.test(key) ? "researcher" : key];

const Chat = memo(function Chat({ state, onAsk }: { state: FitState; onAsk: (q: string) => void }) {
  const [question, setQuestion] = useState("");
  const log = useRef<HTMLDivElement>(null);
  // Only the questions and their answers: the run's narration lives with the report.
  const firstQuestion = state.chat.findIndex((c, i) => i > 0 && c.from === "visitor");
  const turns = firstQuestion < 0 ? [] : state.chat.slice(firstQuestion);
  // Keep the newest line of the conversation in view as it streams.
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [state.chat, state.suggestions]);
  const canAsk = state.phase === "done" && !state.replay && state.reportId !== null && !state.asking && state.questionsLeft !== 0;
  const send = (q: string) => {
    const text = q.trim();
    if (!canAsk || text.length < MIN_QUESTION) return;
    setQuestion("");
    onAsk(text.slice(0, MAX_QUESTION));
  };
  const ctx = state.context;
  const thinking = state.asking && state.chat[state.chat.length - 1]?.from === "visitor";
  const stage = state.question?.nodes.find((n) => n.state === "running");
  return (
    <section className="fit-pane fit-chat" aria-label="Conversation">
      <header>
        <div><span className="eyebrow">Ask me about this report</span><b>{state.asking ? "Answering" : state.replay ? "Open on live runs" : "As me, from my pages only"}</b></div>
        {state.asking && <span className="fit-clock"><i className="fit-spin" aria-hidden="true" /><Elapsed running ms={0} /></span>}
      </header>
      <div className="fit-log" aria-live="polite" ref={log}>
        {turns.length === 0 && <p className="fit-muted">{state.replay ? "This is a recorded run. Paste a job description of your own to ask questions." : "Ask how something was built, what a project involved, or where a gap comes from. Every answer cites my own pages."}</p>}
        {turns.map((item, i) => <Bubble key={i} item={item} />)}
        {thinking && <p className="fit-now"><i className="fit-spin" aria-hidden="true" />{stage ? `${stageName(stage.key)?.name}: ${stageName(stage.key)?.does}` : "Thinking"}</p>}
        {state.phase === "done" && !state.asking && (state.suggestions.length > 0 || state.actions.length > 0) && (
          <div className="fit-chips">
            {canAsk && state.suggestions.map((s) => <button key={s} type="button" className="chip" onClick={() => send(s)}>{s}</button>)}
            {state.actions.map((a) => <ActionChip key={a} action={a} />)}
          </div>
        )}
      </div>
      {ctx && ctx.input > 0 && (
        <div className="fit-context">
          <div className="fit-row"><span>context · {count(ctx.input)} tokens</span><span>{Math.round((ctx.cached / ctx.input) * 100)}% from cache</span></div>
          <div className="fit-bar" role="img" aria-label={`${Math.round((ctx.cached / ctx.input) * 100)} percent of the context came from the prompt cache`}><i style={{ width: `${(ctx.cached / ctx.input) * 100}%` }} /></div>
          <span>{ctx.kept + ctx.compacted === 0 ? "first question: no earlier turns to carry" : `${plural(ctx.kept, "turn")} kept word for word`}{ctx.compacted ? ` · ${plural(ctx.compacted, "older turn")} summarised` : ""}{ctx.justCompacted ? " · compacted just now" : ""}</span>
        </div>
      )}
      <form className="fit-ask" onSubmit={(e) => { e.preventDefault(); send(question); }}>
        <label htmlFor="fit-q">
          {state.replay ? "Questions are open on live runs" : state.phase !== "done" ? "Questions open when the report is done" : state.questionsLeft === null ? `${QUESTIONS_PER_DAY} questions a day` : `${state.questionsLeft} of ${QUESTIONS_PER_DAY} questions left today`}
        </label>
        <div>
          <input id="fit-q" value={question} maxLength={MAX_QUESTION} disabled={!canAsk} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. What did you build with MCP?" autoComplete="off" />
          <button className="btn primary" type="submit" disabled={!canAsk || question.trim().length < MIN_QUESTION} aria-label="Send question">→</button>
        </div>
      </form>
    </section>
  );
});

/* ---------- the bar: one line of status for the whole page ---------- */

function Bar({ state, onReset }: { state: FitState; onReset: () => void }) {
  const running = state.phase === "running";
  const now = running ? "agents working" : state.asking ? "answering" : "report done";
  return (
    <div className="fit-barline" role="status">
      <span key={now} className={"fit-state " + (running || state.asking ? "live" : "ok")}>{running || state.asking ? <i className="fit-spin" aria-hidden="true" /> : "✓ "}{now}</span>
      <span><Elapsed running={running} ms={state.elapsedMs} /> elapsed</span>
      <span><b>{count(state.totals.input + state.totals.output)}</b> tokens</span>
      <span><b>{cost(state.totals.costMicro)}</b> est.</span>
      <span><b>{state.totals.calls} of {MAX_CALLS}</b> calls</span>
      <div className="fit-bar" role="img" aria-label={`${state.totals.calls} of ${MAX_CALLS} model calls used`}><i style={{ width: `${Math.min(100, (state.totals.calls / MAX_CALLS) * 100)}%` }} /></div>
      {state.phase === "done" && !state.asking && <button type="button" className="btn fit-again" onClick={onReset}>New run</button>}
    </div>
  );
}

/* ---------- start ---------- */

const REFUSALS: Record<Refusal, [string, string]> = {
  not_a_job_description: ["That doesn’t look like a job description", "This page only checks a role against my published work. Paste the advert’s responsibilities and requirements and try again."],
  burst: ["One run at a time", "Runs are spaced 10 seconds apart to keep scripts out. Your text is still here."],
  busy: ["One run at a time", "Your last run is still finishing. Try again in a few seconds."],
  slow_down: ["Too many requests", "Give it a few seconds and try again."],
  daily: [`You’ve used today’s ${RUNS_PER_DAY} runs`, "Live runs reset at midnight UTC. Recorded runs below are always available."],
  budget_exhausted: ["Live runs are paused", "This agent runs on a fixed monthly budget and it has been used up. Recorded runs below are real runs, replayed step by step."],
  live_runs_off: ["Live runs are paused", "Live runs are switched off right now. Recorded runs below are real runs, replayed step by step."],
  turnstile_failed: ["The human check didn’t pass", "Reload the page and try again."],
  report_expired: ["That report has expired", "Run the job description again."],
  network: ["I couldn’t reach the server", "Check your connection and try again."],
  failed: ["That run failed", "A step did not return a usable answer. It was not counted as a result; try again."],
};

const PREVIEW = ["gate", "orchestrator", "retriever", "verifier", "writer"];
const ASK_CALLS = 9;

function Start({ state, live, checking, widget, replays, jd, setJd, onRun, onReplay }: { state: FitState; live: boolean; checking: boolean; widget: React.RefObject<HTMLDivElement | null>; replays: Replay[]; jd: string; setJd: (jd: string) => void; onRun: (jd: string) => void; onReplay: (r: Replay) => void }) {
  const [wait, setWait] = useState(0);
  useEffect(() => setWait(state.retryAfterSec > 60 ? 0 : state.retryAfterSec), [state.retryAfterSec, state.refusal]);
  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);
  const length = jd.trim().length;
  const ready = live && !checking && length >= MIN_JD && length <= MAX_JD && wait === 0;
  const refusal = state.phase === "refused" && state.refusal ? REFUSALS[state.refusal] : null;
  return (
    <div className="fit-start">
      <section>
        <span className="eyebrow">A multi-agent system, running live</span>
        <h1>Paste a job description. Watch my agents check the fit.</h1>
        <p className="lede">An orchestrator plans the work, retrievers search my case studies and CV in parallel, and a verifier checks every citation and can send one back for a second search. You get a report where every claim is an exact quote you can open. Then ask me about it.</p>
        {refusal && (
          <div className="fit-refusal" role="status">
            <h2>{refusal[0]}</h2>
            <p>{refusal[1]}</p>
            <div className="fit-chips"><ActionChip action="email" /><ActionChip action="resume" /></div>
          </div>
        )}
        <form className="fit-form" onSubmit={(e) => { e.preventDefault(); if (ready) onRun(jd.trim()); }}>
          <label htmlFor="fit-jd">Job description</label>
          <textarea id="fit-jd" rows={9} maxLength={MAX_JD} value={jd} onChange={(e) => setJd(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && ready) onRun(jd.trim()); }} placeholder="Paste the full advert here: responsibilities and requirements work best." />
          <div className="fit-row">
            <span className="mono">{count(length)} of {count(MAX_JD)} characters · minimum {MIN_JD}{state.runsLeft !== null ? ` · ${state.runsLeft} of ${RUNS_PER_DAY} runs left today` : ""}</span>
            <button className="btn primary" type="submit" disabled={!ready}>{checking ? <><i className="fit-spin" aria-hidden="true" />Checking you&rsquo;re human…</> : wait > 0 ? `Retry in ${wait}s` : live ? "Check the fit" : "Live runs are off"}</button>
          </div>
          {/* The human check sits with the button it belongs to. It stays invisible unless Cloudflare needs a click. */}
          <div ref={widget} className="fit-turnstile" />
          {checking && <p className="fit-muted" role="status">A quick automatic check that you are a person. If a box appears above, tick it; the run starts by itself after that.</p>}
          <p className="fit-muted">This is an AI agent answering as me, from my published pages only. It can be wrong, and nothing it says is a commitment. Your text is sent to OpenAI to produce the report; the job description is not stored, and the report and your questions are kept for 24 hours so follow-ups work.</p>
        </form>
        {replays.length > 0 && (
          <div className="fit-replays">
            <span className="eyebrow">Or replay a recorded run · uses none of your runs</span>
            <div>
              {replays.map((r, i) => (
                <button key={r.id} type="button" style={{ animationDelay: `${i * 30}ms` }} onClick={() => onReplay(r)}><b>{r.title}</b><span>{r.result}</span></button>
              ))}
            </div>
          </div>
        )}
      </section>
      <aside className="fit-pane fit-preview">
        <header><div><span className="eyebrow">The loop you will watch</span><b>Waiting for a job description</b></div></header>
        <ol>
          {PREVIEW.map((key, i) => (
            <li key={key} style={{ animationDelay: `${i * 30}ms` }}><b>{NODE_NAMES[key].name}</b><span className="fit-muted">{NODE_NAMES[key].does}</span></li>
          ))}
          <li className="loop"><b>↺ Loop</b><span className="fit-muted">weak evidence goes back to the orchestrator, which may search once more</span></li>
        </ol>
        <p className="fit-muted">Your questions go to a second orchestrator. Each turn it picks a move by function call: answer a narrow question on a fast path, or split a broad one across researchers working in parallel, read the verifier&rsquo;s findings and send one back. Code checks every quote, scores the confidence, and takes over if a model fails.{API && <> The same search is open to any MCP client at <code>{API}/mcp</code>.</>}</p>
        <p className="fit-muted">At most {MAX_CALLS} model calls per run and {ASK_CALLS} per question, {RUNS_PER_DAY} runs and {QUESTIONS_PER_DAY} questions a day per visitor, and a fixed monthly budget. A call the provider turns away is retried twice, waiting longer each time.</p>
      </aside>
    </div>
  );
}

/* ---------- page ---------- */

const TABS = ["Graph", "Report", "Chat"] as const;

export default function FitPage() {
  const { state, start, replay, ask, reset, widget, checking } = useFit();
  const [live, setLive] = useState(false);
  const [replays, setReplays] = useState<Replay[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Graph");
  // The pasted text outlives a run, so a refused or finished run hands it back for editing.
  const [jd, setJd] = useState("");
  // The graph opens by itself for a run and folds when it ends. A visitor's own
  // choice wins from the moment they make one, until the next run.
  const [choice, setChoice] = useState<boolean | null>(null);
  const [side, setSide] = useState<"report" | "chat">("report");
  useEffect(() => {
    isLive().then(setLive);
    fetch("site/fit/replays.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: unknown) => setReplays(Array.isArray(list) ? (list as Replay[]) : []))
      .catch(() => setReplays([]));
  }, []);
  useEffect(() => {
    if (state.phase === "running") { setChoice(null); setTab("Graph"); setSide("report"); }
    if (state.phase === "done") setTab((t) => (t === "Graph" ? "Report" : t));
  }, [state.phase]);
  useEffect(() => { if (state.asking) { setSide("chat"); setTab((t) => (t === "Report" ? "Chat" : t)); } }, [state.asking]);
  const working = state.phase === "running" || state.phase === "done";
  // On a phone the graph has a tab to itself, so there is nothing to fold it for.
  const narrow = useNarrow();
  const open = narrow || (choice ?? state.phase === "running");
  const done = state.phase === "done";
  return (
    <div data-page="fit" className="fit">
      <CvProvider>
      <section className="page enter">
        <div className="wrap fit-wrap">
          {working ? (
            <>
              <Bar state={state} onReset={reset} />
              <Seg className="fit-tabs" options={TABS} value={tab} label="Views" onChange={setTab} />
              <div className={`fit-stage ${open ? "open" : "folded"} ${done ? "done" : "running"} side-${side}`} data-tab={tab}>
                <GraphPane state={state} open={open} onToggle={() => setChoice(!open)} />
                <div className="fit-main">
                  {open && done && (
                    <Seg className="wide" options={["Report", "Chat"] as const} value={side === "chat" ? "Chat" : "Report"} label="Beside the graph" onChange={(v) => setSide(v === "Chat" ? "chat" : "report")} />
                  )}
                  <Report state={state} onReset={reset} />
                  <Chat state={state} onAsk={ask} />
                </div>
              </div>
            </>
          ) : (
            <Start state={state} live={live} checking={checking} widget={widget} replays={replays} jd={jd} setJd={setJd} onRun={start} onReplay={replay} />
          )}
        </div>
      </section>
      </CvProvider>
    </div>
  );
}
