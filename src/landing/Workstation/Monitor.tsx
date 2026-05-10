/** @format */

import React, { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { SectionConfig } from "../sections.ts";
import { createMonitorContent, createMatrixRain } from "./MonitorContent.ts";

const ACCENT = "#e8632a";

/** CRT shader material — adds scanlines, slight chromatic shift, vignette. */
function createCRTMaterial(map: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uTime: { value: 0 },
      uHover: { value: 0 },
      uFlash: { value: 0 },
      uMatrix: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uTime;
      uniform float uHover;
      uniform float uFlash;
      uniform float uMatrix;
      varying vec2 vUv;

      void main() {
        vec2 c = vUv - 0.5;
        float r2 = dot(c, c);
        vec2 uv = vUv + c * r2 * 0.025;

        float ca = 0.0007 + uHover * 0.002;
        vec3 col;
        col.r = texture2D(uMap, uv + vec2(ca, 0.0)).r;
        col.g = texture2D(uMap, uv).g;
        col.b = texture2D(uMap, uv - vec2(ca, 0.0)).b;

        float scan = sin(uv.y * 320.0 + uTime * 1.5) * 0.5 + 0.5;
        col *= 0.92 + scan * 0.08;

        float vig = smoothstep(0.95, 0.45, length(c));
        col *= 0.92 + vig * 0.18;

        // brighten so the screen reads as a glowing emissive surface
        col *= 4.6;
        // give the dark CRT areas a warm phosphor base glow so the screen always reads as on
        col += vec3(0.22, 0.16, 0.12);

        col += vec3(uFlash);
        col += vec3(0.91, 0.39, 0.16) * uHover * 0.32;
        col *= 0.985 + sin(uTime * 11.0) * 0.015;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

interface MonitorProps {
  cfg: SectionConfig;
  hovered: boolean;
  flashAmount: number; // 0..1 transient flash on click
  matrixRain: boolean;
  reducedMotion: boolean;
  onPointerOver: () => void;
  onPointerOut: () => void;
  onClick: () => void;
}

const Monitor: React.FC<MonitorProps> = ({
  cfg,
  hovered,
  flashAmount,
  matrixRain,
  reducedMotion,
  onPointerOver,
  onPointerOut,
  onClick,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const content = useMemo(() => createMonitorContent(cfg.id), [cfg.id]);
  const crtMat = useMemo(() => createCRTMaterial(content.texture), [content.texture]);
  const matrixDraw = useMemo(
    () =>
      createMatrixRain(
        content,
        content.texture.image.width,
        content.texture.image.height
      ),
    [content]
  );

  useEffect(() => {
    return () => {
      content.dispose();
      crtMat.dispose();
    };
  }, [content, crtMat]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (matrixRain) matrixDraw(t);
    else content.draw(t);
    crtMat.uniforms.uTime.value = t;
    crtMat.uniforms.uHover.value +=
      ((hovered ? 1 : 0) - crtMat.uniforms.uHover.value) * 0.12;
    crtMat.uniforms.uFlash.value = flashAmount;
    crtMat.uniforms.uMatrix.value = matrixRain ? 1 : 0;

    // subtle breathing rotation (Pack A)
    if (groupRef.current && !reducedMotion) {
      groupRef.current.rotation.y =
        cfg.rotation[1] + Math.sin(t * 1.6 + cfg.position[0]) * 0.005;
    }
  });

  const stalkHeight = cfg.position[1] - 0.04;
  const isDeskMonitor = cfg.position[1] < 1.3;

  return (
    <group ref={groupRef} position={cfg.position} rotation={cfg.rotation}>
      {isDeskMonitor && (
        <>
          <mesh position={[0, -stalkHeight / 2, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.024, stalkHeight, 12]} />
            <meshStandardMaterial
              color="#1f1c19"
              roughness={0.35}
              metalness={0.85}
              envMapIntensity={0.8}
            />
          </mesh>
          {/* base disc */}
          <mesh position={[0, -stalkHeight + 0.005, 0]}>
            <cylinderGeometry args={[0.12, 0.13, 0.012, 18]} />
            <meshStandardMaterial color="#15120f" roughness={0.5} metalness={0.6} envMapIntensity={0.8} />
          </mesh>
        </>
      )}

      {/* Bezel */}
      <mesh
        castShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          onPointerOver();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onPointerOut();
          document.body.style.cursor = "default";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <boxGeometry args={[cfg.size[0] + 0.04, cfg.size[1] + 0.04, 0.06]} />
        <meshPhysicalMaterial
          color="#1a1714"
          roughness={0.34}
          metalness={0.05}
          envMapIntensity={1.1}
          clearcoat={0.65}
          clearcoatRoughness={0.18}
        />
      </mesh>

      {/* Inner bezel rim — slight bevel highlight */}
      <mesh position={[0, 0, 0.018]}>
        <boxGeometry args={[cfg.size[0] + 0.005, cfg.size[1] + 0.005, 0.005]} />
        <meshStandardMaterial color="#0a0808" roughness={0.9} />
      </mesh>

      {/* Screen face (CRT shader) */}
      <mesh position={[0, 0, 0.034]}>
        <planeGeometry args={[cfg.size[0] * 0.94, cfg.size[1] * 0.88]} />
        <primitive ref={matRef} object={crtMat} attach="material" />
      </mesh>

      {/* Power LED */}
      <mesh position={[cfg.size[0] / 2 - 0.04, -cfg.size[1] / 2 + 0.025, 0.034]}>
        <sphereGeometry args={[0.005, 8, 8]} />
        <meshStandardMaterial
          color={ACCENT}
          emissive={ACCENT}
          emissiveIntensity={hovered ? 2.2 : 1.0}
        />
      </mesh>

      {/* Floating label sprite — rises on hover */}
      <Text
        position={[
          0,
          cfg.size[1] / 2 + (hovered ? 0.18 : 0.1),
          0.05,
        ]}
        fontSize={0.078}
        color={hovered ? ACCENT : "#b8a896"}
        anchorX="center"
        anchorY="middle"
        outlineColor="#0a0807"
        outlineWidth={0.0035}
      >
        {cfg.label.toUpperCase()}
      </Text>
    </group>
  );
};

export default Monitor;
