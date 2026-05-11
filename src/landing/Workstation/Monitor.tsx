/** @format */

import React, { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";
import type { SectionConfig } from "../sections.ts";
import { createMonitorContent, createMatrixRain, TEXT_DPR } from "./MonitorContent.ts";

const ACCENT = "#e8632a";

/** Flat-panel shader — minimal scanline modulation, no curvature/CA/vignette. */
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
        vec2 uv = vUv;
        vec3 col = texture2D(uMap, uv).rgb;

        float scan = sin(uv.y * 320.0 + uTime * 1.5) * 0.5 + 0.5;
        col *= 0.98 + scan * 0.02;

        col *= 2.2;

        col += vec3(uFlash);
        col += vec3(0.91, 0.39, 0.16) * uHover * 0.32;

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
  /** Tab index for the invisible a11y button overlay. SECTIONS index drives
   *  spatial tab order; arrow-key navigation handled by the landing wrapper. */
  a11yTabIndex: number;
  /** Map-back so the wrapper can refocus a sibling via arrow keys. */
  registerButton: (id: string, el: HTMLButtonElement | null) => void;
  /** External keyboard-focus state (driven by document.activeElement check). */
  keyboardFocused: boolean;
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
  a11yTabIndex,
  registerButton,
  keyboardFocused,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const content = useMemo(() => createMonitorContent(cfg.id), [cfg.id]);
  const crtMat = useMemo(() => createCRTMaterial(content.texture), [content.texture]);
  const matrixDraw = useMemo(
    () =>
      createMatrixRain(
        content,
        content.texture.image.width / TEXT_DPR,
        content.texture.image.height / TEXT_DPR
      ),
    [content]
  );

  useEffect(() => {
    return () => {
      content.dispose();
      crtMat.dispose();
    };
  }, [content, crtMat]);

  // Magnetic hover spring — eases the group toward a forward-translated +
  // slightly-scaled state while hovered, then settles back. Damped lerp keeps
  // it tactile without needing react-spring as a dep.
  const hoverProgressRef = useRef(0);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (matrixRain) matrixDraw(t);
    else content.draw(t);
    crtMat.uniforms.uTime.value = t;
    crtMat.uniforms.uHover.value +=
      ((hovered ? 1 : 0) - crtMat.uniforms.uHover.value) * 0.12;
    crtMat.uniforms.uFlash.value = flashAmount;
    crtMat.uniforms.uMatrix.value = matrixRain ? 1 : 0;

    // Hover progress 0→1 with damped lerp. Reduced-motion users get a
    // smaller magnitude (still readable as feedback, not animated).
    const target = hovered ? 1 : 0;
    hoverProgressRef.current +=
      (target - hoverProgressRef.current) * (reducedMotion ? 0.25 : 0.14);
    const h = hoverProgressRef.current;
    const mag = reducedMotion ? 0.35 : 1.0;

    if (groupRef.current) {
      // Scale: 1 → 1.04 on hover
      const s = 1 + 0.04 * h * mag;
      groupRef.current.scale.set(s, s, s);
      // Subtle breathing rotation (Pack A) + 2° tilt toward camera on hover
      const breath = !reducedMotion ? Math.sin(t * 1.6 + cfg.position[0]) * 0.005 : 0;
      groupRef.current.rotation.y = cfg.rotation[1] + breath;
      groupRef.current.rotation.x = cfg.rotation[0] - (0.035 * h * mag);
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

      {/* Focus ring — emissive outline plane that fades in when this monitor
       *  is keyboard-focused. Sits behind the bezel face. */}
      {keyboardFocused && (
        <mesh position={[0, 0, -0.035]}>
          <planeGeometry args={[cfg.size[0] + 0.12, cfg.size[1] + 0.12]} />
          <meshBasicMaterial
            color={ACCENT}
            transparent
            opacity={0.6}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Accessible button overlay — 1×1 px invisible HTML button at the
       *  bezel face. Tab order matches SECTIONS visual order. Enter/Space
       *  triggers the same handler as the 3D click. */}
      <Html
        position={[0, 0, 0.035]}
        center
        zIndexRange={[1, 0]}
        style={{ pointerEvents: "none" }}
      >
        <button
          ref={(el) => registerButton(cfg.id, el)}
          type="button"
          tabIndex={a11yTabIndex}
          aria-label={`Open ${cfg.label} section`}
          data-section-id={cfg.id}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: 0,
            border: "none",
            background: "transparent",
            color: "transparent",
            outline: "none",
            pointerEvents: "auto",
            cursor: "pointer",
          }}
        >
          {cfg.label}
        </button>
      </Html>
    </group>
  );
};

export default Monitor;
