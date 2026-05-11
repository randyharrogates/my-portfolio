/** @format */

import React, { useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import {
  useCanvasContent,
  drawChrome,
  drawLowerThird,
  useThrottledDraw,
  HOLOGRAM_THEME,
} from "./canvas-content.ts";
import { portfolioData } from "../../../data/portfolio.ts";
import type { CanvasContent } from "./canvas-content.ts";

interface AboutTimelineProps {
  onTextureReady: (tex: CanvasContent) => void;
}

const NOW_YEAR = new Date().getFullYear();

function drawTimeline(content: CanvasContent, t: number): void {
  const theme = HOLOGRAM_THEME;
  drawChrome(content, theme);

  const { ctx, height } = content;
  const { identity, roles, certifications, education } = portfolioData;

  ctx.font = "600 22px JetBrains Mono, ui-monospace, monospace";
  ctx.fillStyle = theme.fg;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`${identity.name} · ${identity.role}`, 56, 56);
  ctx.font = "400 16px JetBrains Mono, ui-monospace, monospace";
  ctx.fillStyle = theme.mute;
  ctx.fillText(
    `${identity.location} · ${identity.yoe} yoe · status: ${identity.status}`,
    56,
    88
  );

  const trackTop = 150;
  const trackBottom = height - 140;
  const trackX = 110;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(trackX, trackTop);
  ctx.lineTo(trackX, trackBottom);
  ctx.stroke();

  const minYear = Math.min(...roles.map((r) => r.startYear));
  const maxYear = Math.max(...roles.map((r) => r.endYear ?? NOW_YEAR));
  const span = Math.max(1, maxYear - minYear);

  roles.forEach((role, idx) => {
    const start = role.startYear;
    const end = role.endYear ?? NOW_YEAR;
    const y0 =
      trackTop + ((maxYear - end) / span) * (trackBottom - trackTop);
    const y1 =
      trackTop + ((maxYear - start) / span) * (trackBottom - trackTop);

    const pulse =
      0.85 + 0.15 * Math.sin(t * 1.5 + idx * 1.4);
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(trackX, y0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(trackX, y0);
    ctx.lineTo(trackX, y1);
    ctx.stroke();

    ctx.font = "500 18px JetBrains Mono, ui-monospace, monospace";
    ctx.fillStyle = theme.fg;
    ctx.fillText(role.title, trackX + 24, y0 - 2);
    ctx.font = "400 14px JetBrains Mono, ui-monospace, monospace";
    ctx.fillStyle = theme.mute;
    ctx.fillText(
      `${role.startYear} – ${role.endYear ?? "present"}`,
      trackX + 24,
      y0 + 22
    );
  });

  const ed = education[0];
  if (ed) {
    ctx.font = "400 14px JetBrains Mono, ui-monospace, monospace";
    ctx.fillStyle = theme.mute;
    ctx.fillText(`edu · ${ed.degree}`, 56, trackBottom + 24);
  }
  const certText = certifications.map((c) => c.short).join(" · ");
  if (certText) {
    ctx.fillText(`certs · ${certText}`, 56, trackBottom + 44);
  }

  drawLowerThird(content, theme, "origin chamber", "who · why · how");
  content.flush();
}

const AboutTimeline: React.FC<AboutTimelineProps> = ({ onTextureReady }) => {
  const content = useCanvasContent(1024, 640);
  useEffect(() => {
    onTextureReady(content);
  }, [content, onTextureReady]);
  const draw = useCallback(
    (t: number) => drawTimeline(content, t),
    [content]
  );
  const tick = useThrottledDraw(8, draw);
  useFrame(tick);
  return null;
};

export default AboutTimeline;
