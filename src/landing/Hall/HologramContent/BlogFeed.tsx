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

interface BlogFeedProps {
  onTextureReady: (tex: CanvasContent) => void;
}

interface Post {
  date: string;
  title: string;
  blurb: string;
  readTime: string;
}

const POSTS: Post[] = [
  {
    date: "2026-05",
    title: "Building the Hall",
    blurb:
      "Notes from rebuilding the portfolio as a multi-room R3F + Blender-MCP experience.",
    readTime: "12 min",
  },
  {
    date: "2026-02",
    title: "Multi-agent underwriting in prod",
    blurb:
      "What I learned shipping a LangGraph + Anthropic credit-memo pipeline against real bank data.",
    readTime: "14 min",
  },
  {
    date: "2025-11",
    title: "Eval harnesses that actually help",
    blurb:
      "Why most LLM eval frameworks miss the point, and the pieces you actually need.",
    readTime: "9 min",
  },
];

function drawFeed(content: CanvasContent): void {
  const theme = HOLOGRAM_THEME;
  drawChrome(content, theme);
  const { ctx, width, height } = content;

  ctx.font = "500 16px JetBrains Mono, ui-monospace, monospace";
  ctx.fillStyle = theme.mute;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("LIBRARY · recent writing", 56, 56);

  let y = 110;
  POSTS.forEach((post) => {
    ctx.font = "400 13px JetBrains Mono, ui-monospace, monospace";
    ctx.fillStyle = theme.mute;
    ctx.fillText(`${post.date} · ${post.readTime}`, 56, y);

    ctx.font = "600 22px JetBrains Mono, ui-monospace, monospace";
    ctx.fillStyle = theme.fg;
    ctx.fillText(post.title, 56, y + 24);

    ctx.font = "400 15px JetBrains Mono, ui-monospace, monospace";
    ctx.fillStyle = theme.fg;
    const maxW = width - 112;
    const words = post.blurb.split(" ");
    let line = "";
    let ly = y + 60;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW) {
        ctx.fillText(line, 56, ly);
        line = w;
        ly += 22;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, 56, ly);
    y = ly + 38;

    ctx.strokeStyle = theme.hairline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(56, y - 16);
    ctx.lineTo(width - 56, y - 16);
    ctx.stroke();
  });

  ctx.font = "500 13px JetBrains Mono, ui-monospace, monospace";
  ctx.fillStyle = theme.mute;
  ctx.fillText("→ /blog for full feed", 56, height - 110);

  drawLowerThird(content, theme, "library", "ideas, written down");
  content.flush();
}

const BlogFeed: React.FC<BlogFeedProps> = ({ onTextureReady }) => {
  const content = useCanvasContent(1024, 640);
  useEffect(() => {
    onTextureReady(content);
  }, [content, onTextureReady]);
  const draw = useCallback(() => drawFeed(content), [content]);
  const tick = useThrottledDraw(2, draw);
  useFrame(tick);
  return null;
};

export default BlogFeed;
