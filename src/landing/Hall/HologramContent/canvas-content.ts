/** @format */

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

export interface CanvasContent {
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  /** Mark the texture as dirty so three.js re-uploads it on the next frame. */
  flush: () => void;
}

/** Allocate an offscreen canvas + matching CanvasTexture sized to the
 *  hologram's expected resolution. Returns a stable handle the per-alcove
 *  content components draw into. */
export function useCanvasContent(width = 1024, height = 640): CanvasContent {
  const ref = useRef<CanvasContent | null>(null);
  if (!ref.current) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.anisotropy = 4;
    ref.current = {
      canvas,
      texture,
      ctx,
      width,
      height,
      flush: () => {
        texture.needsUpdate = true;
      },
    };
  }
  useEffect(
    () => () => {
      ref.current?.texture.dispose();
    },
    []
  );
  return ref.current;
}

export interface DrawTheme {
  bg: string;
  fg: string;
  accent: string;
  mute: string;
  hairline: string;
}

export const HOLOGRAM_THEME: DrawTheme = {
  bg: "#06090b",
  fg: "#eafff7",
  accent: "#7afff0",
  mute: "#9ab3ac",
  hairline: "rgba(122, 255, 240, 0.18)",
};

/** Clear the canvas and draw the universal chrome (corner brackets +
 *  hairline grid) every alcove content shares. */
export function drawChrome(content: CanvasContent, theme: DrawTheme): void {
  const { ctx, width, height } = content;
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = theme.hairline;
  ctx.lineWidth = 1;
  const grid = 64;
  ctx.beginPath();
  for (let x = grid; x < width; x += grid) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = grid; y < height; y += grid) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  const bracket = 36;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  const corners: [number, number, number, number][] = [
    [16, 16, 1, 1],
    [width - 16, 16, -1, 1],
    [16, height - 16, 1, -1],
    [width - 16, height - 16, -1, -1],
  ];
  corners.forEach(([x, y, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * bracket);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * bracket, y);
    ctx.stroke();
  });
}

/** Throttle a per-frame callback to ~`hz` redraws per second. Mounting a
 *  content component is cheap but redrawing the whole canvas every R3F
 *  frame is wasteful for hologram text that updates slowly. */
export function useThrottledDraw(
  hz: number,
  draw: (elapsed: number) => void
): (state: { clock: { elapsedTime: number } }) => void {
  const lastRef = useRef(0);
  return useCallback(
    (state) => {
      const t = state.clock.elapsedTime;
      const interval = 1 / hz;
      if (t - lastRef.current < interval) return;
      lastRef.current = t;
      draw(t);
    },
    [hz, draw]
  );
}

export function drawLowerThird(
  content: CanvasContent,
  theme: DrawTheme,
  title: string,
  subtitle: string
): void {
  const { ctx, height } = content;
  ctx.font = "500 18px JetBrains Mono, ui-monospace, monospace";
  ctx.fillStyle = theme.mute;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillText(subtitle.toUpperCase(), 56, height - 64);
  ctx.font = "600 36px JetBrains Mono, ui-monospace, monospace";
  ctx.fillStyle = theme.fg;
  ctx.fillText(title, 56, height - 28);
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(56, height - 18);
  ctx.lineTo(220, height - 18);
  ctx.stroke();
}
