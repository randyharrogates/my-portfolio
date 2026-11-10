// Drives one page session: starts runs and questions, paces frames so cached and
// recorded runs play at the speed they really ran, keeps the clock, and remembers
// the last finished session in this browser.

import { useCallback, useEffect, useReducer, useRef } from "react";
import { reducedMotion } from "../shared.tsx";
import { SITE_KEY, store, streamPost } from "./api.ts";
import type { PostResult } from "./api.ts";
import { initial, reduce } from "./state.ts";
import type { FitState } from "./state.ts";
import type { Frame, Replay } from "./types.ts";

const SESSION_KEY = "fit.session";
const SESSION_TTL_MS = 24 * 3600 * 1000;
const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface Turnstile {
  render(el: HTMLElement, opts: { sitekey: string; execution: "execute"; callback: (token: string) => void; "error-callback": () => void }): string;
  execute(el: HTMLElement): void;
  reset(id: string): void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

function loadTurnstile(): Promise<Turnstile | null> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.onload = () => resolve(window.turnstile ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

interface Saved {
  at: number; // when the report was produced: the server keeps it for 24 hours from then
  state: FitState;
}

function restore(): Saved | null {
  try {
    const saved = JSON.parse(store.get(SESSION_KEY) ?? "null") as Saved | null;
    if (!saved || Date.now() - saved.at > SESSION_TTL_MS || saved.state.phase !== "done") return null;
    return { at: saved.at, state: { ...saved.state, asking: false } };
  } catch {
    return null;
  }
}

export function useFit() {
  const restored = useRef(restore()).current;
  const [state, dispatch] = useReducer(reduce, restored?.state ?? initial);
  const reportAt = useRef(restored?.at ?? 0);
  const run = useRef({ id: 0, startedAt: 0, lastAt: 0, timers: new Set<number>(), abort: null as AbortController | null });
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const pendingToken = useRef<((token: string) => void) | null>(null);

  const cancel = useCallback(() => {
    run.current.id++;
    run.current.abort?.abort();
    run.current.timers.forEach((t) => window.clearTimeout(t));
    run.current.timers.clear();
  }, []);
  useEffect(() => cancel, [cancel]);

  // Frames carry `t`, milliseconds since the run began. A live run delivers them
  // on time already; a cached or recorded one arrives at once and is spread out here.
  const pace = useCallback((frame: Frame, id: number) => {
    const r = run.current;
    const due = Math.max(r.lastAt, r.startedAt + (reducedMotion() ? 0 : (frame.t ?? 0)));
    r.lastAt = due;
    const timer = window.setTimeout(() => {
      r.timers.delete(timer);
      if (r.id === id) dispatch({ kind: "frame", frame });
    }, Math.max(0, due - performance.now()));
    r.timers.add(timer);
  }, []);

  const begin = useCallback(() => {
    cancel();
    const r = run.current;
    r.startedAt = r.lastAt = performance.now();
    r.abort = new AbortController();
    return r.id;
  }, [cancel]);

  // Remember a finished live session, so a reload keeps the report and the conversation.
  useEffect(() => {
    if (state.phase !== "done" || state.replay || state.asking) return;
    reportAt.current ||= Date.now();
    store.set(SESSION_KEY, JSON.stringify({ at: reportAt.current, state } satisfies Saved));
  }, [state]);

  const humanToken = useCallback(async (): Promise<string> => {
    if (!SITE_KEY) return "local"; // local development: the Worker runs with Cloudflare's always-pass test secret
    const turnstile = await loadTurnstile();
    const el = widget.current;
    if (!turnstile || !el) return "";
    return new Promise((resolve) => {
      pendingToken.current = resolve;
      if (widgetId.current === null) {
        widgetId.current = turnstile.render(el, {
          sitekey: SITE_KEY,
          execution: "execute",
          callback: (token) => pendingToken.current?.(token),
          "error-callback": () => pendingToken.current?.(""),
        });
      } else {
        turnstile.reset(widgetId.current);
      }
      turnstile.execute(el);
    });
  }, []);

  const refuse = useCallback((result: PostResult, id: number) => {
    if (result.ok || run.current.id !== id || result.error === "stopped") return;
    dispatch({ kind: "refuse", refusal: result.error, retryAfterSec: result.retryAfterSec });
  }, []);

  const start = useCallback(
    async (jd: string) => {
      const id = begin();
      reportAt.current = 0;
      dispatch({ kind: "start", jd, replay: false });
      const turnstileToken = await humanToken();
      if (run.current.id !== id) return;
      run.current.startedAt = run.current.lastAt = performance.now();
      refuse(await streamPost("/run", { jd, turnstileToken }, (f) => pace(f, id), run.current.abort!.signal), id);
    },
    [begin, humanToken, pace, refuse],
  );

  const replay = useCallback(
    (recorded: Replay) => {
      const id = begin();
      dispatch({ kind: "start", jd: recorded.jd, replay: true });
      recorded.frames.forEach((f) => pace(f, id));
    },
    [begin, pace],
  );

  const ask = useCallback(
    async (question: string) => {
      if (!state.reportId || state.asking) return;
      const id = begin();
      dispatch({ kind: "ask", question });
      refuse(await streamPost("/ask", { reportId: state.reportId, question }, (f) => dispatch({ kind: "frame", frame: f }), run.current.abort!.signal), id);
    },
    [begin, refuse, state.reportId, state.asking],
  );

  const reset = useCallback(() => {
    cancel();
    store.remove(SESSION_KEY);
    dispatch({ kind: "reset" });
  }, [cancel]);

  return { state, start, replay, ask, reset, widget };
}
