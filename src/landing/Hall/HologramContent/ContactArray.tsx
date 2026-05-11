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

interface ContactArrayProps {
  onTextureReady: (tex: CanvasContent) => void;
}

interface Channel {
  label: string;
  value: string;
  badge: string;
}

function drawArray(content: CanvasContent, t: number): void {
  const theme = HOLOGRAM_THEME;
  drawChrome(content, theme);
  const { ctx, width, height } = content;

  const { socials } = portfolioData;
  const channels: Channel[] = [
    { label: "email", value: socials.email, badge: "✉" },
    { label: "github", value: socials.github.replace("https://", ""), badge: "◉" },
    { label: "linkedin", value: socials.linkedin.replace("https://", ""), badge: "▣" },
  ];

  ctx.font = "500 16px JetBrains Mono, ui-monospace, monospace";
  ctx.fillStyle = theme.mute;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("COMMS ARRAY · 3 active channels", 56, 56);

  const cx = width / 2;
  const cy = height / 2 + 12;

  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 1;
  [80, 140, 200].forEach((r, i) => {
    ctx.globalAlpha = 0.25 - i * 0.06;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  const pulse = 0.85 + 0.15 * Math.sin(t * 1.4);
  ctx.fillStyle = theme.accent;
  ctx.globalAlpha = pulse;
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.font = "600 16px JetBrains Mono, ui-monospace, monospace";
  ctx.fillStyle = "#06090b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("RC", cx, cy);

  channels.forEach((ch, i) => {
    const angle = (i / channels.length) * Math.PI * 2 + t * 0.18;
    const r = 160;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;

    ctx.strokeStyle = "rgba(122, 255, 240, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "600 15px JetBrains Mono, ui-monospace, monospace";
    ctx.fillStyle = theme.fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(ch.label.toUpperCase(), x, y + 14);
    ctx.font = "400 12px JetBrains Mono, ui-monospace, monospace";
    ctx.fillStyle = theme.mute;
    ctx.fillText(ch.value, x, y + 32);
  });

  drawLowerThird(content, theme, "comms array", "how to reach me");
  content.flush();
}

const ContactArray: React.FC<ContactArrayProps> = ({ onTextureReady }) => {
  const content = useCanvasContent(1024, 640);
  useEffect(() => {
    onTextureReady(content);
  }, [content, onTextureReady]);
  const draw = useCallback((t: number) => drawArray(content, t), [content]);
  const tick = useThrottledDraw(20, draw);
  useFrame(tick);
  return null;
};

export default ContactArray;
