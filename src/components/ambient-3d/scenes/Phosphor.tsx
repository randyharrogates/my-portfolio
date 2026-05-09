/** @format */

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TERMINAL_THEME } from "../../../styles/terminal-theme.ts";

interface Props {
  lowPerf: boolean;
  reducedMotion: boolean;
}

// Procedural CRT phosphor: many tiny glowing dots on a plane facing the camera,
// with slow flickering opacity. Single fullscreen plane with a fragment-shader
// material is cheaper than many sprites.
const Phosphor: React.FC<Props> = ({ lowPerf, reducedMotion }) => {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uAccent: { value: new THREE.Color(TERMINAL_THEME.accent) },
        uMute: { value: new THREE.Color(TERMINAL_THEME.mute) },
        uIntensity: { value: lowPerf ? 0.45 : 0.6 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision mediump float;
        varying vec2 vUv;
        uniform float uTime;
        uniform vec3 uAccent;
        uniform vec3 uMute;
        uniform float uIntensity;

        // Simple hash → 0..1
        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        void main() {
          // Dot grid in viewport space — sparse phosphor texture
          vec2 grid = vUv * vec2(160.0, 90.0);
          vec2 cellId = floor(grid);
          vec2 cellUv = fract(grid) - 0.5;
          float dot_ = smoothstep(0.32, 0.0, length(cellUv));

          // Per-cell hash determines visibility (~6% of cells lit)
          float h = hash(cellId);
          float lit = step(0.94, h);

          // Slow shimmer: 8% of lit cells flicker over time
          float shimmer = 0.6 + 0.4 * sin(uTime * 0.6 + h * 30.0);
          float alpha = dot_ * lit * shimmer * uIntensity;

          // Color: most cells mute (gray), ~15% accent (orange)
          float isAccent = step(0.85, hash(cellId + 17.0));
          vec3 col = mix(uMute, uAccent, isAccent);

          // Vignette — darker corners
          float r = length(vUv - 0.5);
          float vignette = smoothstep(0.85, 0.2, r);
          alpha *= vignette;

          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
  }, [lowPerf]);

  useFrame((_, delta) => {
    if (!matRef.current || reducedMotion) return;
    matRef.current.uniforms.uTime.value += delta;
  });

  return (
    <mesh position={[0, 0, -2]}>
      {/* Large plane filling the camera frustum */}
      <planeGeometry args={[24, 14]} />
      <primitive ref={matRef} object={material} attach="material" />
    </mesh>
  );
};

export default Phosphor;
