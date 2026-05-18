/** @format */

import React, { useEffect, useRef } from "react";
import type { HallTargetId } from "../sections.ts";

interface HallAudioProps {
  muted: boolean;
  /** Triggered when the camera starts flying to a new target. */
  transitionEpoch: number;
  /** The target the camera is now resting on or flying toward. */
  active: HallTargetId;
}

/** Studio-Ghibli-style procedural piano ambient for the Hall.
 *
 *  No external samples — everything is synthesised through the Web Audio
 *  graph so there is zero bundle cost + zero licensing risk:
 *
 *  - **Warm pad** — two soft detuned triangle voices an octave below the
 *    chord roots, heavily low-passed. Replaces the old sawtooth drone
 *    (which read as dark/synthwave, not Ghibli).
 *  - **Piano chord loop** — a slow 4-chord progression (Cmaj9 · Gmaj ·
 *    Am7 · Fmaj7) arpeggiated note-by-note every ~9 s. Each note is a
 *    3-partial sine stack with a hammer-strike envelope (fast attack,
 *    long exponential decay) + a mellow low-pass, so it reads as a soft
 *    felt piano rather than a pure tone.
 *  - **Transition swell** — a gentle airy filter swell on camera moves
 *    (replaces the harsh band-passed noise whoosh).
 *  - **Per-landmark accent** — one quiet piano triad on arrival, rooted
 *    on a pleasant note per section.
 *
 *  The progression is intentionally calm + major-key — a lullaby mood
 *  that suits the floating-island wonder of the archipelago. Swapping
 *  in a real licensed track later only means replacing the chord loop;
 *  the hook shape + props stay identical.
 */

/** Piano-ish single note: 3 sine partials with a hammer-strike envelope.
 *  `velocity` 0..1 scales loudness; notes self-dispose when they finish. */
function playPianoNote(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  startTime: number,
  velocity: number,
  decay = 3.2
): void {
  // Partial structure — fundamental loudest, upper partials quieter +
  // slightly inharmonic for a warm, slightly-detuned felt-piano colour.
  const partials: Array<{ mul: number; gain: number }> = [
    { mul: 1.0, gain: 1.0 },
    { mul: 2.004, gain: 0.34 },
    { mul: 3.01, gain: 0.12 },
  ];
  const lpf = ctx.createBiquadFilter();
  lpf.type = "lowpass";
  lpf.frequency.value = 3200;
  lpf.Q.value = 0.4;

  const env = ctx.createGain();
  const peak = 0.16 * velocity;
  env.gain.setValueAtTime(0.0001, startTime);
  env.gain.linearRampToValueAtTime(peak, startTime + 0.014);
  env.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);

  lpf.connect(env);
  env.connect(dest);

  const endTime = startTime + decay + 0.05;
  for (const p of partials) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq * p.mul;
    const pg = ctx.createGain();
    pg.gain.value = p.gain;
    osc.connect(pg);
    pg.connect(lpf);
    osc.start(startTime);
    osc.stop(endTime);
    osc.onended = () => {
      try {
        osc.disconnect();
        pg.disconnect();
      } catch {
        /* ignore double-disconnect */
      }
    };
  }
  // Disconnect the shared filter/env once the note has fully decayed.
  window.setTimeout(() => {
    try {
      lpf.disconnect();
      env.disconnect();
    } catch {
      /* ignore */
    }
  }, (endTime - ctx.currentTime + 0.2) * 1000);
}

// Slow 4-chord progression — arpeggio note lists low→high (Hz).
// Cmaj9 · Gmaj · Am7 · Fmaj7 — a calm I-ish major-key loop.
const CHORD_PROGRESSION: number[][] = [
  [130.81, 196.0, 329.63, 392.0, 587.33], // Cmaj9
  [98.0, 146.83, 246.94, 293.66, 392.0], // Gmaj
  [110.0, 164.81, 196.0, 261.63, 329.63], // Am7
  [87.31, 130.81, 220.0, 261.63, 329.63], // Fmaj7
];
const CHORD_INTERVAL_S = 9.0; // seconds between chords
const ARP_STEP_S = 0.32; // arpeggio note spacing

// Per-landmark arrival accent — a gentle major triad rooted per section.
const TARGET_ACCENT: Record<HallTargetId, number[]> = {
  hub: [261.63, 329.63, 392.0], // C major
  about: [293.66, 369.99, 440.0], // D major
  projects: [329.63, 415.3, 493.88], // E major
  skills: [349.23, 440.0, 523.25], // F major
  blog: [392.0, 493.88, 587.33], // G major
  resume: [440.0, 554.37, 659.25], // A major
  contact: [493.88, 622.25, 739.99], // B major
};

const HallAudio: React.FC<HallAudioProps> = ({
  muted,
  transitionEpoch,
  active,
}) => {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const padStopRef = useRef<(() => void) | null>(null);
  const chordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chordIdxRef = useRef(0);

  useEffect(() => {
    if (muted) {
      padStopRef.current?.();
      padStopRef.current = null;
      if (chordTimerRef.current) {
        clearInterval(chordTimerRef.current);
        chordTimerRef.current = null;
      }
      ctxRef.current?.suspend().catch(() => {});
      return;
    }

    // Lazily construct the AudioContext on first un-mute. Most browsers
    // require a user gesture before resume() works; the un-mute click counts.
    if (!ctxRef.current) {
      try {
        const Ctx =
          (window.AudioContext as typeof AudioContext) ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        ctxRef.current = new Ctx();
        const master = ctxRef.current.createGain();
        master.gain.value = 0.0;
        master.connect(ctxRef.current.destination);
        masterRef.current = master;
      } catch {
        return;
      }
    }
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    ctx.resume().catch(() => {});

    // Soft fade-in.
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.13, now + 2.2);

    // Warm pad — two soft detuned triangle voices, heavily low-passed.
    if (!padStopRef.current) {
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      o1.type = "triangle";
      o2.type = "triangle";
      o1.frequency.value = 65.41; // C2
      o2.frequency.value = 98.0 * 1.003; // G2, slightly detuned
      const lpf = ctx.createBiquadFilter();
      lpf.type = "lowpass";
      lpf.frequency.value = 360;
      lpf.Q.value = 0.5;
      const g = ctx.createGain();
      g.gain.value = 0.05;
      o1.connect(lpf);
      o2.connect(lpf);
      lpf.connect(g);
      g.connect(master);
      o1.start();
      o2.start();
      padStopRef.current = () => {
        try {
          o1.stop();
          o2.stop();
          o1.disconnect();
          o2.disconnect();
          lpf.disconnect();
          g.disconnect();
        } catch {
          /* ignore stop-after-disconnect */
        }
      };
    }

    // Piano chord loop — schedule one arpeggiated chord per interval.
    if (!chordTimerRef.current) {
      const fireChord = (): void => {
        const c = ctxRef.current;
        const m = masterRef.current;
        if (!c || !m) return;
        const chord = CHORD_PROGRESSION[chordIdxRef.current];
        chordIdxRef.current =
          (chordIdxRef.current + 1) % CHORD_PROGRESSION.length;
        const base = c.currentTime + 0.1;
        chord.forEach((freq, i) => {
          // Lower (earlier) notes ring a touch louder + longer.
          const vel = 0.9 - i * 0.1;
          playPianoNote(c, m, freq, base + i * ARP_STEP_S, vel, 3.6 - i * 0.25);
        });
      };
      // Play one immediately, then loop.
      fireChord();
      chordTimerRef.current = setInterval(fireChord, CHORD_INTERVAL_S * 1000);
    }

    return () => {
      // Don't tear down on every re-render; only when explicitly muted.
    };
  }, [muted]);

  // Transition swell — a soft airy filter swell on camera moves.
  useEffect(() => {
    if (muted) return;
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    if (transitionEpoch <= 0) return;

    const now = ctx.currentTime;
    // Filtered noise, but gentle: low gain, slow soft swell, dark cutoff.
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 1.6, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.25;
    }
    noise.buffer = buf;
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.setValueAtTime(300, now);
    lpf.frequency.linearRampToValueAtTime(900, now + 0.7);
    lpf.frequency.linearRampToValueAtTime(320, now + 1.5);
    lpf.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.05, now + 0.5);
    g.gain.linearRampToValueAtTime(0, now + 1.5);
    noise.connect(lpf);
    lpf.connect(g);
    g.connect(master);
    noise.start();
    noise.stop(now + 1.6);
    noise.onended = () => {
      try {
        noise.disconnect();
        lpf.disconnect();
        g.disconnect();
      } catch {
        /* ignore */
      }
    };
  }, [transitionEpoch, muted]);

  // Per-landmark arrival accent — a quiet piano triad rooted per section.
  useEffect(() => {
    if (muted) return;
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    const triad = TARGET_ACCENT[active] ?? TARGET_ACCENT.hub;
    const start = ctx.currentTime + 0.7;
    triad.forEach((freq, i) => {
      playPianoNote(ctx, master, freq, start + i * 0.12, 0.55, 2.6);
    });
  }, [active, muted]);

  useEffect(() => {
    return () => {
      padStopRef.current?.();
      if (chordTimerRef.current) clearInterval(chordTimerRef.current);
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  return null;
};

export default HallAudio;
