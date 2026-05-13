/** @format */

import React, { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import {
  abs,
  cos,
  float,
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
  const { scene } = useGLTF(MODEL_PATH) as unknown as { scene: THREE.Group };

  // Build the TSL material + apply to all meshes BEFORE render — doing
  // this in useEffect causes WebGPU to compile the original GLB material
  // first, which (because it's a Principled BSDF with no UV-driven
  // texture inputs) lacks the 'uv' attribute binding and crashes the
  // pipeline. Doing it synchronously in useMemo ensures the first render
  // already has the TSL material.
  useMemo(() => {
    const mat = new MeshStandardNodeMaterial({
      color: new THREE.Color(0x6fc0ff),
      roughness: 0.08,
      metalness: 0.0,
      side: THREE.DoubleSide,
      transparent: true,
    });

    const t = timerLocal();
    const baseUv = uv();

    // === SCROLL LAYERS — vertical UV motion (water falls along V axis) ===
    // GLB UV: V increases TOP→BOTTOM (top=0, base=1). To make pattern
    // appear to flow DOWN, V should increase over time (so a pattern at
    // V=0.3 a second later is the pattern that was at V=0.2 before — i.e.
    // it "fell" from V=0.2 to V=0.3). We use scrolledV = baseV + t.
    const v1 = baseUv.y.mul(4.0).add(t.mul(1.4));
    const v2 = baseUv.y.mul(7.0).add(t.mul(2.1));

    const stripe1 = sin(v1.mul(Math.PI * 2)).mul(0.5).add(0.5);
    const stripe2 = sin(v2.mul(Math.PI * 2)).mul(0.5).add(0.5);
    const stripeMix = stripe1.mul(0.6).add(stripe2.mul(0.4));

    // === FOAM CELLS — procedural turbulent pattern, scrolls with flow ===
    const foamU = baseUv.x.mul(15.0);
    const foamV = baseUv.y.mul(11.0).add(t.mul(0.9));
    const foamCells = sin(foamU).mul(cos(foamV));
    const foamMask = pow(smoothstep(float(0.3), float(0.9), foamCells.abs()), float(1.5));

    // === BASE-OF-WATERFALL SPLASH ZONE — high V is bottom, intense foam ===
    const baseFoam = smoothstep(float(0.75), float(0.97), baseUv.y);

    // === FRESNEL — silhouette edges brighten with foam ===
    const cosTheta = abs(normalView.dot(positionViewDirection));
    const fresnel = pow(oneMinus(cosTheta), float(2.0));

    // === COLOUR — deep blue → cyan → white ramp by stripe + foam ===
    const deepBlue = vec3(0.10, 0.30, 0.55);
    const cyanBody = vec3(0.45, 0.78, 0.96);
    const foamWhite = vec3(1.0, 1.05, 1.10);

    const bodyMix = mix(deepBlue, cyanBody, stripeMix);
    const withFoam = mix(bodyMix, foamWhite, foamMask.mul(0.6));
    const withBaseFoam = mix(withFoam, foamWhite, baseFoam.mul(0.9));
    const finalColor = mix(withBaseFoam, foamWhite, fresnel.mul(0.5));
    mat.colorNode = finalColor;
    mat.emissiveNode = finalColor.mul(0.55);

    // === OPACITY — water reads as semi-transparent body + dense base ===
    const stripeOpacity = mix(float(0.55), float(0.92), stripeMix);
    const finalOpacity = mix(stripeOpacity, float(1.0), baseFoam);
    mat.opacityNode = finalOpacity;
    mat.depthWrite = true;

    // Apply synchronously to all imported meshes
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
