/** @format */

import React, { useMemo } from "react";
import * as THREE from "three";

interface ShaftProps {
  apex: [number, number, number];
  target: [number, number, number];
  halfAngle: number;
  length: number;
  color: string;
  intensity?: number;
}

/**
 * Single additive volumetric cone. Apex sits at `apex`; the cone axis points
 * from apex toward `target`. Geometry is a unit cone laid out along +Y in
 * local space (apex at +Y, base at 0); we rotate the group so the apex stays
 * at `apex` and the axis aligns with `target - apex`. The shader fades alpha
 * radially toward the cone wall and along the axis from apex (1) to base (0).
 */
const Shaft: React.FC<ShaftProps> = ({
  apex,
  target,
  halfAngle,
  length,
  color,
  intensity = 0.18,
}) => {
  const { quaternion, geometry, material } = useMemo(() => {
    // Direction from apex to target.
    const dir = new THREE.Vector3(
      target[0] - apex[0],
      target[1] - apex[1],
      target[2] - apex[2]
    ).normalize();
    // Default cone axis in local space points from apex (+Y top) down to base.
    // ConeGeometry's default axis is +Y, with apex at +Y/2 and base at -Y/2.
    // We want the apex at the local origin pointing in -Y (so we shift it).
    // Easier approach: align local -Y to dir, so the cone opens along dir.
    const from = new THREE.Vector3(0, -1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(from, dir);

    const baseRadius = Math.tan(halfAngle) * length;
    const geom = new THREE.ConeGeometry(baseRadius, length, 32, 1, true);
    // Shift so apex is at local origin (apex was at +Y/2, base at -Y/2).
    geom.translate(0, -length / 2, 0);

    const tint = new THREE.Color(color);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: tint },
        uIntensity: { value: intensity },
        uLength: { value: length },
        uBaseRadius: { value: baseRadius },
      },
      vertexShader: `
        uniform float uLength;
        uniform float uBaseRadius;
        varying float vAxisDist01;
        varying float vRadial;
        void main() {
          // After translate, apex is at y=0, base at y=-uLength.
          // vAxisDist01: 0 at apex, 1 at base.
          vAxisDist01 = clamp(-position.y / uLength, 0.0, 1.0);
          // vRadial: 0..1 across the cone's circular cross-section.
          float r = length(position.xz);
          float maxR = max(uBaseRadius * vAxisDist01, 1e-4);
          vRadial = clamp(r / maxR, 0.0, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        varying float vAxisDist01;
        varying float vRadial;
        void main() {
          // Radial falloff peaks at the cone's outer wall (vRadial≈1) where
          // double-sided geometry stacks both faces — that's the visible
          // "edge of the beam". Spec: pow(1 - abs(vRadial - 0.5)*2, 2.5).
          float radial = 1.0 - abs(vRadial - 0.5) * 2.0;
          radial = pow(max(radial, 0.0), 2.5);
          float axial = 1.0 - vAxisDist01;
          float a = radial * axial * uIntensity;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    return { quaternion: q, geometry: geom, material: mat };
  }, [apex, target, halfAngle, length, color, intensity]);

  return (
    <mesh
      position={apex}
      quaternion={quaternion}
      geometry={geometry}
      material={material}
      renderOrder={1}
      frustumCulled={false}
    />
  );
};

interface LightShaftsProps {
  keyColor: string;
}

/**
 * Two additive volumetric warm shafts: one slanting from upper-left key,
 * one descending from the ceiling wash. Cheap (two cones, one custom shader);
 * gated behind !lowFidelity by the caller.
 */
const LightShafts: React.FC<LightShaftsProps> = ({ keyColor }) => {
  return (
    <>
      <Shaft
        apex={[-1.4, 3.0, 1.6]}
        target={[0.0, 1.0, 0.0]}
        halfAngle={0.42}
        length={4.5}
        color={keyColor}
      />
      <Shaft
        apex={[0.0, 3.2, 0.4]}
        target={[0.0, 0.0, 0.4]}
        halfAngle={0.35}
        length={3.5}
        color={keyColor}
        intensity={0.10}
      />
    </>
  );
};

export default LightShafts;
