/** @format */

import React, { useMemo } from "react";
import * as THREE from "three";

/** Procedural brushed-aluminum material via onBeforeCompile injection.
 * Anisotropic high-frequency stripes along world-X mimic a brushed-metal
 * desk top; low-amplitude noise modulates roughness; a worldspace edge mask
 * darkens roughness toward the desk's perimeter for fake AO grounding. */
function createDeskMaterial(): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: "#3a3531",
    roughness: 0.42,
    metalness: 0.78,
    envMapIntensity: 1.25,
    clearcoat: 0.25,
    clearcoatRoughness: 0.45,
  });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
       varying vec3 vDeskWorld;`
    );
    // Compute world position ourselves; modern three.js only declares the
    // built-in `worldPosition` inside a conditional in <worldpos_vertex>, so
    // we can't reliably read it after that include.
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
       vDeskWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
       varying vec3 vDeskWorld;
       float deskHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
       float deskNoise(vec2 p) {
         vec2 i = floor(p); vec2 f = fract(p);
         vec2 u = f*f*(3.0-2.0*f);
         return mix(mix(deskHash(i), deskHash(i+vec2(1,0)), u.x),
                    mix(deskHash(i+vec2(0,1)), deskHash(i+vec2(1,1)), u.x), u.y);
       }`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
       // High-frequency anisotropic brush streaks along world-X, with
       // microvariation from a low-octave noise so the streaks aren't too
       // mechanical. Modulates albedo lightness ±~12%.
       float deskBrushNoise = deskNoise(vDeskWorld.xz * vec2(0.6, 18.0));
       float deskStreak = sin(vDeskWorld.z * 480.0 + deskBrushNoise * 8.0) * 0.5 + 0.5;
       float deskBrush = mix(0.88, 1.08, deskStreak * 0.7 + deskBrushNoise * 0.3);
       diffuseColor.rgb *= deskBrush;
       // Worldspace edge mask: darken & roughen near desk-top perimeter
       // (desk surface is 3.2 × 1.6, sits at y≈0). Fades over 0.18m.
       float deskEdgeX = smoothstep(1.6, 1.42, abs(vDeskWorld.x));
       float deskEdgeZ = smoothstep(0.8, 0.62, abs(vDeskWorld.z));
       float deskEdge = deskEdgeX * deskEdgeZ;
       diffuseColor.rgb *= mix(0.72, 1.0, deskEdge);`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      `#include <roughnessmap_fragment>
       float deskRoughVar = deskNoise(vDeskWorld.xz * vec2(60.0, 6.0));
       roughnessFactor = clamp(roughnessFactor + (deskRoughVar - 0.5) * 0.18, 0.18, 0.88);`
    );
  };
  return mat;
}

const Desk: React.FC = () => {
  const deskMat = useMemo(() => createDeskMaterial(), []);
  return (
    <group>
      {/* Desk surface — brushed aluminum top */}
      <mesh position={[0, 0, 0]} receiveShadow castShadow material={deskMat}>
        <boxGeometry args={[3.2, 0.08, 1.6]} />
      </mesh>
      {/* Underside trim (darker edge band) */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[3.21, 0.018, 1.61]} />
        <meshStandardMaterial color="#1a130d" roughness={0.9} />
      </mesh>
      {/* Desk legs */}
      {[
        [-1.5, -0.46, -0.7],
        [1.5, -0.46, -0.7],
        [-1.5, -0.46, 0.7],
        [1.5, -0.46, 0.7],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.06, 0.86, 0.06]} />
          <meshPhysicalMaterial
            color="#1a1612"
            roughness={0.6}
            metalness={0.65}
            envMapIntensity={1.1}
            clearcoat={0.3}
            clearcoatRoughness={0.5}
          />
        </mesh>
      ))}
      {/* Floor */}
      <mesh position={[0, -0.92, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#0a0908" roughness={1.0} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 0.7, -1.6]} receiveShadow>
        <planeGeometry args={[24, 9]} />
        <meshStandardMaterial color="#15110e" roughness={1.0} />
      </mesh>
      {/* LED strip under the desk's front edge — emissive accent line */}
      <mesh position={[0, -0.07, 0.78]}>
        <boxGeometry args={[2.6, 0.005, 0.012]} />
        <meshStandardMaterial
          color="#e8632a"
          emissive="#e8632a"
          emissiveIntensity={1.4}
        />
      </mesh>
    </group>
  );
};

export default Desk;
