#!/bin/bash
# Encode the rendered PNG sequence to a seamless-looping WebM VP9.
#
# Runs after `blender -b skills-waterfall-sim.blend -a` produces the PNG
# sequence at blender/renders/waterfall/0078.png .. 0149.png (72 frames).
#
# Output: public/models/hall/landmarks/waterfall-loop.webm (~2-3 MB target).
set -euo pipefail

FRAMES_DIR="$(dirname "$0")/renders/waterfall"
OUT="$(dirname "$0")/../public/models/hall/landmarks/waterfall-loop.webm"

# First-frame number is variable — the render starts at scene.frame_start.
FIRST=$(ls "$FRAMES_DIR"/*.png 2>/dev/null | head -1 | xargs basename | sed 's/\.png$//')
if [ -z "$FIRST" ]; then
  echo "No frames found in $FRAMES_DIR" >&2
  exit 1
fi
echo "First frame: $FIRST"

# Count frames
FRAME_COUNT=$(ls "$FRAMES_DIR"/*.png | wc -l | tr -d ' ')
echo "Encoding $FRAME_COUNT frames -> $OUT"

# VP9 encode with crossfade for seamless looping. The FLIP fluid is
# constantly changing (pool fills over time) so a hard cut at the loop
# point shows a jump. We blend the last ~12 frames (0.5s) into the
# first ~12 frames so the transition is invisible.
#
# Filter chain:
#   1. Two copies of the input (split).
#   2. Trim copy A: drop the first 12 frames (so the loop starts here).
#   3. Trim copy B: keep only the first 12 frames, then add to the END
#      of A — these are the frames we want to crossfade back from.
#   4. xfade with fade=12 frames over the seam.

ffmpeg -y \
  -framerate 24 \
  -start_number "$FIRST" \
  -i "$FRAMES_DIR/%04d.png" \
  -filter_complex "\
    [0:v]split=2[base][tail]; \
    [base]trim=start_frame=12,setpts=PTS-STARTPTS[main]; \
    [tail]trim=end_frame=12,setpts=PTS-STARTPTS[head]; \
    [main][head]xfade=transition=fade:duration=0.5:offset=2[v]" \
  -map "[v]" \
  -c:v libvpx-vp9 \
  -b:v 0 -crf 35 \
  -row-mt 1 -threads 4 \
  -pix_fmt yuv420p \
  -an \
  -movflags +faststart \
  "$OUT"

ls -lh "$OUT"
echo "Done."
