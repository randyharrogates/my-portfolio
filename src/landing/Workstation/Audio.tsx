/** @format */

import React, { useEffect, useRef } from "react";

/**
 * Audio toolkit for the workstation. Generates synthesized audio at runtime via
 * the Web Audio API — no binary assets required, keeps the bundle lean.
 *
 * - Ambient hum: low-frequency drone (server fan tone)
 * - Click whoosh: filtered noise burst
 * - Hover tick: short keyboard tick
 */

interface AudioProps {
  muted: boolean;
  triggerWhoosh: number; // increment to play
  triggerTick: number;   // increment to play
}

const Audio: React.FC<AudioProps> = ({ muted, triggerWhoosh, triggerTick }) => {
  const ctxRef = useRef<AudioContext | null>(null);
  const humSourceRef = useRef<{ stop: () => void } | null>(null);
  const lastWhooshRef = useRef(0);
  const lastTickRef = useRef(0);

  // Lazily create AudioContext on first non-muted state.
  useEffect(() => {
    if (muted) return;
    if (!ctxRef.current) {
      const Ctor =
        (window as Window & {
          AudioContext?: typeof AudioContext;
          webkitAudioContext?: typeof AudioContext;
        }).AudioContext ||
        (window as Window & {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;
      if (!Ctor) return;
      ctxRef.current = new Ctor();
    }
  }, [muted]);

  // Manage ambient hum.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (muted) {
      humSourceRef.current?.stop();
      humSourceRef.current = null;
      return;
    }
    if (humSourceRef.current) return;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    osc1.type = "sawtooth";
    osc1.frequency.value = 60;
    osc2.type = "sine";
    osc2.frequency.value = 92;
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.025, ctx.currentTime + 1.2);
    filt.type = "lowpass";
    filt.frequency.value = 220;
    osc1.connect(filt);
    osc2.connect(filt);
    filt.connect(gain);
    gain.connect(ctx.destination);
    osc1.start();
    osc2.start();
    humSourceRef.current = {
      stop: () => {
        try {
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
          osc1.stop(ctx.currentTime + 0.55);
          osc2.stop(ctx.currentTime + 0.55);
        } catch {
          /* ignore */
        }
      },
    };
    return () => {
      humSourceRef.current?.stop();
      humSourceRef.current = null;
    };
  }, [muted]);

  // Whoosh on click
  useEffect(() => {
    if (muted) return;
    if (triggerWhoosh === lastWhooshRef.current) return;
    lastWhooshRef.current = triggerWhoosh;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const dur = 0.7;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = Math.exp(-i / (data.length * 0.4));
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = 720;
    filt.Q.value = 0.9;
    const gain = ctx.createGain();
    gain.gain.value = 0.18;
    src.connect(filt);
    filt.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }, [triggerWhoosh, muted]);

  // Hover tick
  useEffect(() => {
    if (muted) return;
    if (triggerTick === lastTickRef.current) return;
    lastTickRef.current = triggerTick;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const dur = 0.05;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = Math.exp(-i / (data.length * 0.2));
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = "highpass";
    filt.frequency.value = 1800;
    const gain = ctx.createGain();
    gain.gain.value = 0.06;
    src.connect(filt);
    filt.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }, [triggerTick, muted]);

  return null;
};

export default Audio;
