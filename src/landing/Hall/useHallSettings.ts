/** @format */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type HallViewMode = "orbit" | "guided";
export type TriState = "system" | "on" | "off";
export type AutoRotateMode = "hub-only" | "always" | "never";

/** Persisted Hall settings. Defaults: orbit view mode, 1.0× sensitivity,
 *  50° FOV, hub-only auto-rotate, POI labels off, FPS counter on,
 *  reduced-motion follows system. */
export interface HallSettings {
  viewMode: HallViewMode;
  sensitivity: number;
  fov: number;
  autoRotate: AutoRotateMode;
  poiLabels: boolean;
  fpsCounter: boolean;
  reducedMotionOverride: TriState;
}

export const HALL_DEFAULT_SETTINGS: HallSettings = {
  viewMode: "orbit",
  sensitivity: 1.0,
  fov: 50,
  autoRotate: "hub-only",
  poiLabels: false,
  fpsCounter: true,
  reducedMotionOverride: "system",
};

const SETTINGS_KEY_PREFIX = "hall.settings.";
const TUTORIAL_KEY_PREFIX = "hall.tutorial.";

export const HALL_TUTORIAL_KEYS = {
  orbPulseSeen: `${TUTORIAL_KEY_PREFIX}orbPulseSeen`,
  mobileDeck: `${TUTORIAL_KEY_PREFIX}mobileDeck`,
} as const;

function readSetting<K extends keyof HallSettings>(
  key: K
): HallSettings[K] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY_PREFIX + key);
    if (raw === null) return null;
    return JSON.parse(raw) as HallSettings[K];
  } catch {
    return null;
  }
}

function writeSetting<K extends keyof HallSettings>(
  key: K,
  value: HallSettings[K]
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY_PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

function loadSettings(): HallSettings {
  const out = { ...HALL_DEFAULT_SETTINGS };
  (Object.keys(out) as Array<keyof HallSettings>).forEach((k) => {
    const v = readSetting(k);
    if (v !== null) {
      (out as Record<string, unknown>)[k as string] = v as unknown;
    }
  });
  // Guard against stale persisted view modes — "focus" / "photo" were
  // removed 2026-05-18; a returning visitor with one cached falls back
  // to orbit.
  if (out.viewMode !== "orbit" && out.viewMode !== "guided") {
    out.viewMode = "orbit";
  }
  return out;
}

export interface HallSettingsContextValue {
  settings: HallSettings;
  setViewMode: (m: HallViewMode) => void;
  setSensitivity: (v: number) => void;
  setFov: (v: number) => void;
  setAutoRotate: (m: AutoRotateMode) => void;
  setPoiLabels: (b: boolean) => void;
  setFpsCounter: (b: boolean) => void;
  setReducedMotionOverride: (m: TriState) => void;
  resetAll: () => void;
  /** Bumps on resetAll so subscribers (orb pulse, mobile deck) can re-arm. */
  resetEpoch: number;
}

const HallSettingsContext = createContext<HallSettingsContextValue | null>(
  null
);

interface HallSettingsProviderProps {
  children: React.ReactNode;
}

export const HallSettingsProvider: React.FC<HallSettingsProviderProps> = ({
  children,
}) => {
  const [settings, setSettings] = useState<HallSettings>(() => loadSettings());
  const [resetEpoch, setResetEpoch] = useState(0);

  const makeSetter = useCallback(
    <K extends keyof HallSettings>(key: K) =>
      (value: HallSettings[K]) => {
        setSettings((prev) => {
          if (prev[key] === value) return prev;
          writeSetting(key, value);
          return { ...prev, [key]: value };
        });
      },
    []
  );

  const setViewMode = useMemo(() => makeSetter("viewMode"), [makeSetter]);
  const setSensitivity = useMemo(() => makeSetter("sensitivity"), [makeSetter]);
  const setFov = useMemo(() => makeSetter("fov"), [makeSetter]);
  const setAutoRotate = useMemo(() => makeSetter("autoRotate"), [makeSetter]);
  const setPoiLabels = useMemo(() => makeSetter("poiLabels"), [makeSetter]);
  const setFpsCounter = useMemo(() => makeSetter("fpsCounter"), [makeSetter]);
  const setReducedMotionOverride = useMemo(
    () => makeSetter("reducedMotionOverride"),
    [makeSetter]
  );

  const resetAll = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        (Object.keys(HALL_DEFAULT_SETTINGS) as Array<keyof HallSettings>).forEach(
          (k) => localStorage.removeItem(SETTINGS_KEY_PREFIX + k)
        );
        Object.values(HALL_TUTORIAL_KEYS).forEach((k) =>
          localStorage.removeItem(k)
        );
      } catch {
        /* ignore */
      }
    }
    setSettings({ ...HALL_DEFAULT_SETTINGS });
    setResetEpoch((e) => e + 1);
  }, []);

  const value = useMemo<HallSettingsContextValue>(
    () => ({
      settings,
      setViewMode,
      setSensitivity,
      setFov,
      setAutoRotate,
      setPoiLabels,
      setFpsCounter,
      setReducedMotionOverride,
      resetAll,
      resetEpoch,
    }),
    [
      settings,
      setViewMode,
      setSensitivity,
      setFov,
      setAutoRotate,
      setPoiLabels,
      setFpsCounter,
      setReducedMotionOverride,
      resetAll,
      resetEpoch,
    ]
  );

  return React.createElement(
    HallSettingsContext.Provider,
    { value },
    children
  );
};

export function useHallSettings(): HallSettingsContextValue {
  const ctx = useContext(HallSettingsContext);
  if (!ctx) {
    throw new Error(
      "useHallSettings must be used within a HallSettingsProvider"
    );
  }
  return ctx;
}

/** Reads a tutorial flag from localStorage. Returns true if the user has
 *  already seen the named tutorial element. */
export function readTutorialFlag(key: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}

export function writeTutorialFlag(key: string, seen: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (seen) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Resolve the effective reduced-motion state by combining the system
 *  preference with the user override. */
export function resolveReducedMotion(
  systemReducedMotion: boolean,
  override: TriState
): boolean {
  if (override === "on") return true;
  if (override === "off") return false;
  return systemReducedMotion;
}

/** Subscribe to the document URL's `view=…` query (when serving under
 *  HashRouter, this lives after the section path). Reads once at mount. */
export function readViewModeFromUrl(): HallViewMode | null {
  if (typeof window === "undefined") return null;
  try {
    const hash = window.location.hash || "";
    const q = hash.indexOf("?");
    if (q < 0) return null;
    const params = new URLSearchParams(hash.slice(q + 1));
    const v = params.get("view");
    if (v === "orbit" || v === "guided") return v;
    return null;
  } catch {
    return null;
  }
}

useHallSettings.displayName = "useHallSettings";
