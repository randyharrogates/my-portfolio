/** @format */

import React, { useMemo } from "react";
import * as THREE from "three";

/** Procedural wood-grain material via onBeforeCompile shader injection. */
function createWoodMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: "#3a2a1d",
    roughness: 0.78,
    metalness: 0.04,
    envMapIntensity: 0.8,
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
       float deskGrain = deskNoise(vDeskWorld.xz * vec2(28.0, 3.0));
       float deskBands = sin(vDeskWorld.x * 18.0 + deskGrain * 5.0) * 0.5 + 0.5;
       float deskWood = mix(0.78, 1.05, deskBands * 0.6 + deskGrain * 0.4);
       diffuseColor.rgb *= deskWood;
       diffuseColor.rgb += deskGrain * 0.04;`
    );
  };
  return mat;
}

const Desk: React.FC = () => {
  const woodMat = useMemo(() => createWoodMaterial(), []);
  return (
    <group>
      {/* Desk surface — slightly rounded by stacking a thin top layer */}
      <mesh position={[0, 0, 0]} receiveShadow castShadow material={woodMat}>
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
          <meshStandardMaterial color="#1a1612" roughness={0.6} metalness={0.4} envMapIntensity={0.8} />
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
