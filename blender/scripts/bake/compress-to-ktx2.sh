#!/usr/bin/env bash
# Compress baked PNG lightmaps + AO maps to KTX2.
#
# - AO: single-channel grey-scale → UASTC R8 (small, lossless-feeling for low-frequency AO).
# - Lightmap: RGB irradiance → ETC1S RGBA (color, aggressive Basis Universal compression).
#
# Inputs:  public/textures/hall/baked/{ao,lightmap}/*.png
# Outputs: public/textures/hall/baked/{ao,lightmap}/*.ktx2  (alongside the PNGs)
#
# Requires `ktx` binary on PATH. Install KTX-Software 4.x:
#   curl -sL https://github.com/KhronosGroup/KTX-Software/releases/download/v4.4.2/KTX-Software-4.4.2-Darwin-arm64.pkg -o /tmp/ktx.pkg
#   (extract to ~/.local/ktx-software per setup notes — see blender/RENDER-LOG.md)

set -euo pipefail

export PATH="$HOME/.local/ktx-software/bin:$PATH"

if ! command -v ktx >/dev/null 2>&1; then
  echo "ktx binary not found on PATH. Install KTX-Software 4.x first." >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
AO_IN="$REPO_ROOT/blender/exports/baked/ao"
LM_IN="$REPO_ROOT/blender/exports/baked/lightmap"
AO_OUT="$REPO_ROOT/public/textures/hall/baked/ao"
LM_OUT="$REPO_ROOT/public/textures/hall/baked/lightmap"

if [ ! -d "$AO_IN" ] || [ ! -d "$LM_IN" ]; then
  echo "Baked PNG directories missing. Run hub-ao.py + hub-lightmap.py first." >&2
  exit 1
fi

mkdir -p "$AO_OUT" "$LM_OUT"

echo "Compressing AO maps (Basis LZ, linear)…"
for png in "$AO_IN"/*.png; do
  out="$AO_OUT/$(basename "${png%.png}").ktx2"
  ktx create \
    --encode basis-lz \
    --format R8G8B8_UNORM \
    --assign-tf linear \
    --assign-primaries bt709 \
    --clevel 5 \
    --qlevel 160 \
    --generate-mipmap \
    "$png" "$out" 2>&1 | grep -v "deprecated\|warning" || true
  size=$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out")
  echo "  $(basename "$png") → $(basename "$out")  $((size / 1024)) KB"
done

echo
echo "Compressing lightmaps (ETC1S, sRGB)…"
for png in "$LM_IN"/*.png; do
  out="$LM_OUT/$(basename "${png%.png}").ktx2"
  ktx create \
    --encode basis-lz \
    --format R8G8B8_SRGB \
    --assign-tf srgb \
    --assign-primaries bt709 \
    --clevel 4 \
    --qlevel 192 \
    --generate-mipmap \
    "$png" "$out" 2>&1 | grep -v "deprecated\|warning" || true
  size=$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out")
  echo "  $(basename "$png") → $(basename "$out")  $((size / 1024)) KB"
done

echo
ao_total=$(du -ck "$AO_OUT"/*.ktx2 | tail -1 | awk '{print $1}')
lm_total=$(du -ck "$LM_OUT"/*.ktx2 | tail -1 | awk '{print $1}')
echo "Total KTX2 weight — AO: ${ao_total} KB  |  Lightmap: ${lm_total} KB  |  Combined: $((ao_total + lm_total)) KB"
