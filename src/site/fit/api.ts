// The only code that talks to the Worker. One POST per run or question, read as
// a server-sent event stream.

import type { Frame } from "./types.ts";

export const API = (process.env.REACT_APP_FIT_API ?? "").replace(/\/+$/, "");
export const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY ?? "";

const VISITOR_KEY = "fit.visitor";

// Browser storage can be blocked or full; the page must work without it.
export const store = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* not remembered, nothing else changes */
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* nothing to do */
    }
  },
};

export type PostResult = { ok: true } | { ok: false; error: string; retryAfterSec: number };

export async function streamPost(path: "/run" | "/ask", body: unknown, onFrame: (f: Frame) => void, signal: AbortSignal): Promise<PostResult> {
  const visitor = store.get(VISITOR_KEY);
  let res: Response;
  try {
    res = await fetch(API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(visitor ? { "X-Visitor": visitor } : {}) },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    return { ok: false, error: signal.aborted ? "stopped" : "network", retryAfterSec: 0 };
  }
  const issued = res.headers.get("X-Visitor");
  if (issued) store.set(VISITOR_KEY, issued);
  if (!res.ok || !res.body) {
    const error = await res
      .json()
      .then((j: { error?: unknown }) => (typeof j.error === "string" ? j.error : "failed"))
      .catch(() => "failed");
    return { ok: false, error, retryAfterSec: Number(res.headers.get("Retry-After") ?? "0") || 0 };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf("\n\n")) >= 0) {
        const message = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (!message.startsWith("data: ")) continue;
        try {
          onFrame(JSON.parse(message.slice(6)) as Frame);
        } catch {
          /* a frame that is not JSON is skipped, never rendered */
        }
      }
    }
  } catch {
    return { ok: false, error: signal.aborted ? "stopped" : "network", retryAfterSec: 0 };
  }
  return { ok: true };
}

export async function isLive(): Promise<boolean> {
  if (!API) return false;
  try {
    const res = await fetch(API + "/status");
    return res.ok && ((await res.json()) as { live?: boolean }).live === true;
  } catch {
    return false;
  }
}
