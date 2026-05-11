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

/** Web Audio synth layer for the Hall — no external samples (yet).
 *
 *  Three layers:
 *  - Ambient drone (two detuned saws + lowpass; perpetual)
 *  - Transition whoosh (filter sweep) triggered on camera target change
 *  - Per-target gentle harmonic accent (one shimmer chord per alcove)
 *
 *  Once we license CC0 ambient stems from freesound.org, this component
 *  switches to mixing those samples via `AudioBufferSourceNode`. The
 *  hook-shape stays the same so the swap is internal.
 */
const HallAudio: React.FC<HallAudioProps> = ({
  muted,
  transitionEpoch,
  active,
}) => {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const droneStopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (muted) {
      droneStopRef.current?.();
      droneStopRef.current = null;
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

    // Soft fade-in
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.08, now + 1.8);

    // Mount drone if not running
    if (!droneStopRef.current) {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = "sawtooth";
      osc2.type = "sawtooth";
      osc1.frequency.value = 55;
      osc2.frequency.value = 55 * 1.005;
      const lpf = ctx.createBiquadFilter();
      lpf.type = "lowpass";
      lpf.frequency.value = 320;
      lpf.Q.value = 0.6;
      const gain = ctx.createGain();
      gain.gain.value = 0.18;
      osc1.connect(lpf);
      osc2.connect(lpf);
      lpf.connect(gain);
      gain.connect(master);
      osc1.start();
      osc2.start();
      droneStopRef.current = () => {
        try {
          osc1.stop();
          osc2.stop();
          osc1.disconnect();
          osc2.disconnect();
          lpf.disconnect();
          gain.disconnect();
        } catch {
          /* ignore stop-after-disconnect */
        }
      };
    }

    return () => {
      // Don't tear down on every re-render; only when explicitly muted.
    };
  }, [muted]);

  // Transition whoosh — re-triggers whenever transitionEpoch changes.
  useEffect(() => {
    if (muted) return;
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    if (transitionEpoch <= 0) return;

    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }
    noise.buffer = buf;
    const bpf = ctx.createBiquadFilter();
    bpf.type = "bandpass";
    bpf.Q.value = 1.2;
    bpf.frequency.setValueAtTime(180, now);
    bpf.frequency.exponentialRampToValueAtTime(1800, now + 0.85);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.18, now + 0.12);
    g.gain.linearRampToValueAtTime(0, now + 1.1);
    noise.connect(bpf);
    bpf.connect(g);
    g.connect(master);
    noise.start();
    noise.stop(now + 1.2);
  }, [transitionEpoch, muted]);

  // Per-target shimmer accent on settle.
  useEffect(() => {
    if (muted) return;
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    const root: Record<HallTargetId, number> = {
      hub: 110,
      about: 138.59,
      projects: 146.83,
      skills: 164.81,
      blog: 174.61,
      resume: 196.0,
      contact: 220.0,
    };
    const freq = root[active] ?? 110;
    const now = ctx.currentTime + 0.6;
    [1, 2, 3].forEach((mul, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = freq * mul;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now + i * 0.05);
      g.gain.linearRampToValueAtTime(0.04, now + i * 0.05 + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 1.0);
      o.connect(g);
      g.connect(master);
      o.start(now + i * 0.05);
      o.stop(now + i * 0.05 + 1.1);
    });
  }, [active, muted]);

  useEffect(() => {
    return () => {
      droneStopRef.current?.();
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  return null;
};

export default HallAudio;
