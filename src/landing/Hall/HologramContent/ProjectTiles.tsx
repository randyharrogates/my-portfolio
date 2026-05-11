/** @format */

import React, { useCallback, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import {
  useCanvasContent,
  drawChrome,
  drawLowerThird,
  useThrottledDraw,
  HOLOGRAM_THEME,
} from "./canvas-content.ts";
import type { CanvasContent } from "./canvas-content.ts";

interface ProjectTilesProps {
  onTextureReady: (tex: CanvasContent) => void;
}

interface Tile {
  id: string;
  title: string;
  blurb: string;
  stack: string[];
  route: string;
}

const TILES: Tile[] = [
  {
    id: "credit-memo",
    title: "Credit Memo · multi-agent underwriting",
    blurb:
      "LangGraph + Anthropic + Postgres pipeline that drafts commercial-credit memos from raw deal docs.",
    stack: ["LangGraph", "Anthropic", "Azure", "Postgres", "Redis"],
    route: "/projects/credit-memo",
  },
  {
    id: "kyb",
    title: "KYB · agentic onboarding",
    blurb:
      "Multi-agent KYB stack pulling registries, sanctions screening, structured doc verification.",
    stack: ["LangChain", "OpenAI", "Azure", "Weaviate", "FastAPI"],
    route: "/projects/kyb-pipeline",
  },
  {
    id: "fine-tuning",
    title: "Fine-tuning · domain LLMs",
    blurb:
      "PyTorch + OpenAI fine-tuning loops; eval harness, data-curation pipelines, rollout strategy.",
    stack: ["PyTorch", "OpenAI", "Python"],
    route: "/projects/fine-tuning",
  },
];

function drawTiles(content: CanvasContent, t: number): void {
  const theme = HOLOGRAM_THEME;
  drawChrome(content, theme);
  const { ctx, width, height } = content;

  const period = 4.5;
  const idx = Math.floor(t / period) % TILES.length;
  const localT = (t % period) / period;
  const tile = TILES[idx];

  ctx.font = "500 16px JetBrains Mono, ui-monospace, monospace";
  ctx.fillStyle = theme.mute;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`PROJECT ${String(idx + 1).padStart(2, "0")} / ${TILES.length}`, 56, 56);

  const pulse = 0.8 + 0.2 * Math.sin(t * 1.6);
  TILES.forEach((_, i) => {
    const x = 56 + i * 28;
    ctx.fillStyle =
      i === idx ? theme.accent : "rgba(122, 255, 240, 0.25)";
    ctx.globalAlpha = i === idx ? pulse : 1;
    ctx.beginPath();
    ctx.arc(x + 6, 92, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  ctx.font = "600 30px JetBrains Mono, ui-monospace, monospace";
  ctx.fillStyle = theme.fg;
  ctx.fillText(tile.title, 56, 130);

  ctx.font = "400 18px JetBrains Mono, ui-monospace, monospace";
  ctx.fillStyle = theme.fg;
  const words = tile.blurb.split(" ");
  let line = "";
  let y = 180;
  const maxW = width - 112;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line, 56, y);
      line = w;
      y += 28;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, 56, y);
  y += 40;

  ctx.font = "500 14px JetBrains Mono, ui-monospace, monospace";
  let chipX = 56;
  for (const s of tile.stack) {
    const w = ctx.measureText(s).width + 24;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(chipX, y, w, 28);
    ctx.fillStyle = theme.fg;
    ctx.fillText(s, chipX + 12, y + 7);
    chipX += w + 12;
    if (chipX > width - 200) break;
  }

  const progressY = height - 110;
  ctx.strokeStyle = "rgba(122, 255, 240, 0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(56, progressY);
  ctx.lineTo(width - 56, progressY);
  ctx.stroke();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(56, progressY);
  ctx.lineTo(56 + (width - 112) * localT, progressY);
  ctx.stroke();

  drawLowerThird(content, theme, "case-study gallery", "what i've shipped");
  content.flush();
}

const ProjectTiles: React.FC<ProjectTilesProps> = ({ onTextureReady }) => {
  const content = useCanvasContent(1024, 640);
  useEffect(() => {
    onTextureReady(content);
  }, [content, onTextureReady]);
  const draw = useCallback((t: number) => drawTiles(content, t), [content]);
  const tick = useThrottledDraw(12, draw);
  useFrame(tick);
  return null;
};

export default ProjectTiles;
