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

/** One-shot mobile-viewport check (≤ 800px). Read once at mount by consumers
 *  via useMemo — does not respond to resize, matching the AmbientCanvas pattern. */
export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 800;
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
