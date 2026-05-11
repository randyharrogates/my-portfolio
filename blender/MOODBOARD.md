# Moodboard — Hall of Zero Limits build

Reference: Dogstudio × Marvel × Sprite — Wakanda Forever "Hall of Zero Limits".
<https://wakanda-forever-master.dogstudio-dev.co/zerolimits>

This document is the source of truth for visual identity decisions. Lock these
before Phase 2 starts so geometry, materials, lighting, and post-processing all
pull in the same direction.

## Color palette

Working title: **"foundry teal & brushed brass"** — Wakandan-futuristic warmth
without literally cloning Marvel's palette.

| Role | Hex | Use |
|---|---|---|
| Primary deep | `#0a1a1d` | Wall recesses, dome interior, mood floor |
| Primary mid | `#16383c` | Background atmosphere, alcove shadows |
| Primary highlight | `#4dd0c4` | Hologram chroma, floor-glow rings, accent edges |
| Brass dark | `#6f4d24` | Column shafts (cool side) |
| Brass mid | `#b8862a` | Column highlights, frames, hardware |
| Brass bright | `#e8b45a` | Ornament rim light, capital edge, HUD chips |
| Tungsten warm | `#f4d8a8` | Practical lights inside alcoves, key fill |
| Hologram emerald | `#6dffb8` | Hologram-screen primary fill |
| Hologram cyan | `#4ddfff` | Hologram-screen secondary, scanline |
| Ink | `#f1efe8` | Body copy on holograms |
| Mute | `#a7b5b0` | Captions, lower-thirds |
| Paper | `#0c0b0a` | Page bg fallback / loading screens |

LUT direction: cool teal shadows, warm brass mids, slightly desaturated highlights.
Aim for the same shadow-to-highlight color shift the reference uses — cinematic
teal/orange split-tone without going Instagram-grade orange.

## Motif language

Wakanda's reference uses a **triangle tessellation** carried across architecture,
HUD, and ornament. Ours is the **hexagon-and-line tracery**: an angular,
circuit-board-derived pattern that echoes the existing terminal/code aesthetic.

Concretely:

- **Walls**: hex tessellation panels with line-art tracery in brass on dark
  teal substrate. Geometry-nodes-driven density variation (denser at floor and
  ceiling line, sparser at eye level).
- **Floor**: large hexagon inlay around the hub centre with concentric line
  glyphs radiating outward, picking up the floor-glow ring.
- **Columns**: shaft fluting in 6-fold radial symmetry (not 8 — keeps the hex
  motif coherent). Capital is the make-or-break ornament piece.
- **HUD overlay**: hexagonal frames around active monitor / alcove labels;
  lower-third labels in 1-character-tall slim brass strokes.
- **Hologram chrome**: thin hex frame around each hologram screen with corner
  brackets (think sci-fi targeting reticle, not 90s grunge).

## Type system

| Role | Family | Source |
|---|---|---|
| Body (everywhere) | JetBrains Mono | Already loaded in the site |
| Display / room labels | Orbitron 500/700 | Google Fonts (SIL OFL — free, CC-compatible) |
| Hologram numerals | JetBrains Mono tabular-nums | Built in |

Orbitron carries enough sci-fi character to match the reference's display face
without being one of the over-used "Bladerunner clone" geometric fonts. It's CC0
adjacent (SIL OFL 1.1, free commercial use).

Type sizing on holograms is **non-negotiable**: a hologram screen at 1.5m
distance must read clearly. Test in-engine at native viewport widths
(360 → 1920 → 3440) before locking content templates.

## UI element style

- **Frames**: hexagonal, single-stroke brass at 1px equivalent. No fills.
- **Tabs/chips**: corner-cut rectangles (one bevelled corner only) — echoes
  the reference's targeting-bracket vocabulary.
- **Buttons**: full-width hex frame + label center; hover state = inner glow
  pulse (teal), no fill change.
- **Cursor**: not customised. Browser default. Don't fight users on this.
- **Lower-third labels**: monospace, uppercase, letter-spacing 0.12em, mute
  color. Slight scanline overlay on top of hologram surfaces only.
- **Pointer affordance**: hovered alcove arch = subtle brass rim light + label
  fade-in over 200ms.

## Lighting direction

- **Key**: dome-skylight god rays from above, warm tungsten (`#f4d8a8`).
- **Fill**: bounce light from brass surfaces — get this from a Cycles bake, not
  a real-time fill light. Bake into KTX2 lightmaps.
- **Rim**: cool teal (`#4dd0c4`) from floor-glow rings — sets the silhouette
  separation on columns.
- **Practicals**: each alcove has 1-2 warm point lights (tungsten) hidden in
  pedestal bases or behind the hologram screen, providing intimate fill.
- **Volumetrics**: god rays from the dome only. Don't overdo it elsewhere —
  per-alcove volumetrics tank perf and clutter the silhouette.

## Atmosphere

- Particle motes (dust in shaft of light): 2-3k instances, slow drift, fade
  near camera.
- Floor-glow rings around hub centre: 3 concentric, slow phase offset.
- Depth haze: exponential fog tinted `#16383c`. Reads as "vast hall" from
  inside the hub, recedes when camera enters an alcove.
- Audio: ambient drone + occasional metallic shimmer (CC0 from freesound).
  Camera transitions whoosh; no narration.

## Reference shots to collect (TODO)

The plan calls for 15-20 reference screenshots with rationale. Drop them here
in `blender/refs/` (gitignored) and link them below with one-line takeaways:

- `refs/hozl-01-hub-wide.png` — establishes the "open architectural rotunda"
  read at 28-35mm equivalent FOV.
- `refs/hozl-02-column-detail.png` — the carved-capital ornament density we
  need to come within 80% of.
- `refs/hozl-03-floor-glow.png` — concentric ring lighting on the floor,
  shows ring spacing + falloff.
- `refs/hozl-04-hologram-screen.png` — chroma-isolation, scanline rolling,
  edge fresnel — calibration target for our Hologram shader.
- `refs/hozl-05-god-rays.png` — dome skylight volumetric — particle density
  + ray taper reference.
- `refs/hozl-06-alcove-arch.png` — how alcoves open onto the hub; the arch
  silhouette and rim-light treatment.
- … (continue to 15-20)

User: capture these from the reference site at full-screen resolution. Don't
commit them to git (copyright); they live locally for reference only.

## Open questions

- **Cursor / pointer feedback inside Hub** — keep browser default cursor or
  swap to a brass crosshair? Decide in Phase 3 when CameraDirector lands.
- **Mobile motif simplification** — the hex tracery is the first thing to
  cut on low-fidelity mode. Replace with flat color blocks? Decide in Phase 7.
- **Boot sequence length** — 5s reference fly is long. 3s feels right for
  return visitors; 6s OK on first visit. A/B in Phase 8.
