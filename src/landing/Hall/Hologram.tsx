/** @format */

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface HologramProps {
  /** Canvas-rendered content texture. Updates each frame if the underlying
   *  canvas mutates (HologramContent components mark needsUpdate). */
  contentTexture: THREE.CanvasTexture | null;
  /** Tint colour for the hologram (RGB 0-1). Mixed with content via screen blend. */
  color: [number, number, number];
  /** Width × Height in world units. Default 1.6 × 1.0 — readable from 2m. */
  size?: [number, number];
  /** How curved the screen is (0 = flat, 1 = strong concave). Default 0.18. */
  curvature?: number;
  /** Disable scanlines + flicker for the reduced-motion path. */
  staticMode?: boolean;
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  uniform float uTime;
  uniform vec3 uColor;
  uniform sampler2D uContent;
  uniform float uStatic;
  uniform float uHasContent;

  void main() {
    // Slight barrel distortion + chromatic aberration on content lookup.
    vec2 uv = vUv - 0.5;
    float r2 = dot(uv, uv);
    uv = uv * (1.0 + 0.05 * r2) + 0.5;

    vec2 caOff = vec2(0.0025, 0.0) * (0.5 + 0.5 * sin(uTime * 0.7));
    float r = texture2D(uContent, uv + caOff).r;
    float g = texture2D(uContent, uv).g;
    float b = texture2D(uContent, uv - caOff).b;
    float a = texture2D(uContent, uv).a;

    // If no content texture is provided, fall back to a soft scanline gradient.
    vec3 content = vec3(r, g, b);
    content = mix(vec3(0.35), content, uHasContent);

    // Scanline modulation — fixed-frequency in screen space (vUv.y), animated
    // upward roll. When uStatic > 0, lock the phase so reduced-motion users
    // don't see motion.
    float lineFreq = 240.0;
    float roll = uStatic > 0.5 ? 0.0 : uTime * 1.8;
    float scan = 0.78 + 0.22 * sin(vUv.y * lineFreq - roll);

    // Vertical seam glow at edges
    float edgeX = smoothstep(0.0, 0.04, vUv.x) * smoothstep(0.0, 0.04, 1.0 - vUv.x);
    float edgeY = smoothstep(0.0, 0.06, vUv.y) * smoothstep(0.0, 0.06, 1.0 - vUv.y);
    float edge = edgeX * edgeY;

    // Fresnel rim glow — strongest at grazing angles.
    float fres = pow(1.0 - max(dot(vWorldNormal, vViewDir), 0.0), 2.2);

    // Random small-scale flicker (deterministic noise on time).
    float flicker = uStatic > 0.5
      ? 1.0
      : 0.94 + 0.06 * sin(uTime * 47.0 + vUv.y * 13.0);

    // Tint mid: brighter content stays whitish; the tint kicks in mostly
    // where content has any colour at all (text glyphs, chart strokes, …).
    float lum = max(content.r, max(content.g, content.b));
    vec3 tinted = mix(uColor * 0.45, mix(uColor, vec3(1.0), 0.35), lum);
    vec3 col = content * tinted * 1.4;

    col *= scan * flicker;
    col *= mix(0.7, 1.0, edge);
    col += fres * uColor * 0.6;

    // Slight ambient glow over the whole screen so the panel reads even
    // before any content draws.
    col += uColor * 0.12 * scan;

    // Alpha is what makes the screen semi-transparent — dim where content is
    // dark, opaque where content is bright. Fresnel rim always visible.
    float alpha = mix(0.35, 0.92, lum);
    alpha = max(alpha, fres * 0.55);
    alpha *= a > 0.0 ? a : 1.0;

    gl_FragColor = vec4(col, clamp(alpha, 0.18, 0.96));
  }
`;

/** Build a slightly-concave plane geometry. */
function buildCurvedPlane(
  width: number,
  height: number,
  curvature: number,
  segments = 24
): THREE.BufferGeometry {
  const geom = new THREE.PlaneGeometry(width, height, segments, 1);
  const pos = geom.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const t = x / (width / 2);
    // Quadratic bend — push centre forward (toward camera) by curvature*width*0.1
    pos.setZ(i, -curvature * (1 - t * t) * width * 0.1);
  }
  geom.computeVertexNormals();
  return geom;
}

/** Curved hologram screen. Mount somewhere; pass a CanvasTexture for the
 *  per-section content. Tint via `color`. Pure additive emissive — no
 *  lighting computation, plays nicely with the existing postfx pipeline. */
const Hologram: React.FC<HologramProps> = ({
  contentTexture,
  color,
  size = [1.6, 1.0],
  curvature = 0.18,
  staticMode = false,
}) => {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const placeholderTexture = useMemo(() => {
    // 1×1 dark grey placeholder so the sampler is always valid.
    const data = new Uint8Array([24, 28, 32, 255]);
    const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    tex.needsUpdate = true;
    return tex;
  }, []);

  const geometry = useMemo(
    () => buildCurvedPlane(size[0], size[1], curvature),
    [size, curvature]
  );

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color[0], color[1], color[2]) },
      uContent: { value: contentTexture ?? placeholderTexture },
      uStatic: { value: staticMode ? 1 : 0 },
      uHasContent: { value: contentTexture ? 1 : 0 },
    }),
    // contentTexture / color are mutated below to avoid material recreation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Keep uniforms in sync when props change without recreating the material.
  React.useEffect(() => {
    uniforms.uColor.value.setRGB(color[0], color[1], color[2]);
    uniforms.uStatic.value = staticMode ? 1 : 0;
    uniforms.uContent.value = contentTexture ?? placeholderTexture;
    uniforms.uHasContent.value = contentTexture ? 1 : 0;
  }, [color, staticMode, contentTexture, placeholderTexture, uniforms]);

  useFrame((_, delta) => {
    if (!matRef.current) return;
    uniforms.uTime.value += delta;
  });

  return (
    <mesh geometry={geometry} renderOrder={2}>
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
};

export default Hologram;
