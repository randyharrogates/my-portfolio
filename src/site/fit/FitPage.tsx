import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { jump } from "../shared.tsx";
import { API, isLive } from "./api.ts";
import { STEP_NAMES } from "./state.ts";
import type { Card, ChatItem, FitState, Refusal } from "./state.ts";
import type { Action, Evidence, Replay } from "./types.ts";
import { useFit } from "./useFit.ts";
import "./fit.css";

const MIN_JD = 80;
const MAX_JD = 6000;
const MIN_QUESTION = 8;
const MAX_QUESTION = 300;

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const count = (n: number) => n.toLocaleString();
const cost = (micro: number) => `$${(micro / 1e6).toFixed(micro < 1000 ? 5 : 4)}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// A source link is only ever one of the site's own pages or its résumé PDF.
// Anything else the stream might carry is shown as plain text, never as a link.
function Source({ evidence }: { evidence: Evidence }) {
  if (/^#\/[a-z0-9/_-]*$/i.test(evidence.url)) return <Link className="fit-src" to={evidence.url.slice(1)}>{evidence.title}</Link>;
  if (evidence.url === "Resume.pdf") return <a className="fit-src" href="Resume.pdf" target="_blank" rel="noopener noreferrer">{evidence.title}</a>;
  return <span className="fit-src">{evidence.title}</span>;
}

function ActionChip({ action }: { action: Action }) {
  if (action === "email") return <button type="button" className="chip" onClick={() => jump("emailText")}>Email me</button>;
  return action === "resume" ? <Link className="chip" to="/resume">Open my résumé</Link> : <Link className="chip" to="/work">Browse the case studies</Link>;
}

const BADGE: Record<string, [string, string]> = { strong: ["●", "strong"], partial: ["◐", "partial"], gap: ["○", "gap"] };

function ReportCard({ card, index }: { card: Card; index: number }) {
  const [mark, label] = card.verdict ? BADGE[card.verdict] : ["", ""];
  const kind = card.importance === "nice" ? "nice-to-have" : "must-have";
  return (
    <article className={"fit-card " + (card.verdict ?? "pending")} style={{ animationDelay: `${index * 30}ms` }}>
      <div className="fit-card-head">
        <h3>{card.text}</h3>
        {card.verdict ? (
          <span className={"fit-badge " + card.verdict}>{mark} {label} · {kind}</span>
        ) : (
          <span className="fit-badge live">{card.chunks.length ? `reading ${plural(card.chunks.length, "excerpt")}` : "searching"}</span>
        )}
      </div>
      {!card.verdict && (
        <>
          <ul className="fit-reading">
            {card.chunks.slice(0, 3).map((title, i) => <li key={i}>→ {title}</li>)}
            {card.chunks.length > 3 && <li>+ {card.chunks.length - 3} more</li>}
          </ul>
          <div className="fit-skel" /><div className="fit-skel short" />
        </>
      )}
      {card.evidence.map((e) => (
        <figure key={e.chunkId + e.quote} className="fit-quote">
          <blockquote>“{e.quote}”</blockquote>
          <figcaption><span className="ok">✓ quote matches source</span><Source evidence={e} /></figcaption>
        </figure>
      ))}
      {card.verdict === "gap" && <p className="fit-muted">Nothing in my case studies or CV shows this{card.chunks.length ? `. The search returned ${plural(card.chunks.length, "excerpt")}; none supported it.` : "."}</p>}
      {(card.dropped > 0 || card.lowered) && (
        <p className="fit-flags">
          {card.dropped > 0 && <span>▲ {plural(card.dropped, "quote")} not found in the source, removed</span>}
          {card.lowered && <span>▲ lowered by the critic</span>}
        </p>
      )}
    </article>
  );
}

function Bubble({ item }: { item: ChatItem }) {
  if (item.from === "visitor")
    return (
      <div className="fit-bubble visitor">
        <span>{item.text.length > 220 ? item.text.slice(0, 220) + "…" : item.text}</span>
        {item.note && <small>{item.note}</small>}
      </div>
    );
  return (
    <div className={"fit-bubble agent" + (item.answer && item.answer.kind !== "grounded" ? " plain" : "")}>
      {item.note && <small>{item.note}</small>}
      <span>{item.text}{item.streaming && <i className="fit-caret" aria-hidden="true" />}</span>
      {item.answer?.evidence.map((e) => (
        <figure key={e.chunkId + e.quote} className="fit-quote small">
          <blockquote>“{e.quote}”</blockquote>
          <figcaption><span className="ok">✓ quote matches source</span><Source evidence={e} /></figcaption>
        </figure>
      ))}
      {item.answer && item.answer.actions.length > 0 && <div className="fit-chips">{item.answer.actions.map((a) => <ActionChip key={a} action={a} />)}</div>}
    </div>
  );
}

function Chat({ state, onAsk }: { state: FitState; onAsk: (q: string) => void }) {
  const [question, setQuestion] = useState("");
  const log = useRef<HTMLDivElement>(null);
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
  return (
    <section className="fit-pane fit-chat" aria-label="Conversation">
      <header><span className="eyebrow">Conversation</span><b>{state.phase === "running" || state.asking ? "Streaming" : "With my agent"}</b></header>
      <div className="fit-log" aria-live="polite" ref={log}>
        {state.chat.map((item, i) => <Bubble key={i} item={item} />)}
        {state.phase === "done" && !state.asking && (state.suggestions.length > 0 || state.actions.length > 0) && (
          <div className="fit-chips">
            {canAsk && state.suggestions.map((s) => <button key={s} type="button" className="chip" onClick={() => send(s)}>{s}</button>)}
            {state.actions.map((a) => <ActionChip key={a} action={a} />)}
          </div>
        )}
      </div>
      <form className="fit-ask" onSubmit={(e) => { e.preventDefault(); send(question); }}>
        <label htmlFor="fit-q">
          {state.replay ? "Questions are open on live runs" : state.phase !== "done" ? "Questions open when the report is done" : state.questionsLeft === null ? "Ask me about this report · 5 questions a day" : `Ask me about this report · ${state.questionsLeft} of 5 questions left today`}
        </label>
        <div>
          <input id="fit-q" value={question} maxLength={MAX_QUESTION} disabled={!canAsk} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. What did you build with MCP?" autoComplete="off" />
          <button className="btn primary" type="submit" disabled={!canAsk || question.trim().length < MIN_QUESTION} aria-label="Send question">→</button>
        </div>
      </form>
    </section>
  );
}

function Report({ state, onReset }: { state: FitState; onReset: () => void }) {
  const tally = (v: string) => state.cards.filter((c) => c.verdict === v).length;
  return (
    <section className="fit-report" aria-label="Fit report">
      <div className="fit-title">
        <span className="eyebrow">Fit report{state.phase === "running" ? " · filling in as evidence arrives" : state.replay ? " · recorded run" : state.cached ? " · from the last 24 hours" : ""}</span>
        <h1>{state.role || "Reading the role…"}</h1>
        {state.summary && <p className="fit-summary">{state.summary}</p>}
      </div>
      {state.phase === "done" && (
        <div className="fit-tally">
          <div><b className="strong">{tally("strong")}</b><span>strong</span></div>
          <div><b className="partial">{tally("partial")}</b><span>partial</span></div>
          <div className="gap"><b>{tally("gap")}</b><span>gap</span></div>
        </div>
      )}
      {state.cards.map((c, i) => <ReportCard key={c.id} card={c} index={i} />)}
      {state.phase === "done" && (
        <div className="fit-foot">
          <span className="fit-muted">Every quote is checked in code against the page it cites before it is shown.</span>
          <button className="btn" type="button" onClick={onReset}>Try another job description</button>
        </div>
      )}
    </section>
  );
}

function Trace({ state }: { state: FitState }) {
  const tokens = state.totals.input + state.totals.output;
  const g = state.guardrails;
  return (
    <aside className="fit-pane fit-trace" aria-label="Agent trace">
      <header>
        <div><span className="eyebrow">Agent trace</span><b>{plural(state.totals.calls, "model call")}{state.phase === "running" ? " so far" : ""}</b></div>
        <span className={"fit-badge " + (state.phase === "running" ? "live" : "strong") + (state.phase === "done" ? " pulse" : "")} role="status">{state.phase === "running" ? "running" : "completed"}</span>
      </header>
      <div className="fit-meter">
        <div><b className={state.phase === "running" ? "ticking" : ""}>{seconds(state.elapsedMs)}</b><span>elapsed</span></div>
        <div><b>{count(tokens)}</b><span>tokens</span></div>
        <div><b>{cost(state.totals.costMicro)}</b><span>est. cost</span></div>
      </div>
      <ol className="fit-steps">
        {state.steps.map((st, i) => (
          <li key={st.key} className={st.state}>
            <span className="fit-mark" aria-hidden="true">{st.state === "done" ? "✓" : st.state === "failed" ? "!" : st.state === "running" ? "" : i + 1}</span>
            <div>
              <div className="fit-row"><b>{STEP_NAMES[st.key].name}{st.key === "retriever" && state.cards.length > 0 ? ` × ${state.cards.length}` : ""}</b>{st.ms !== undefined && <span>{seconds(st.ms)}</span>}</div>
              <span className="fit-muted">{st.state === "waiting" ? STEP_NAMES[st.key].waiting : st.state === "running" ? "working…" : st.state === "failed" ? "failed" : STEP_NAMES[st.key].waiting}</span>
              {st.key === "retriever" && state.retrievers.length > 0 && (
                <ul className="fit-subs">
                  {state.retrievers.map((r) => {
                    const card = state.cards.find((c) => c.id === r.id);
                    return (
                      <li key={r.id} className={r.state}>
                        <span>{r.state === "running" ? "●" : "✓"} {r.id} · {card?.verdict ? plural(card.evidence.length, "quote") : "reading"}</span>
                        <span>{r.ms !== undefined ? seconds(r.ms) : "…"}{r.tokens ? ` · ${count(r.tokens)} tok` : ""}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {st.usage && <span className="fit-usage">{count(st.usage.input)} in{st.usage.cached ? ` · ${count(st.usage.cached)} cached` : ""} · {count(st.usage.output)} out · {cost(st.costMicro ?? 0)}</span>}
            </div>
          </li>
        ))}
      </ol>
      {g.quotesDropped + g.lowered + g.gaps > 0 && (
        <div className="fit-guard">
          <span className="eyebrow">Guardrails that fired</span>
          {g.quotesDropped > 0 && <p>▲ {plural(g.quotesDropped, "quote")} dropped: not found in the cited source</p>}
          {g.lowered > 0 && <p>▲ {plural(g.lowered, "verdict")} lowered by the critic</p>}
          {g.gaps > 0 && <p>○ {plural(g.gaps, "requirement")} with no evidence, reported as {g.gaps === 1 ? "a gap" : "gaps"}</p>}
        </div>
      )}
      <div className="fit-cap">
        <div className="fit-row"><span>model calls</span><span>{state.totals.calls} of 10 allowed</span></div>
        <div className="fit-bar" role="img" aria-label={`${state.totals.calls} of 10 model calls used`}><i style={{ width: `${Math.min(100, state.totals.calls * 10)}%` }} /></div>
        <small>Cost is an estimate from token counts at the model’s list price.</small>
      </div>
    </aside>
  );
}

const REFUSALS: Record<Refusal, [string, string]> = {
  not_a_job_description: ["That doesn’t look like a job description", "This page only checks a role against my published work. Paste the advert’s responsibilities and requirements and try again."],
  burst: ["One run at a time", "Runs are spaced 10 seconds apart to keep scripts out. Your text is still here."],
  busy: ["One run at a time", "Your last run is still finishing. Try again in a few seconds."],
  slow_down: ["Too many requests", "Give it a few seconds and try again."],
  daily: ["You’ve used today’s 5 runs", "Live runs reset at midnight UTC. Recorded runs below are always available."],
  budget_exhausted: ["Live runs are paused", "This agent runs on a fixed monthly budget and it has been used up. Recorded runs below are real runs, replayed step by step."],
  live_runs_off: ["Live runs are paused", "Live runs are switched off right now. Recorded runs below are real runs, replayed step by step."],
  turnstile_failed: ["The human check didn’t pass", "Reload the page and try again."],
  report_expired: ["That report has expired", "Run the job description again."],
  network: ["I couldn’t reach the server", "Check your connection and try again."],
  failed: ["That run failed", "A step did not return a usable answer. It was not counted as a result; try again."],
  stopped: ["Stopped", "The run was stopped."],
};

function Start({ state, live, replays, onRun, onReplay }: { state: FitState; live: boolean; replays: Replay[]; onRun: (jd: string) => void; onReplay: (r: Replay) => void }) {
  const [jd, setJd] = useState("");
  const [wait, setWait] = useState(0);
  useEffect(() => setWait(state.retryAfterSec > 60 ? 0 : state.retryAfterSec), [state.retryAfterSec, state.refusal]);
  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);
  const length = jd.trim().length;
  const ready = live && length >= MIN_JD && length <= MAX_JD && wait === 0;
  const refusal = state.phase === "refused" && state.refusal ? REFUSALS[state.refusal] : null;
  return (
    <div className="fit-start">
      <section>
        <span className="eyebrow">A multi-agent system, running live</span>
        <h1>Paste a job description. Watch five agents check the fit.</h1>
        <p className="lede">A planner reads the role, up to six retrievers search my case studies and CV in parallel, a critic challenges the evidence, and you get a report where every claim is an exact quote you can open. Gaps are listed, not hidden. Then ask me about it.</p>
        {refusal && (
          <div className="fit-refusal" role="status">
            <h2>{refusal[0]}</h2>
            <p>{refusal[1]}</p>
            <div className="fit-chips"><ActionChip action="email" /><ActionChip action="resume" /></div>
          </div>
        )}
        <form className="fit-form" onSubmit={(e) => { e.preventDefault(); if (ready) onRun(jd.trim()); }}>
          <label htmlFor="fit-jd">Job description</label>
          <textarea id="fit-jd" rows={9} maxLength={MAX_JD} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the full advert here: responsibilities and requirements work best." />
          <div className="fit-row">
            <span className="mono">{count(length)} of {count(MAX_JD)} characters · minimum {MIN_JD}{state.runsLeft !== null ? ` · ${state.runsLeft} of 5 runs left today` : ""}</span>
            <button className="btn primary" type="submit" disabled={!ready}>{wait > 0 ? `Retry in ${wait}s` : live ? "Check the fit" : "Live runs are off"}</button>
          </div>
          <p className="fit-muted">This is an AI agent answering as me, from my published pages only. It can be wrong, and nothing it says is a commitment. Your text is sent to OpenAI to produce the report; the job description is not stored, and the report and your questions are kept for 24 hours so follow-ups work.</p>
        </form>
        {replays.length > 0 && (
          <div className="fit-replays">
            <span className="eyebrow">Or replay a recorded run · uses none of your runs</span>
            <div>
              {replays.map((r) => (
                <button key={r.id} type="button" onClick={() => onReplay(r)}><b>{r.title}</b><span>{r.result}</span></button>
              ))}
            </div>
          </div>
        )}
      </section>
      <aside className="fit-pane">
        <header><div><span className="eyebrow">Agent trace</span><b>Waiting for a job description</b></div></header>
        <ol className="fit-steps">
          {Object.entries(STEP_NAMES).map(([key, s], i) => (
            <li key={key} className="waiting"><span className="fit-mark" aria-hidden="true">{i + 1}</span><div><b>{s.name}{key === "retriever" ? " × 6, in parallel" : ""}</b><span className="fit-muted">{s.waiting}</span></div></li>
          ))}
        </ol>
        <div className="fit-guard">
          <span className="eyebrow">Built-in limits</span>
          <p>At most 10 model calls per run, 5 runs and 5 questions a day per visitor, and a fixed monthly budget. Every step streams here live, with time elapsed, tokens used and estimated cost.</p>
        </div>
      </aside>
    </div>
  );
}

const TABS = ["Chat", "Report", "Trace"] as const;

export default function FitPage() {
  const { state, start, replay, ask, reset, widget } = useFit();
  const [live, setLive] = useState(false);
  const [replays, setReplays] = useState<Replay[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Report");
  useEffect(() => {
    isLive().then(setLive);
    fetch("site/fit/replays.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: unknown) => setReplays(Array.isArray(list) ? (list as Replay[]) : []))
      .catch(() => setReplays([]));
  }, []);
  const working = state.phase === "running" || state.phase === "done";
  return (
    <div data-page="fit" className="fit">
      <section className="page enter">
        <div className="wrap fit-wrap">
          {working ? (
            <>
              <div className="fit-tabs" role="tablist" aria-label="Views">
                {TABS.map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>)}
              </div>
              <div className="fit-panes" data-tab={tab}>
                <Chat state={state} onAsk={ask} />
                <Report state={state} onReset={reset} />
                <Trace state={state} />
              </div>
            </>
          ) : (
            <Start state={state} live={live && API !== ""} replays={replays} onRun={start} onReplay={replay} />
          )}
          <div ref={widget} className="fit-turnstile" />
        </div>
      </section>
    </div>
  );
}
