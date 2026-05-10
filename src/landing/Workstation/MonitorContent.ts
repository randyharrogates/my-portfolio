/** @format */

import * as THREE from "three";
import type { SectionId } from "../sections.ts";

const SCREEN_BG = "#15110d"; // very dark warm panel — readable when bloom kicks in
const INK = "#f0e6dc";
const ACCENT = "#ff7a3c";
const BLUE = "#7cb6ff";
const GREEN = "#6cf09e";
const PURPLE = "#d6a0ff";
const MUTE = "#8a8178";

export interface CanvasTextureHandle {
  texture: THREE.CanvasTexture;
  draw: (t: number) => void;
  dispose: () => void;
}

const W = 512;
const H = 320;
const SMALL_W = 384;
const SMALL_H = 256;

function mkCanvas(w: number, h: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
} {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: false })!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, ctx, texture };
}

function clearBg(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = SCREEN_BG;
  ctx.fillRect(0, 0, w, h);
  // subtle vignette
  const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.6);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  w: number,
  prompt: string,
  cmd: string
) {
  ctx.font = "bold 13px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillStyle = BLUE;
  ctx.fillText(prompt, 12, 22);
  ctx.fillStyle = MUTE;
  ctx.fillText("$", 12 + ctx.measureText(prompt).width + 6, 22);
  ctx.fillStyle = INK;
  ctx.fillText(
    cmd,
    12 + ctx.measureText(prompt).width + 16,
    22
  );
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 30, w, 1);
}

/* --------------- about --------------- */
function aboutContent(): CanvasTextureHandle {
  const { ctx, texture } = mkCanvas(W, H);
  const lines = [
    { t: "name      ", v: "Randy Chan",                         c: ACCENT },
    { t: "role      ", v: "GenAI Solutions Engineer",           c: INK },
    { t: "yoe       ", v: "7 yrs",                              c: GREEN },
    { t: "location  ", v: "Singapore",                          c: BLUE },
    { t: "status    ", v: "● available for work",               c: GREEN },
    { t: "interests ", v: "Multi-Agent · RAG · Governance",     c: PURPLE },
  ];

  return {
    texture,
    draw(t: number) {
      clearBg(ctx, W, H);
      drawHeader(ctx, W, "~/portfolio", "whoami");
      ctx.font = "12px 'JetBrains Mono', ui-monospace, monospace";

      // Reveal lines progressively in a 6s loop
      const cycle = (t * 0.4) % 8;
      const showCount = Math.min(lines.length, Math.floor(cycle));
      for (let i = 0; i < showCount; i++) {
        const y = 56 + i * 22;
        ctx.fillStyle = MUTE;
        ctx.fillText("  " + lines[i].t, 16, y);
        ctx.fillStyle = lines[i].c;
        ctx.fillText(lines[i].v, 130, y);
      }
      // Blinking cursor on next pending line
      if (showCount < lines.length) {
        const y = 56 + showCount * 22;
        ctx.fillStyle = MUTE;
        ctx.fillText("  " + lines[showCount].t, 16, y);
        const visible = Math.floor(t * 2) % 2 === 0;
        if (visible) {
          ctx.fillStyle = ACCENT;
          ctx.fillRect(130, y - 11, 8, 14);
        }
      }
      // Footer ASCII portrait
      ctx.fillStyle = "#3a3532";
      const ascii = [
        "   _   _",
        "  ( o.o )",
        "   > ^ <",
      ];
      ctx.font = "11px 'JetBrains Mono', ui-monospace, monospace";
      ascii.forEach((line, i) => ctx.fillText(line, W - 110, 240 + i * 14));

      texture.needsUpdate = true;
    },
    dispose: () => texture.dispose(),
  };
}

/* --------------- projects --------------- */
function projectsContent(): CanvasTextureHandle {
  const { ctx, texture } = mkCanvas(W, H);
  const projects = [
    { name: "credit-memo",      tech: "LangGraph · Anthropic", c: ACCENT },
    { name: "kyb-pipeline",     tech: "LangChain · Azure",     c: BLUE },
    { name: "multi-agent-rag",  tech: "LangGraph · OpenAI",    c: PURPLE },
    { name: "fine-tuning",      tech: "PyTorch · OpenAI",      c: GREEN },
    { name: "speech-to-text",   tech: "OpenAI · FastAPI",      c: ACCENT },
    { name: "ecommerce",        tech: "FastAPI · Mongo",       c: BLUE },
  ];
  return {
    texture,
    draw(t: number) {
      clearBg(ctx, W, H);
      drawHeader(ctx, W, "~/projects", "ls -la");
      ctx.font = "12px 'JetBrains Mono', ui-monospace, monospace";
      const highlightIdx = Math.floor(t * 0.7) % projects.length;
      projects.forEach((p, i) => {
        const y = 60 + i * 26;
        ctx.fillStyle = i === highlightIdx ? "#231a13" : "transparent";
        if (i === highlightIdx) ctx.fillRect(8, y - 16, W - 16, 22);
        ctx.fillStyle = MUTE;
        ctx.fillText("drwxr-xr-x", 16, y);
        ctx.fillStyle = p.c;
        ctx.fillText(p.name, 110, y);
        ctx.fillStyle = "#5a5450";
        ctx.fillText("→ " + p.tech, 250, y);
      });
      texture.needsUpdate = true;
    },
    dispose: () => texture.dispose(),
  };
}

/* --------------- skills --------------- */
function skillsContent(): CanvasTextureHandle {
  const { ctx, texture } = mkCanvas(W, H);
  const skills = [
    { name: "LangGraph",  v: 5, c: PURPLE },
    { name: "LangChain",  v: 5, c: GREEN },
    { name: "OpenAI",     v: 5, c: ACCENT },
    { name: "Anthropic",  v: 5, c: BLUE },
    { name: "Python",     v: 5, c: GREEN },
    { name: "AWS",        v: 5, c: BLUE },
    { name: "Kubernetes", v: 4, c: ACCENT },
    { name: "PyTorch",    v: 4, c: PURPLE },
  ];
  return {
    texture,
    draw(t: number) {
      clearBg(ctx, W, H);
      drawHeader(ctx, W, "~/skills", "stack --show");
      ctx.font = "11px 'JetBrains Mono', ui-monospace, monospace";
      skills.forEach((s, i) => {
        const y = 56 + i * 30;
        ctx.fillStyle = INK;
        ctx.fillText(s.name, 16, y);
        // animated bar
        const breath = 0.92 + Math.sin(t * 1.2 + i * 0.5) * 0.08;
        const barFull = 280 * (s.v / 5);
        const barNow = barFull * breath;
        // track
        ctx.fillStyle = "#1a1714";
        ctx.fillRect(150, y - 9, 280, 11);
        // fill
        ctx.fillStyle = s.c;
        ctx.fillRect(150, y - 9, barNow, 11);
        ctx.fillStyle = "#5a5450";
        ctx.fillText(`${s.v}/5`, 440, y);
      });
      texture.needsUpdate = true;
    },
    dispose: () => texture.dispose(),
  };
}

/* --------------- blog --------------- */
function blogContent(): CanvasTextureHandle {
  const { ctx, texture } = mkCanvas(SMALL_W, SMALL_H);
  const posts = [
    "agent governance @ scale",
    "rag patterns for finserv",
    "multi-agent failure modes",
    "anthropic vs openai dx",
    "langgraph state machines",
  ];
  return {
    texture,
    draw(t: number) {
      clearBg(ctx, SMALL_W, SMALL_H);
      drawHeader(ctx, SMALL_W, "~/blog", "tail -f");
      ctx.font = "11px 'JetBrains Mono', ui-monospace, monospace";
      const offset = (t * 14) % (posts.length * 22);
      for (let i = 0; i < posts.length + 2; i++) {
        const idx = i % posts.length;
        const y = 50 + i * 22 - offset;
        if (y < 36 || y > SMALL_H - 8) continue;
        ctx.fillStyle = "#5a5450";
        ctx.fillText(`[${idx + 1}]`, 14, y);
        ctx.fillStyle = idx % 2 === 0 ? ACCENT : INK;
        ctx.fillText(posts[idx], 50, y);
      }
      texture.needsUpdate = true;
    },
    dispose: () => texture.dispose(),
  };
}

/* --------------- resume --------------- */
function resumeContent(): CanvasTextureHandle {
  const { ctx, texture } = mkCanvas(SMALL_W, SMALL_H);
  return {
    texture,
    draw(t: number) {
      clearBg(ctx, SMALL_W, SMALL_H);
      drawHeader(ctx, SMALL_W, "~/resume", "cat");
      ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
      const lines = [
        { c: ACCENT, t: "RANDY CHAN" },
        { c: MUTE,   t: "GenAI Solutions Engineer" },
        { c: "#23201d", t: "─".repeat(38) },
        { c: BLUE,   t: "Experience" },
        { c: INK,    t: "  GenAI SE         2023–pres" },
        { c: INK,    t: "  AI Eng (Health)  2021–2023" },
        { c: INK,    t: "  ML Eng (FinSvc)  2019–2021" },
        { c: BLUE,   t: "Education" },
        { c: INK,    t: "  B.Sc ICT" },
        { c: BLUE,   t: "Certs" },
        { c: GREEN,  t: "  CAIE · ECBA" },
      ];
      // gentle scroll if cycle says so
      const phase = Math.floor(t * 0.25) % 2;
      const yOff = phase === 0 ? 0 : 4;
      lines.forEach((l, i) => {
        const y = 50 + i * 16 + yOff;
        ctx.fillStyle = l.c;
        ctx.fillText(l.t, 14, y);
      });
      // blinking cursor at bottom
      if (Math.floor(t * 2) % 2 === 0) {
        ctx.fillStyle = ACCENT;
        ctx.fillRect(14, SMALL_H - 18, 7, 12);
      }
      texture.needsUpdate = true;
    },
    dispose: () => texture.dispose(),
  };
}

/* --------------- contact --------------- */
function contactContent(): CanvasTextureHandle {
  const { ctx, texture } = mkCanvas(SMALL_W, SMALL_H);
  const lines = [
    { l: "email   ",  v: "randychan_92",     c: ACCENT },
    { l: "github  ",  v: "randyharrogates",  c: INK },
    { l: "linkedin", v: "randychan112",     c: BLUE },
  ];
  return {
    texture,
    draw(t: number) {
      clearBg(ctx, SMALL_W, SMALL_H);
      drawHeader(ctx, SMALL_W, "~/contact", "send");
      ctx.font = "12px 'JetBrains Mono', ui-monospace, monospace";
      lines.forEach((l, i) => {
        const y = 70 + i * 28;
        ctx.fillStyle = MUTE;
        ctx.fillText(l.l, 18, y);
        ctx.fillStyle = l.c;
        ctx.fillText(l.v, 110, y);
      });
      ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
      ctx.fillStyle = "#3a3532";
      ctx.fillText("> awaiting input", 14, SMALL_H - 26);
      if (Math.floor(t * 2) % 2 === 0) {
        ctx.fillStyle = ACCENT;
        ctx.fillRect(110, SMALL_H - 38, 7, 12);
      }
      texture.needsUpdate = true;
    },
    dispose: () => texture.dispose(),
  };
}

const FACTORIES: Record<SectionId, () => CanvasTextureHandle> = {
  about: aboutContent,
  projects: projectsContent,
  skills: skillsContent,
  blog: blogContent,
  resume: resumeContent,
  contact: contactContent,
};

export function createMonitorContent(id: SectionId): CanvasTextureHandle {
  return FACTORIES[id]();
}

/** Matrix-rain effect used by the konami easter egg. Returns a draw fn that
 * mutates an existing canvas via the same texture pipeline. */
export function createMatrixRain(
  base: CanvasTextureHandle,
  width: number,
  height: number
): (t: number) => void {
  const cols = Math.floor(width / 12);
  const drops = new Array(cols).fill(0).map(() => Math.random() * height);
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*<>/\\|{}[]";
  return (_t: number) => {
    const ctx = base.texture.image.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;
    ctx.fillStyle = "rgba(12, 11, 10, 0.18)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = GREEN;
    ctx.font = "12px 'JetBrains Mono', ui-monospace, monospace";
    for (let i = 0; i < cols; i++) {
      const ch = chars[(Math.random() * chars.length) | 0];
      ctx.fillText(ch, i * 12, drops[i]);
      drops[i] += 14;
      if (drops[i] > height && Math.random() > 0.97) drops[i] = 0;
    }
    base.texture.needsUpdate = true;
  };
}
