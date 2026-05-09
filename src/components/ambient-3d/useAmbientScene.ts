/** @format */

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_AMBIENT, type AmbientSceneId } from "./types.ts";

const STORAGE_KEY = "ambient3d.scene";
const VALID: AmbientSceneId[] = ["graph", "phosphor", "grid", "off"];

function isValid(v: string | null | undefined): v is AmbientSceneId {
  return !!v && (VALID as string[]).includes(v);
}

function readQueryParam(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  const qIdx = hash.indexOf("?");
  if (qIdx === -1) return null;
  return new URLSearchParams(hash.slice(qIdx + 1)).get("ambient");
}

function readStorage(): string | null {
  try {
    return typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_KEY)
      : null;
  } catch {
    return null;
  }
}

function resolve(): AmbientSceneId {
  const fromUrl = readQueryParam();
  if (isValid(fromUrl)) return fromUrl;
  const fromStorage = readStorage();
  if (isValid(fromStorage)) return fromStorage;
  return DEFAULT_AMBIENT;
}

export function useAmbientScene(): {
  sceneId: AmbientSceneId;
  setSceneId: (id: AmbientSceneId) => void;
} {
  const [sceneId, setSceneIdState] = useState<AmbientSceneId>(() => resolve());

  useEffect(() => {
    const onHashChange = () => setSceneIdState(resolve());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const setSceneId = useCallback((id: AmbientSceneId) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* private mode */
    }
    setSceneIdState(id);
  }, []);

  return { sceneId, setSceneId };
}
