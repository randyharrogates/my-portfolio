/** @format */

import { useCallback, useEffect, useState } from "react";
import type { LandingThemeId } from "./types.ts";

const VALID: LandingThemeId[] = [
  "terminal-workstation",
  "mission-control",
  "constellation",
  "topographic",
];

const STORAGE_KEY = "landing3d.theme";
const DEFAULT_THEME: LandingThemeId = "terminal-workstation";

function isValid(v: string | null | undefined): v is LandingThemeId {
  return !!v && (VALID as string[]).includes(v);
}

function readQueryParam(): string | null {
  if (typeof window === "undefined") return null;
  // HashRouter puts the query after the hash: #/?theme=mission-control
  const hash = window.location.hash;
  const qIdx = hash.indexOf("?");
  if (qIdx === -1) return null;
  const params = new URLSearchParams(hash.slice(qIdx + 1));
  return params.get("theme");
}

function readStorage(): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

function readEnv(): string | undefined {
  return process.env.REACT_APP_LANDING_3D_THEME;
}

function resolve(): LandingThemeId {
  const sources = [readQueryParam(), readStorage(), readEnv()];
  for (const v of sources) {
    if (isValid(v)) return v;
  }
  return DEFAULT_THEME;
}

export function useLandingTheme(): {
  themeId: LandingThemeId;
  setThemeId: (id: LandingThemeId) => void;
} {
  const [themeId, setThemeIdState] = useState<LandingThemeId>(() => resolve());

  // Re-resolve on hash change so URL ?theme= updates take effect without reload
  useEffect(() => {
    const onHashChange = () => setThemeIdState(resolve());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const setThemeId = useCallback((id: LandingThemeId) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore storage errors (private mode etc.)
    }
    setThemeIdState(id);
  }, []);

  return { themeId, setThemeId };
}
