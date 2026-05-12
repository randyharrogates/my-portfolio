"""Phase 6 — Atmosphere mote-sprite + blue-noise textures (asset 6.3).

Generates two PNGs used by `src/landing/Hall/Atmosphere.tsx`:

- ``public/textures/hall/mote-sprite.png`` — 64×64 RGBA radial-gradient
  sprite mapped onto each pointsMaterial particle. Soft circular alpha
  falloff replaces the default square-pixel point and reads as
  glowing dust motes instead of "pixels".
- ``public/textures/hall/mote-noise.png`` — 256×256 single-channel
  blue-noise PNG used for per-particle disp / phase seeds in any future
  custom shader pass.

No Blender required — pure Python + Pillow + a fast void-and-cluster
blue-noise generator. Run::

    python3 blender/scripts/atmo/mote-noise.py
"""

from __future__ import annotations

import math
import random
import struct
import sys
from pathlib import Path

from PIL import Image  # type: ignore[import-not-found]

_REPO_ROOT = Path(__file__).resolve().parents[3]
TEXTURE_DIR = _REPO_ROOT / "public" / "textures" / "hall"

SPRITE_SIZE = 64
NOISE_SIZE = 256


def build_radial_sprite() -> Path:
    """Soft radial gradient — pure white RGB, alpha falls off with a
    cubic ease so the centre stays bright and the edges fade to 0
    without a hard rim. Used as the `map` on pointsMaterial."""
    img = Image.new("RGBA", (SPRITE_SIZE, SPRITE_SIZE), (0, 0, 0, 0))
    px = img.load()
    cx = cy = (SPRITE_SIZE - 1) / 2
    max_r = SPRITE_SIZE / 2 - 1
    for y in range(SPRITE_SIZE):
        for x in range(SPRITE_SIZE):
            dx = x - cx
            dy = y - cy
            r = math.sqrt(dx * dx + dy * dy)
            t = max(0.0, 1.0 - (r / max_r))
            # Cubic ease so centre stays solid, edges fade smoothly.
            a = int(round(255 * (t * t * (3 - 2 * t))))
            px[x, y] = (255, 245, 220, a)
    out = TEXTURE_DIR / "mote-sprite.png"
    img.save(out, "PNG", optimize=True)
    return out


def build_blue_noise() -> Path:
    """Cheap pseudo-blue-noise via repeated swap-rejection. Not a true
    void-and-cluster bake (would need 2048+ iters per pixel), but
    visually adequate for displacement seeds where high-frequency
    distribution matters more than absolute correctness."""
    rng = random.Random(20260512)
    n = NOISE_SIZE
    pixels = [rng.random() for _ in range(n * n)]
    # 30 swap passes; each pass: try swapping a pixel with a neighbour
    # if that improves the local energy (lowers correlation with adjacent
    # values).
    for _pass in range(30):
        for i in range(n * n):
            x = i % n
            y = i // n
            # local neighbour offset
            nx = (x + rng.choice([-2, -1, 1, 2])) % n
            ny = (y + rng.choice([-2, -1, 1, 2])) % n
            j = ny * n + nx
            # energy: sum of (this pixel - 3x3 mean) squared, lower is better.
            def local_energy(idx: int) -> float:
                px = idx % n
                py = idx // n
                acc = 0.0
                mean = 0.0
                cnt = 0
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        if dx == 0 and dy == 0:
                            continue
                        mean += pixels[((py + dy) % n) * n + ((px + dx) % n)]
                        cnt += 1
                mean /= cnt
                acc = (pixels[idx] - mean) ** 2
                return acc
            before = local_energy(i) + local_energy(j)
            pixels[i], pixels[j] = pixels[j], pixels[i]
            after = local_energy(i) + local_energy(j)
            if after >= before:
                # revert
                pixels[i], pixels[j] = pixels[j], pixels[i]

    img = Image.new("L", (n, n), 0)
    img.putdata([int(round(v * 255)) for v in pixels])
    out = TEXTURE_DIR / "mote-noise.png"
    img.save(out, "PNG", optimize=True)
    return out


def main() -> None:
    TEXTURE_DIR.mkdir(parents=True, exist_ok=True)
    sprite = build_radial_sprite()
    print(f"  sprite : {sprite.relative_to(_REPO_ROOT)}  ({sprite.stat().st_size} bytes)")
    noise = build_blue_noise()
    print(f"  noise  : {noise.relative_to(_REPO_ROOT)}  ({noise.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
