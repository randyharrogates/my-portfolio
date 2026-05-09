/** @format */

import { lazy, type LazyExoticComponent, type ComponentType } from "react";
import type { LandingThemeId, ThemeComponentProps, ThemeMeta } from "../types.ts";

interface RegistryEntry extends ThemeMeta {
  component: LazyExoticComponent<ComponentType<ThemeComponentProps>>;
}

export const THEME_REGISTRY: Record<LandingThemeId, RegistryEntry> = {
  "terminal-workstation": {
    id: "terminal-workstation",
    label: "Terminal Workstation",
    description: "Virtual desk + CRT monitor; certs as inspectable books.",
    defaultCameraPos: [0, 1.6, 5.0],
    component: lazy(() => import("./TerminalWorkstation.tsx")),
  },
  "mission-control": {
    id: "mission-control",
    label: "Mission Control",
    description: "Orbital rings of tech satellites + live telemetry HUD.",
    defaultCameraPos: [0, 2.5, 8.0],
    component: lazy(() => import("./MissionControl.tsx")),
  },
  constellation: {
    id: "constellation",
    label: "Constellation",
    description: "Tech graph with edges thickened by project co-occurrence.",
    defaultCameraPos: [0, 0, 9.0],
    component: lazy(() => import("./Constellation.tsx")),
  },
  topographic: {
    id: "topographic",
    label: "Topographic Atlas",
    description: "Career terrain; pin-towers per role on a contour map.",
    defaultCameraPos: [0, 3.5, 7.5],
    component: lazy(() => import("./Topographic.tsx")),
  },
};

export const THEME_IDS: LandingThemeId[] = Object.keys(
  THEME_REGISTRY
) as LandingThemeId[];
