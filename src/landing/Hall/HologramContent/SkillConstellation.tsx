/** @format */

import React, { useCallback, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  useCanvasContent,
  drawChrome,
  drawLowerThird,
  useThrottledDraw,
  HOLOGRAM_THEME,
} from "./canvas-content.ts";
import type { CanvasContent } from "./canvas-content.ts";
import { portfolioData, deterministicHash } from "../../../data/portfolio.ts";

interface SkillConstellationProps {
  onTextureReady: (tex: CanvasContent) => void;
}

interface Node {
  id: string;
  name: string;
  proficiency: number;
  x: number;
  y: number;
}

function layoutNodes(width: number, height: number): Node[] {
  const stack = portfolioData.techStack;
  const cx = width / 2;
  const cy = height / 2 + 8;
  const radius = Math.min(width, height) * 0.34;
  return stack.map((item, i) => {
    const h = deterministicHash(item.id);
    const angle = (i / stack.length) * Math.PI * 2 + (h % 100) / 4000;
    const r = radius * (0.55 + (item.proficiency / 5) * 0.45);
    return {
      id: item.id,
      name: item.name,
      proficiency: item.proficiency,
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    };
  });
}

function drawConstellation(
  content: CanvasContent,
  nodes: Node[],
  t: number
): void {
  const theme = HOLOGRAM_THEME;
  drawChrome(content, theme);
  const { ctx, width } = content;

  ctx.font = "500 16px JetBrains Mono, ui-monospace, monospace";
  ctx.fillStyle = theme.mute;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("TOOL ARMORY · 20 nodes", 56, 56);

  const idx = new Map(nodes.map((n) => [n.id, n]));
  ctx.strokeStyle = "rgba(122, 255, 240, 0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  portfolioData.techEdges.forEach((edge) => {
    const a = idx.get(edge.a);
    const b = idx.get(edge.b);
    if (!a || !b) return;
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  });
  ctx.stroke();

  nodes.forEach((n, i) => {
    const pulse =
      0.7 + 0.3 * Math.sin(t * 1.4 + i * 0.6) * (n.proficiency / 5);
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha = 0.55 + pulse * 0.3;
    ctx.beginPath();
    ctx.arc(n.x, n.y, 4 + n.proficiency, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.font = "500 13px JetBrains Mono, ui-monospace, monospace";
    ctx.fillStyle = theme.fg;
    ctx.textAlign = n.x > width / 2 ? "left" : "right";
    const offset = n.x > width / 2 ? 10 : -10;
    ctx.fillText(n.name, n.x + offset, n.y + 4);
  });

  drawLowerThird(content, theme, "tool armory", "the stack");
  content.flush();
}

const SkillConstellation: React.FC<SkillConstellationProps> = ({
  onTextureReady,
}) => {
  const content = useCanvasContent(1024, 640);
  const nodes = useMemo(
    () => layoutNodes(content.width, content.height),
    [content.width, content.height]
  );
  useEffect(() => {
    onTextureReady(content);
  }, [content, onTextureReady]);
  const draw = useCallback(
    (t: number) => drawConstellation(content, nodes, t),
    [content, nodes]
  );
  const tick = useThrottledDraw(10, draw);
  useFrame(tick);
  return null;
};

export default SkillConstellation;
