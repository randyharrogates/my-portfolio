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
import { portfolioData } from "../../../data/portfolio.ts";

interface ScrollingResumeProps {
  onTextureReady: (tex: CanvasContent) => void;
}

interface Line {
  kind: "h" | "p" | "tag" | "rule";
  text: string;
}

function buildLines(): Line[] {
  const { identity, roles, certifications, education, interests, aiTools } =
    portfolioData;
  const lines: Line[] = [];
  lines.push({ kind: "h", text: identity.name.toUpperCase() });
  lines.push({ kind: "p", text: `${identity.role} · ${identity.location}` });
  lines.push({ kind: "p", text: identity.belief });
  lines.push({ kind: "rule", text: "" });

  lines.push({ kind: "h", text: "EXPERIENCE" });
  roles.forEach((r) => {
    lines.push({
      kind: "tag",
      text: `${r.startYear}–${r.endYear ?? "present"} · ${r.title}`,
    });
  });
  lines.push({ kind: "rule", text: "" });

  lines.push({ kind: "h", text: "EDUCATION" });
  education.forEach((e) => lines.push({ kind: "tag", text: e.degree }));
  lines.push({ kind: "rule", text: "" });

  lines.push({ kind: "h", text: "CERTIFICATIONS" });
  certifications.forEach((c) =>
    lines.push({ kind: "tag", text: `${c.short} · ${c.full}` })
  );
  lines.push({ kind: "rule", text: "" });

  lines.push({ kind: "h", text: "FOCUS" });
  interests.forEach((i) => lines.push({ kind: "tag", text: i }));
  lines.push({ kind: "rule", text: "" });

  lines.push({ kind: "h", text: "AI TOOLS" });
  aiTools.forEach((a) => lines.push({ kind: "tag", text: a }));
  lines.push({ kind: "rule", text: "" });

  lines.push({ kind: "p", text: "→ download PDF at /resume" });
  return lines;
}

const LINES = buildLines();

function drawResume(content: CanvasContent, t: number): void {
  const theme = HOLOGRAM_THEME;
  drawChrome(content, theme);
  const { ctx, width, height } = content;

  const lineHeight = 30;
  const totalHeight = LINES.length * lineHeight;
  const viewportTop = 100;
  const viewportBottom = height - 110;
  const viewportHeight = viewportBottom - viewportTop;
  const scrollPeriod = 24;
  const scrollT = (t % scrollPeriod) / scrollPeriod;
  const scrollY = scrollT * (totalHeight + viewportHeight);
  const startY = viewportTop - scrollY + viewportHeight;

  ctx.save();
  ctx.beginPath();
  ctx.rect(36, viewportTop, width - 72, viewportHeight);
  ctx.clip();

  LINES.forEach((line, i) => {
    const y = startY + i * lineHeight;
    if (y < viewportTop - 30 || y > viewportBottom + 30) return;
    if (line.kind === "h") {
      ctx.font = "600 20px JetBrains Mono, ui-monospace, monospace";
      ctx.fillStyle = theme.accent;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(line.text, 56, y);
    } else if (line.kind === "tag") {
      ctx.font = "400 16px JetBrains Mono, ui-monospace, monospace";
      ctx.fillStyle = theme.fg;
      ctx.fillText(`· ${line.text}`, 76, y);
    } else if (line.kind === "p") {
      ctx.font = "400 15px JetBrains Mono, ui-monospace, monospace";
      ctx.fillStyle = theme.mute;
      ctx.fillText(line.text, 56, y);
    } else if (line.kind === "rule") {
      ctx.strokeStyle = theme.hairline;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(56, y + 8);
      ctx.lineTo(width - 56, y + 8);
      ctx.stroke();
    }
  });
  ctx.restore();

  const grad = ctx.createLinearGradient(0, viewportTop, 0, viewportTop + 40);
  grad.addColorStop(0, theme.bg);
  grad.addColorStop(1, "rgba(6, 9, 11, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(36, viewportTop, width - 72, 40);
  const grad2 = ctx.createLinearGradient(
    0,
    viewportBottom - 40,
    0,
    viewportBottom
  );
  grad2.addColorStop(0, "rgba(6, 9, 11, 0)");
  grad2.addColorStop(1, theme.bg);
  ctx.fillStyle = grad2;
  ctx.fillRect(36, viewportBottom - 40, width - 72, 40);

  drawLowerThird(content, theme, "credentials wall", "the receipts");
  content.flush();
}

const ScrollingResume: React.FC<ScrollingResumeProps> = ({
  onTextureReady,
}) => {
  const content = useCanvasContent(1024, 640);
  useEffect(() => {
    onTextureReady(content);
  }, [content, onTextureReady]);
  const draw = useCallback((t: number) => drawResume(content, t), [content]);
  const tick = useThrottledDraw(15, draw);
  useFrame(tick);
  return null;
};

export default ScrollingResume;
