/** @format */

import { useEffect, useState, useRef, useCallback } from "react";

export type FidelityMode = "auto" | "low" | "full";

const FIDELITY_KEY = "landing.fidelity";
const AUDIO_KEY = "landing.audioMuted";

function readMode(): FidelityMode {
  if (typeof window === "undefined") return "low";
  const v = localStorage.getItem(FIDELITY_KEY);
  if (v === "low" || v === "full" || v === "auto") return v;
  return "low";
}

export function detectInitialLowPerf(): boolean {
  if (typeof window === "undefined") return false;
  const cores = (navigator as Navigator & { hardwareConcurrency?: number })
    .hardwareConcurrency;
  const isMobile = window.matchMedia("(max-width: 800px)").matches;
  return (cores !== undefined && cores < 4) || isMobile;
}

export function useFidelityMode(): {
  mode: FidelityMode;
  setMode: (m: FidelityMode) => void;
  lowFidelity: boolean;
  reportFps: (fps: number) => void;
} {
  const [mode, setModeState] = useState<FidelityMode>(() => readMode());
  const [autoLow, setAutoLow] = useState<boolean>(() => detectInitialLowPerf());

  const setMode = useCallback((m: FidelityMode) => {
    setModeState(m);
    try {
      localStorage.setItem(FIDELITY_KEY, m);
    } catch {
      /* ignore */
    }
  }, []);

  // Rolling 3-second FPS sampler. If avg < 30 for 3s consecutively, flip auto-low.
  const samplesRef = useRef<{ t: number; fps: number }[]>([]);
  const reportFps = useCallback(
    (fps: number) => {
      if (mode !== "auto") return;
      const now = performance.now();
      samplesRef.current.push({ t: now, fps });
      // Drop samples older than 3s
      samplesRef.current = samplesRef.current.filter((s) => now - s.t < 3000);
      if (samplesRef.current.length < 30) return; // need a meaningful window
      const avg =
        samplesRef.current.reduce((a, s) => a + s.fps, 0) /
        samplesRef.current.length;
      if (avg < 30 && !autoLow) setAutoLow(true);
      else if (avg > 50 && autoLow) setAutoLow(false);
    },
    [mode, autoLow]
  );

  const lowFidelity = mode === "low" || (mode === "auto" && autoLow);
  return { mode, setMode, lowFidelity, reportFps };
}

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

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 800px)").matches;
}

/** Reactive variant of `isMobileViewport` that re-renders the consumer when the
 *  viewport crosses the 800px breakpoint (orientation change, tablet split-view,
 *  desktop window resize). Use this from components that need to gate render
 *  paths on mobile vs. desktop. */
export function useIsMobileViewport(): boolean {
  const [mobile, setMobile] = useState<boolean>(() => isMobileViewport());
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 800px)");
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
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
