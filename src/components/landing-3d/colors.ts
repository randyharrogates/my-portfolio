/** @format */

import type { ChipColor } from "./types.ts";

export const TERMINAL_THEME = {
  paper: "#0c0b0a",
  panel: "#1d1b19",
  ink: "#c8bfb5",
  mute: "#8a8178",
  line: "#3a3532",
  accent: "#e8632a",
  blue: "#60a5fa",
  green: "#4ade80",
  purple: "#c084fc",
  font: "'JetBrains Mono', ui-monospace, monospace",
} as const;

export const CHIP_HEX: Record<ChipColor, string> = {
  orange: TERMINAL_THEME.accent,
  blue: TERMINAL_THEME.blue,
  green: TERMINAL_THEME.green,
  purple: TERMINAL_THEME.purple,
};
