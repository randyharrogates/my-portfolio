/** @format */

import { useEffect, useState, useCallback } from "react";

const AUDIO_KEY = "landing.audioMuted";

export function useAudioMutedToggle(): {
  muted: boolean;
  setMuted: (m: boolean) => void;
  toggle: () => void;
} {
  const [muted, setMutedState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(AUDIO_KEY) !== "0";
  });
  const setMuted = useCallback((m: boolean) => {
    setMutedState(m);
    try {
      localStorage.setItem(AUDIO_KEY, m ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);
  const toggle = useCallback(() => setMuted(!muted), [muted, setMuted]);
  return { muted, setMuted, toggle };
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function useDocumentHidden(): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  return hidden;
}

/** True when the viewport width is ≤ 800 px (the Hall's mobile camera
 *  framing threshold). Read once at mount; the parent re-renders on
 *  resize via `useViewportAspect` if it needs a live value. */
export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 800;
}

type FidelityMode = "auto" | "low" | "high";

/** Master's "simplify-fx" PR locked the runtime to always-low fidelity to
 *  avoid the perf cliff on consumer GPUs. This stub preserves the
 *  `useFidelityMode` API the Hall consumes (lowFidelity flag + mode +
 *  setMode + reportFps) but with the mode pinned to `"low"` so callers
 *  unconditionally render in the cheaper path. setMode + reportFps are
 *  intentional no-ops. */
export function useFidelityMode(): {
  lowFidelity: boolean;
  mode: FidelityMode;
  setMode: (m: FidelityMode) => void;
  reportFps: (fps: number) => void;
} {
  return {
    lowFidelity: true,
    mode: "low",
    setMode: () => {},
    reportFps: () => {},
  };
}

type WebGPUState = "probing" | "available" | "unavailable";

/** Async feature-detects WebGPU: checks `navigator.gpu` and requests an
 *  adapter. Returns "probing" until the adapter probe resolves, then
 *  "available" or "unavailable". Phase 1.5 of the archipelago build
 *  consumes this to decide whether the Hall Canvas mounts a
 *  `WebGPURenderer` or falls back to default WebGL. */
export function useWebGPUAvailable(): WebGPUState {
  const [state, setState] = useState<WebGPUState>("probing");
  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      try {
        const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
        if (!gpu) {
          if (!cancelled) setState("unavailable");
          return;
        }
        const adapter = await gpu.requestAdapter();
        if (cancelled) return;
        setState(adapter ? "available" : "unavailable");
      } catch {
        if (!cancelled) setState("unavailable");
      }
    };
    probe();
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

/** Tracks the viewport aspect ratio (width / height) and re-renders on
 *  resize / orientationchange. Used to swap the 3D camera pose between
 *  landscape and portrait framings. */
export function useViewportAspect(): number {
  const [aspect, setAspect] = useState<number>(() =>
    typeof window === "undefined" ? 1.6 : window.innerWidth / window.innerHeight
  );
  useEffect(() => {
    const onResize = () => setAspect(window.innerWidth / window.innerHeight);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  return aspect;
}
