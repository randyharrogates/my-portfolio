/** @format */

import React, { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import {
  abs,
  cos,
  float,
  floor,
  fract,
  mix,
  normalView,
  oneMinus,
  positionViewDirection,
  pow,
  sin,
  smoothstep,
  timerLocal,
  uv,
  vec3,
} from "three/tsl";
import { MeshStandardNodeMaterial } from "three/webgpu";

interface WaterfallTSLProps {
  /** World position where the waterfall's BASE sits. */
  position: [number, number, number];
}

const MODEL_PATH = `${process.env.PUBLIC_URL}/models/hall/waterfall-tsl.glb`;
useGLTF.preload(MODEL_PATH);

/** TSL-shaded waterfall — high-poly curved sheet authored in Blender
 *  (~5k verts, 4×36m). Replaces the runtime cylinder + the
 *  WaterfallVideo billboard. Material override happens in useMemo so
 *  WebGPU sees the new TSL material on first render, not the imported
 *  Principled-BSDF default. v1 uses procedural flow; v2 will sample a
 *  FLIP-baked flow texture for real fluid dynamics. */
const WaterfallTSL: React.FC<WaterfallTSLProps> = ({ position }) => {
  const gltf = useGLTF(MODEL_PATH) as unknown as { scene: THREE.Group };
  // Clone so HMR / re-renders don't see our previously-mutated material
  // (same pattern as UpperIsland.tsx).
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  // Build the TSL material + apply to all meshes BEFORE render — doing
  // this in useEffect causes WebGPU to compile the original GLB material
  // first, which (because it's a Principled BSDF with no UV-driven
  // texture inputs) lacks the 'uv' attribute binding and crashes the
  // pipeline. Doing it synchronously in useMemo ensures the first render
  // already has the TSL material.
  //
  // === AAA WATER STACK (locked 2026-05-14) ===
  // Per CLAUDE.md / feedback_hall_water_tech.md the goal is Witcher 2-tier
  // photoreal water within the WebGPU browser ceiling. Stack components
  // implemented here:
  //   1. Multi-layered scrolling normal noise (4 octaves)
  //   2. Procedural flow-direction perturbation (no FLIP bake yet)
  //   3. Multi-stream silhouette: 3 vertical bands of slightly-offset flow
  //   4. Foam mask from procedural cells, scrolling with the water
  //   5. Intense splash-zone foam at the base of the fall
  //   6. Fresnel rim brightening (edges of silhouette glow brighter)
  //   7. Beckmann-style specular highlight along flow streaks
  //   8. Depth-based opacity so the column is denser at the bottom
  // The full stack also includes external assets we add via siblings in
  // Scene.tsx: WaterfallSpray (particles) + WaterfallMist (planar mist).
  useMemo(() => {
    const mat = new MeshStandardNodeMaterial({
      color: new THREE.Color(0x6fc0ff),
      roughness: 0.06,
      metalness: 0.0,
      side: THREE.DoubleSide,
      transparent: true,
    });

    const t = timerLocal();
    const baseUv = uv();
    const PI2 = Math.PI * 2;

    // === STREAM SPLIT — 3 vertical bands across the waterfall width
    // Each band has its own time offset + scroll variation so the streams
    // don't all pulse in sync. We use floor() on U×3 to bucket pixels into
    // streams [0, 1, 2] and derive a per-stream hash for variation.
    const streamIdx = floor(baseUv.x.mul(3.0));  // 0, 1, or 2
    const streamLocalU = fract(baseUv.x.mul(3.0));  // 0..1 within stream
    const streamSpeed = streamIdx.mul(0.27).add(1.0);  // 1.0, 1.27, 1.54
    const streamPhase = streamIdx.mul(1.7);  // de-sync offset

    // === OCTAVE 1 — large slabs of slow surface variation (1-2m scale) ===
    const v1 = baseUv.y.mul(2.5).add(t.mul(0.9).mul(streamSpeed)).add(streamPhase);
    const u1 = baseUv.x.mul(1.8);
    const oct1 = sin(v1.mul(PI2)).mul(cos(u1.mul(PI2).add(t.mul(0.5))));

    // === OCTAVE 2 — medium ripples (0.3-0.5m scale) ===
    const v2 = baseUv.y.mul(6.0).add(t.mul(1.6).mul(streamSpeed)).add(streamPhase.mul(0.5));
    const u2 = baseUv.x.mul(5.0);
    const oct2 = sin(v2.mul(PI2)).mul(sin(u2.mul(PI2)));

    // === OCTAVE 3 — fine surface detail (0.1-0.2m scale) ===
    const v3 = baseUv.y.mul(15.0).add(t.mul(2.4).mul(streamSpeed));
    const u3 = baseUv.x.mul(12.0).add(t.mul(0.3));
    const oct3 = sin(v3.mul(PI2)).mul(sin(u3.mul(PI2)));

    // === OCTAVE 4 — tiny grit (droplet-scale ripple, fast) ===
    const v4 = baseUv.y.mul(32.0).add(t.mul(3.2));
    const oct4 = sin(v4.mul(PI2));

    // Combine octaves with decreasing amplitude (1/f spectrum) — gives
    // natural-looking turbulent surface variation when normalised to [0,1].
    const surfaceNoise = oct1.mul(0.5)
      .add(oct2.mul(0.30))
      .add(oct3.mul(0.15))
      .add(oct4.mul(0.05))
      .mul(0.5).add(0.5);  // normalize to [0,1]

    // === FLOW LINES — bright streaks tracking the flow direction
    // Long thin vertical streaks that scroll with the water. Different from
    // the surface noise: these are higher-frequency in U than in V so they
    // read as long vertical "fingers" of water.
    const flowV = baseUv.y.mul(3.5).add(t.mul(1.2).mul(streamSpeed)).add(streamPhase);
    const flowU = baseUv.x.mul(40.0).add(streamLocalU.mul(2.0));
    const flowStreaks = pow(
      smoothstep(float(0.55), float(0.92),
        sin(flowU.mul(PI2)).mul(sin(flowV.mul(PI2))).abs()
      ),
      float(2.0)
    );

    // === FOAM CELLS — turbulent patches scrolling with the flow
    // Procedural Voronoi-like by combining sin(uX) × cos(vY) at high freq.
    const foamU = baseUv.x.mul(18.0).add(streamPhase.mul(0.3));
    const foamV = baseUv.y.mul(13.0).add(t.mul(1.1).mul(streamSpeed));
    const foamCells = sin(foamU).mul(cos(foamV)).add(sin(foamU.mul(1.7)).mul(cos(foamV.mul(1.3))).mul(0.4));
    const foamMask = pow(smoothstep(float(0.35), float(0.85), foamCells.abs()), float(1.5));

    // === SPLASH ZONE FOAM — intense white foam at the BASE of the fall
    // Strong below v=0.78, fading toward v=0.94. Bumpy with high-freq noise
    // so it doesn't read as a flat horizontal stripe.
    const splashRamp = smoothstep(float(0.72), float(0.94), baseUv.y);
    const splashTurbulence = sin(baseUv.x.mul(20.0).add(t.mul(2.0)))
      .mul(cos(baseUv.y.mul(45.0).add(t.mul(3.0))))
      .mul(0.5).add(0.5);
    const splashFoam = splashRamp.mul(smoothstep(float(0.3), float(0.9), splashTurbulence));

    // === DEPTH-BASED OPACITY — top of fall transparent, base opaque
    // (water gathers at impact — denser column where it lands)
    const depthOpacity = smoothstep(float(0.0), float(0.6), baseUv.y);

    // === FRESNEL — silhouette edges brighter ===
    const cosTheta = abs(normalView.dot(positionViewDirection));
    const fresnel = pow(oneMinus(cosTheta), float(2.5));

    // === BECKMANN-LIKE SPEC — sharp specular along flow streaks ===
    // Cheap approximation: fresnel × flowStreaks raised to high power
    const beckmannSpec = pow(fresnel.mul(flowStreaks), float(1.8));

    // === COLOUR PALETTE — deep blue → cyan-aqua body → white foam ===
    const deepBlue = vec3(0.06, 0.22, 0.50);   // shadowed depths
    const aquaBody = vec3(0.32, 0.74, 1.0);    // mid-stream lit water
    const cyanBright = vec3(0.55, 0.92, 1.15); // bright flow streaks
    const foamWhite = vec3(1.0, 1.06, 1.12);

    let bodyColor = mix(deepBlue, aquaBody, surfaceNoise);
    bodyColor = mix(bodyColor, cyanBright, flowStreaks.mul(0.65));
    bodyColor = mix(bodyColor, foamWhite, foamMask.mul(0.55));
    bodyColor = mix(bodyColor, foamWhite, splashFoam.mul(0.95));
    bodyColor = mix(bodyColor, foamWhite, fresnel.mul(0.35));
    bodyColor = mix(bodyColor, foamWhite, beckmannSpec.mul(0.6));

    mat.colorNode = bodyColor;
    // Self-emission so the water reads in the dim neon-dusk scene without
    // depending on the scene's directional rig hitting it directly.
    mat.emissiveNode = bodyColor.mul(0.55);

    // === OPACITY — depth gradient + foam patches + splash zone are opaque
    const opacityFromDepth = mix(float(0.40), float(0.90), depthOpacity);
    const opacityWithFoam = mix(opacityFromDepth, float(0.98), foamMask.mul(0.5));
    const finalOpacity = mix(opacityWithFoam, float(1.0), splashFoam);
    mat.opacityNode = finalOpacity;
    mat.depthWrite = true;

    // Apply to every imported mesh
    scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!(m as unknown as { isMesh?: boolean }).isMesh) return;
      m.material = mat;
      m.castShadow = false;
      m.receiveShadow = false;
    });

    return mat;
  }, [scene]);

  return <primitive object={scene} position={position} />;
};

export default WaterfallTSL;
