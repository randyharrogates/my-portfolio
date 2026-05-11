# Blender pipeline — Hall of Zero Limits build

Operational notes for the Blender side of the Hall redesign. This directory is the
authoritative source for the 3D scene geometry, materials, and bake outputs that
feed `public/models/hall/*.glb` and `public/textures/hall/*.ktx2`.

## What lives here

```
blender/
  README.md          ← this file
  MOODBOARD.md       ← visual identity decisions (palette, motif, type, UI)
  RENDER-LOG.md      ← side-by-side reference vs build screenshots per phase
  mcp-setup/         ← Blender Lab MCP addon install + verification notes
  scripts/           ← reproducible bpy scripts (committed)
    common/          ← shared helpers (PBR loader, motif, export)
    hub/             ← central rotunda geometry
    alcoves/         ← per-section rooms
    bake/            ← Cycles light/AO bake → KTX2
  scenes/            ← .blend files (gitignored by default; see "Scene files" below)
  exports/           ← .glb outputs staged here before copying to /public/models/hall
  renders/           ← preview screenshots for review
```

## Required setup

1. **Blender 4.x** — Apple Silicon build from blender.org. Metal acceleration is on by default.
2. **Blender Lab MCP addon** — see `mcp-setup/README.md` for install steps and the
   socket/stdio config used by `.mcp.json` at the repo root.
3. **Blender Donut tutorial** — Blender Guru's free tutorial (~6 hrs).
   Covers navigation, materials, modifiers, basic shading. Pays off for the
   whole project. Do this before Phase 2.
4. **PolyHaven account** (free) — for downloading CC0 PBR materials and HDRIs.

## Day-to-day loop (Claude + MCP)

This is the iteration loop, repeated dozens of times per asset:

1. Open Blender, open the relevant `.blend` (or start fresh).
2. Click the Blender Lab MCP addon panel button to start listening.
3. Ask Claude (in this repo): *"build the dome ceiling — hex tessellation, 8-meter radius, brass material"*.
4. Claude executes `bpy` commands live via MCP. Geometry appears in your viewport.
5. Rotate, inspect, request changes: *"too dense, halve the hex count"*, *"thicker bevel"*.
6. Once approved, Claude writes the final script to `blender/scripts/<area>/<asset>.py` for reproducibility.
7. Headless re-run validates determinism:
   ```bash
   blender -b scenes/hub.blend -P scripts/hub/dome.py
   ```
8. Export via `bpy.ops.export_scene.gltf(...)` → `blender/exports/<asset>.glb` →
   copied to `public/models/hall/<asset>.glb`.
9. React side hot-reloads with the new geometry.

Expect 1–8 of these cycles per meaningful asset. Total project: hundreds.

## Conventions

- **Units**: meters. Set `bpy.context.scene.unit_settings.scale_length = 1.0`.
- **Scale**: hub diameter ≈ 6m; alcove width ≈ 4m; ceiling ≈ 5m.
- **Orientation**: +Y forward (toward viewer from hub centre), +Z up.
- **Mesh budgets** (per zone):
  - Hub: ≤ 80k tris after Draco
  - Each alcove: ≤ 40k tris after Draco
  - Hero ornament pieces: ≤ 8k tris each
- **Texture budgets**:
  - Floor / wall tileables: 2K UASTC
  - Hero materials (column brass): 4K UASTC
  - Background props: 1K ETC1S
- **Naming**: `zone-element-variant` lowercase-hyphen (e.g. `hub-column-base`, `alcove-projects-pedestal`).

## Export pipeline

Every commit to `blender/exports/*.glb` should be reproducible from the matching
script in `blender/scripts/*`. Treat the `.glb` as build output, but commit it
anyway (Draco-compressed, usually <2MB each) so the React side doesn't need
Blender on every developer machine.

Draco compression is set in `scripts/common/export.py`. Default level 7.
KTX2 textures are produced separately by `scripts/bake/*` and pipelined through
`toktx` / `gltf-transform`.

## Scene files (`.blend`)

`.blend` files are gitignored by default. The reproducibility contract is:

> Any `.blend` should be regeneratable by running `blender -b -P scripts/<zone>/build.py`.

If a scene becomes too laborious to script (rare — only for art-direction-heavy
pieces), promote that specific `.blend` to git-tracked by removing it from
`.gitignore` and noting the decision in this README.

## Asset licensing

All third-party assets must be CC0 or compatible. Sources used:

- **PolyHaven** — HDRIs, PBR materials (CC0)
- **Sketchfab** — only CC0-licensed models (filter is required)
- **freesound.org** — CC0 or CC-BY audio loops (CC-BY requires credit in `public/audio/hall/CREDITS.md`)
- **Quaternius / Kenney** — CC0 prop kits if needed for set dressing

If we unlock a paid asset budget at the Phase 2 decision point, sources will be
documented here with license terms.

## Phase 2 decision point

After the hub prototype is rendered, screenshot it next to the Hall of Zero Limits
reference and score honestly (1–10) on:

- Ornament density
- Material realism
- Atmosphere
- Ambition

If ornament density < 6/10, the realistic path forward is a $200–$500 asset
budget (KitBash3D + 5–10 Sketchfab heroes). Otherwise continue the $0 path.
The scorecard is logged in `RENDER-LOG.md`.
