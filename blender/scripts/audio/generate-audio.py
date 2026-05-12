"""Phase 8 audio generation — ambient drone + 3 whooshes (parallel track).

Synthesises CC0-equivalent audio assets without freesound.org sourcing.
Outputs 16-bit PCM WAV at 44.1 kHz (loud-and-clear browser support; no
codec dependency). Three.js audio loader reads .wav natively.

Outputs:

- ``public/audio/hall/ambient-drone.wav`` — 30 s seamless loop, low-end
  heavy. Three sine partials (60, 80, 119 Hz, slightly inharmonic so the
  beating creates slow movement) + two filtered-noise pads at 220 Hz
  and 880 Hz center frequencies. Modulated by a slow LFO so volume
  breathes once per ~12 s. Crossfaded over the last 1.5 s so the loop
  point is inaudible.
- ``public/audio/hall/whoosh-1.wav`` / ``whoosh-2.wav`` / ``whoosh-3.wav``
  — 0.9–1.2 s each, bandpass-filtered noise with downward-sweeping
  centre frequency. Three variants alternated per camera fly so
  repeat-transitions don't hit identical whooshes.

Pure stdlib (math + random + wave + struct). Run::

    python3 blender/scripts/audio/generate-audio.py
"""

from __future__ import annotations

import math
import random
import struct
import sys
import wave
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[3]
AUDIO_DIR = _REPO_ROOT / "public" / "audio" / "hall"

SAMPLE_RATE = 44100


def _write_wav(filename: Path, samples: list[float]) -> None:
    """Write mono 16-bit PCM at 44.1 kHz. Soft-clip to [-1, 1] before
    quantising so any peaks above 0 dBFS don't wrap to silence."""
    data = bytearray()
    for s in samples:
        # Soft clip with tanh — gentle saturation past ±1.
        clipped = math.tanh(s)
        q = int(round(clipped * 32767))
        data.extend(struct.pack("<h", max(-32768, min(32767, q))))

    with wave.open(str(filename), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(bytes(data))


def _crossfade_loop(samples: list[float], fade_seconds: float) -> list[float]:
    """Crossfade the last `fade_seconds` of `samples` with the first
    `fade_seconds` so the loop point is inaudible. Returns a new list
    of the same length."""
    n = len(samples)
    fade_n = int(fade_seconds * SAMPLE_RATE)
    if fade_n * 2 > n:
        return samples
    out = list(samples)
    for i in range(fade_n):
        # Linear crossfade — equal-power isn't needed here because both
        # ends are low-amplitude drone.
        t = i / fade_n
        head = samples[i]
        tail = samples[n - fade_n + i]
        out[n - fade_n + i] = tail * (1 - t) + head * t
    return out[: n - fade_n]


def build_ambient_drone() -> Path:
    """30 s seamless ambient drone. Built as a sum of 3 sine partials +
    2 narrow noise bands, all modulated by a slow LFO. Crossfaded over
    the last 1.5 s so the file loops cleanly on `audio.loop = true`."""
    duration = 30.0
    total = int(duration * SAMPLE_RATE)

    rng = random.Random(20260512)
    # Initialise noise pads with simple low-passed white noise — store
    # 2 channels of state for the IIR low-pass we apply.
    pad_a_state = 0.0
    pad_b_state = 0.0

    samples: list[float] = []
    for i in range(total):
        t = i / SAMPLE_RATE
        # Three low-frequency sines slightly inharmonic so the partials
        # beat at ~1 Hz against each other (creates slow movement).
        s60 = math.sin(2 * math.pi * 60.0 * t)
        s80 = math.sin(2 * math.pi * 80.6 * t)
        s119 = math.sin(2 * math.pi * 119.3 * t)

        # Two narrow filtered-noise pads at 220 Hz and 880 Hz centres.
        # Use a state-variable approach — feed white noise through a
        # cheap one-pole LP filter modulated by the pad centre freq.
        white_a = rng.gauss(0, 1) * 0.6
        # Smooth narrow band by mixing with phase-locked sine.
        pad_a = 0.5 * (math.sin(2 * math.pi * 220.0 * t) * 0.8 + white_a * 0.2)
        pad_a_state = 0.92 * pad_a_state + 0.08 * pad_a
        white_b = rng.gauss(0, 1) * 0.3
        pad_b = 0.4 * (math.sin(2 * math.pi * 880.0 * t) * 0.7 + white_b * 0.3)
        pad_b_state = 0.96 * pad_b_state + 0.04 * pad_b

        # Slow LFO ~12 s period — modulates total volume between 0.55 and 1.0.
        lfo = 0.78 + 0.22 * math.sin(2 * math.pi * t / 12.0)

        mix = (
            0.45 * s60
            + 0.30 * s80
            + 0.22 * s119
            + 0.12 * pad_a_state
            + 0.05 * pad_b_state
        ) * lfo * 0.55
        samples.append(mix)

    looped = _crossfade_loop(samples, 1.5)
    out = AUDIO_DIR / "ambient-drone.wav"
    _write_wav(out, looped)
    return out


def build_whoosh(filename: str, seed: int, peak_hz: float, end_hz: float, duration: float, decay: float) -> Path:
    """Bandpass-filtered noise with downward-sweeping centre frequency.
    Generates the characteristic camera-fly whoosh."""
    rng = random.Random(seed)
    n = int(duration * SAMPLE_RATE)

    # State for one-pole bandpass approximation.
    samples: list[float] = []
    last = 0.0
    last2 = 0.0
    for i in range(n):
        t = i / SAMPLE_RATE
        # Centre freq sweeps peak_hz → end_hz over the duration.
        u = t / duration
        sweep = u * u  # ease-out
        fc = peak_hz + (end_hz - peak_hz) * sweep
        # Generate white noise sample.
        white = rng.gauss(0, 1)
        # Resonant bandpass: y[n] = 2*r*cos(w0)*y[n-1] - r^2*y[n-2] + (1 - r^2)*x[n]
        r = 0.985
        w0 = 2 * math.pi * fc / SAMPLE_RATE
        y = (
            2 * r * math.cos(w0) * last
            - r * r * last2
            + (1 - r * r) * white * 0.85
        )
        last2 = last
        last = y

        # Amplitude envelope: fast attack, exponential decay.
        attack = min(1.0, t / 0.07)
        env = attack * math.exp(-decay * t)
        samples.append(y * env * 0.65)

    out = AUDIO_DIR / filename
    _write_wav(out, samples)
    return out


def main() -> None:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    drone = build_ambient_drone()
    print(f"  drone   : {drone.relative_to(_REPO_ROOT)}  ({drone.stat().st_size} bytes)")

    # Three whoosh variants with distinct sweep + duration so each
    # transition sounds different.
    w1 = build_whoosh("whoosh-1.wav", seed=101, peak_hz=2200, end_hz=350,  duration=1.10, decay=2.2)
    print(f"  whoosh-1: {w1.relative_to(_REPO_ROOT)}  ({w1.stat().st_size} bytes)")
    w2 = build_whoosh("whoosh-2.wav", seed=202, peak_hz=1800, end_hz=280,  duration=0.95, decay=2.6)
    print(f"  whoosh-2: {w2.relative_to(_REPO_ROOT)}  ({w2.stat().st_size} bytes)")
    w3 = build_whoosh("whoosh-3.wav", seed=303, peak_hz=2600, end_hz=480,  duration=1.20, decay=2.0)
    print(f"  whoosh-3: {w3.relative_to(_REPO_ROOT)}  ({w3.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
