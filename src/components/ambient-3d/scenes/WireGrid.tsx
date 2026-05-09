/** @format */

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TERMINAL_THEME } from "../../../styles/terminal-theme.ts";

interface Props {
  lowPerf: boolean;
  reducedMotion: boolean;
}

// Vanishing wireframe floor: a tiled grid receding into perspective.
// Static mesh that pans toward the camera in a loop to suggest motion.
const WireGrid: React.FC<Props> = ({ lowPerf, reducedMotion }) => {
  const root = useRef<THREE.Group>(null);

  const segments = lowPerf ? 36 : 60;
  const size = 60;

  const geom = useMemo(() => {
    const lines: number[] = [];
    const step = size / segments;
    const half = size / 2;
    // X-direction lines (running along Z)
    for (let i = 0; i <= segments; i++) {
      const x = -half + i * step;
      lines.push(x, 0, -half, x, 0, half);
    }
    // Z-direction lines (running along X)
    for (let i = 0; i <= segments; i++) {
      const z = -half + i * step;
      lines.push(-half, 0, z, half, 0, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array(lines), 3)
    );
    return g;
  }, [segments, size]);

  // Fade-distance shader so the grid dies into the dark, no harsh horizon line
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uColor: { value: new THREE.Color(TERMINAL_THEME.line) },
          uAccent: { value: new THREE.Color(TERMINAL_THEME.accent) },
        },
        vertexShader: `
          varying vec3 vWorld;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }
        `,
        fragmentShader: `
          precision mediump float;
          varying vec3 vWorld;
          uniform vec3 uColor;
          uniform vec3 uAccent;
          void main() {
            float d = length(vWorld.xz);
            // Strong fade past 14 units, fully gone by 28
            float fade = 1.0 - smoothstep(8.0, 26.0, d);
            // Hint of accent at the visible inner ring
            float accent = smoothstep(0.0, 6.0, d) * (1.0 - smoothstep(6.0, 12.0, d));
            vec3 col = mix(uColor, uAccent, accent * 0.35);
            gl_FragColor = vec4(col, fade * 0.55);
          }
        `,
      }),
    []
  );

  useFrame((_, delta) => {
    if (!root.current || reducedMotion) return;
    // Pan toward camera, wrap by step distance so seam is invisible
    const step = size / segments;
    root.current.position.z = (root.current.position.z + delta * 0.4) % step;
  });

  return (
    <group ref={root} position={[0, -2.4, 0]} rotation={[-Math.PI * 0.05, 0, 0]}>
      <lineSegments geometry={geom}>
        <primitive object={material} attach="material" />
      </lineSegments>
    </group>
  );
};

export default WireGrid;
