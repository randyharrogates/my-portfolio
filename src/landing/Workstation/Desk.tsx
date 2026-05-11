/** @format */

import React, { useMemo } from "react";
import { useTexture, MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";

const FLOOR_TEX_BASE = `${process.env.PUBLIC_URL}/textures/floor-concrete`;

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

/** Hook the brushed-concrete PBR set onto the floor plane. AO map needs a
 *  second UV channel on the geometry; PlaneGeometry only ships uv0, so we
 *  alias uv→uv2 below. */
function useFloorTextures() {
  const [albedo, normal, roughness, ao] = useTexture([
    `${FLOOR_TEX_BASE}/albedo.jpg`,
    `${FLOOR_TEX_BASE}/normal.jpg`,
    `${FLOOR_TEX_BASE}/roughness.jpg`,
    `${FLOOR_TEX_BASE}/ao.jpg`,
  ]);
  albedo.colorSpace = THREE.SRGBColorSpace;
  [albedo, normal, roughness, ao].forEach((t) => {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 8);
    t.anisotropy = 4;
  });
  return { albedo, normal, roughness, ao };
}

interface DeskProps {
  lowFidelity?: boolean;
  reducedMotion?: boolean;
}

const Desk: React.FC<DeskProps> = ({
  lowFidelity = false,
  reducedMotion = false,
}) => {
  const deskMat = useMemo(() => createDeskMaterial(), []);
  const floor = useFloorTextures();
  // Reflector continually re-renders to its mirror RT each frame; skip it
  // for users with prefers-reduced-motion (and on the low-fidelity tier)
  // to save the per-frame GPU cost. They get the procedural brushed-metal
  // shader instead — still readable as a polished desk surface.
  const useReflector = !lowFidelity && !reducedMotion;
  return (
    <group>
      {/* Desk surface — high-fidelity path renders the top via
       *  MeshReflectorMaterial so monitors, plant, mug etc. reflect onto
       *  the desk. Low-fidelity (or reduced-motion) falls back to the
       *  procedural brushed-metal shader. */}
      {!useReflector ? (
        <mesh position={[0, 0, 0]} receiveShadow castShadow material={deskMat}>
          <boxGeometry args={[3.2, 0.08, 1.6]} />
        </mesh>
      ) : (
        <>
          {/* Body (sides/bottom) keep the procedural brushed look. */}
          <mesh position={[0, -0.005, 0]} receiveShadow castShadow material={deskMat}>
            <boxGeometry args={[3.2, 0.07, 1.6]} />
          </mesh>
          {/* Top face: thin plane on top of the body, with reflective
           *  material. Separate plane so we only pay reflection cost on
           *  the visible top surface, not all 6 box faces. */}
          <mesh position={[0, 0.041, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[3.2, 1.6]} />
            <MeshReflectorMaterial
              blur={[400, 100]}
              resolution={512}
              mixBlur={1}
              mixStrength={0.35}
              roughness={0.55}
              depthScale={0.4}
              minDepthThreshold={0.85}
              maxDepthThreshold={1}
              color="#3a3531"
              metalness={0.55}
              mirror={0.6}
            />
          </mesh>
        </>
      )}
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
      {/* Floor — PBR brushed-concrete set from Poly Haven (CC0). The 8×
       *  uv repeat keeps the tile size readable from idle camera distance.
       *  ContactShadows from Scene.tsx writes onto this plane. Room.tsx
       *  handles the back wall. */}
      <mesh
        position={[0, -0.92, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial
          map={floor.albedo}
          normalMap={floor.normal}
          roughnessMap={floor.roughness}
          aoMap={floor.ao}
          roughness={0.9}
          metalness={0.05}
          color="#5a5a58"
        />
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
