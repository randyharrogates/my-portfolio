/** @format */

export type AmbientSceneId = "graph" | "phosphor" | "grid" | "off";

export const AMBIENT_SCENES: { id: AmbientSceneId; label: string; title: string }[] = [
  { id: "graph", label: "graph", title: "Slow-drifting agent graph" },
  { id: "phosphor", label: "phosphor", title: "CRT phosphor texture" },
  { id: "grid", label: "grid", title: "Vanishing wireframe grid" },
  { id: "off", label: "off", title: "No ambient layer" },
];

export const DEFAULT_AMBIENT: AmbientSceneId = "graph";
