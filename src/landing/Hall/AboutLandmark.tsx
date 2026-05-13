/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { MeshStandardNodeMaterial } from "three/webgpu";

const LANDMARK_GLB = `${process.env.PUBLIC_URL}/models/hall/landmarks/landmark-about.glb`;
useGLTF.preload(LANDMARK_GLB);

/** Deterministic per-vertex random colour. Same input → same output
 *  so the same mesh always lights up the same way across reloads. */
function vertexNoiseColor(
  seed: number,
  amplitude: number,
  hueDrift: number
): THREE.Color {
  // Simple deterministic hash from seed.
  const v = ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1;
  const h = ((Math.sin(seed * 7.5713) * 17439.123) % 1 + 1) % 1;
  // Tint with subtle hue jitter and per-vertex value modulation.
  const value = 1.0 + (v - 0.5) * 2.0 * amplitude;
  // Bias toward neutral so we don't push reds/greens, just lighten/darken.
  const drift = (h - 0.5) * 2.0 * hueDrift;
  return new THREE.Color(value + drift, value, value - drift);
}

/** Inject per-vertex random colour into the mesh's geometry so the
 *  surface shows within-object granularity (a single rock has darker
 *  and lighter patches across its faces). Three.js multiplies the
 *  per-vertex colour with the material's base colour when
 *  `vertexColors = true`. */
function injectVertexNoise(
  geometry: THREE.BufferGeometry,
  amplitude: number,
  hueDrift: number,
  seedOffset: number
) {
  const positions = geometry.getAttribute("position");
  if (!positions) return;
  const vertCount = positions.count;
  const colors = new Float32Array(vertCount * 3);
  for (let i = 0; i < vertCount; i++) {
    const c = vertexNoiseColor(i + seedOffset, amplitude, hueDrift);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/** Convert every Mesh in `root` from its GLB-loaded `MeshStandardMaterial`
 *  to a `MeshStandardNodeMaterial` (required by WebGPURenderer). Preserves
 *  textures (base map, normal, AO, etc.) and applies the same three-tier
 *  emission strategy:
 *
 *    - authored emission → boosted 5× (hard, primary ≥ 0.4) or 2× (soft)
 *    - base-colour texture but no emission → texture piped through
 *      emissiveMap at 0.55 intensity (so the surface pattern survives
 *      even without scene lights reaching it)
 *    - plain colour → flat self-emission at 45 % base
 *
 *  Also injects per-vertex random colour into each mesh's geometry for
 *  within-object granularity — rocks get lighter/darker patches across
 *  their faces, plants get tonal variation along their leaves.
 */
function convertToNodeMaterials(root: THREE.Group) {
  let meshIndex = 0;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return;

    const src = mesh.material as THREE.MeshStandardMaterial;
    if (!src) return;

    const srcEmissive = src.emissive ?? new THREE.Color(0, 0, 0);
    const emissionMagnitude = Math.max(
      srcEmissive.r,
      srcEmissive.g,
      srcEmissive.b
    );
    const hasAuthoredEmission = emissionMagnitude > 0.02;
    const hardEmissive = emissionMagnitude >= 0.4;
    const hasBaseTexture = !!src.map;

    let finalEmissive: THREE.Color;
    let finalIntensity: number;
    let finalEmissiveMap: THREE.Texture | null = null;
    if (hasAuthoredEmission) {
      finalEmissive = srcEmissive.clone();
      finalIntensity = hardEmissive ? 5.0 : 2.0;
    } else if (hasBaseTexture) {
      finalEmissive = new THREE.Color(1, 1, 1);
      finalEmissiveMap = src.map;
      finalIntensity = 0.55;
    } else {
      finalEmissive = src.color.clone().multiplyScalar(0.45);
      finalIntensity = 1.0;
    }

    const nodeMat = new MeshStandardNodeMaterial({
      color: src.color.clone(),
      roughness: src.roughness,
      metalness: src.metalness,
      emissive: finalEmissive,
      emissiveIntensity: finalIntensity,
      transparent: src.transparent,
      opacity: src.opacity,
      side: src.side,
    });
    if (src.map) nodeMat.map = src.map;
    if (src.normalMap) {
      nodeMat.normalMap = src.normalMap;
      if (src.normalScale) nodeMat.normalScale = src.normalScale.clone();
    }
    if (src.roughnessMap) nodeMat.roughnessMap = src.roughnessMap;
    if (src.metalnessMap) nodeMat.metalnessMap = src.metalnessMap;
    if (src.aoMap) nodeMat.aoMap = src.aoMap;
    if (finalEmissiveMap) nodeMat.emissiveMap = finalEmissiveMap;
    else if (src.emissiveMap) nodeMat.emissiveMap = src.emissiveMap;

    // Inject per-vertex random colour so the same material reads
    // with within-object surface variation. Amount tuned per material
    // family — rocks get more contrast (looks weathered), foliage gets
    // a small amount (looks like patchy growth), emissive things get
    // none (so the glow stays uniform).
    const isEmissive = hasAuthoredEmission;
    const isRock =
      mesh.name.includes("boulder") ||
      mesh.name.includes("rock") ||
      mesh.name.includes("stone") ||
      mesh.name.includes("ground");
    const isFoliage =
      mesh.name.includes("foliage") ||
      mesh.name.includes("bush") ||
      mesh.name.includes("tuft");
    const amp = isEmissive ? 0.0 : isRock ? 0.30 : isFoliage ? 0.20 : 0.12;
    const hue = isEmissive ? 0.0 : isRock ? 0.05 : 0.08;
    if (amp > 0) {
      injectVertexNoise(mesh.geometry, amp, hue, meshIndex * 31);
      nodeMat.vertexColors = true;
    }
    meshIndex += 1;

    mesh.material = nodeMat;
    mesh.castShadow = !isEmissive;
    mesh.receiveShadow = true;
  });
}

interface AboutLandmarkProps {
  position: [number, number, number];
}

/** /about landmark — single GLB containing the building + environment
 *  with Cycles-baked lighting + shadows + AO + colour variation baked
 *  into per-asset textures (per `feedback_cycles_bake_workflow.md`).
 *
 *  Bake groups in `landmark-about.glb`:
 *  - `rocks_baked` — all boulders + small rocks + path stones + pond
 *    stones (one merged mesh, one 2048² atlas)
 *  - `foliage_baked` — all tree foliage cones + bush clumps (one
 *    merged mesh, one 2048² atlas)
 *  - `ground_baked` — the rocky ground patch with shadows from house
 *    + plants baked in (2048²)
 *  - house walls already carry their procedural-Brick bake
 *  - small props (mailbox, pond water, lily pads, exotic plants,
 *    grass) keep their direct materials — they're either emissive
 *    or too small to need baked variation.
 */
const AboutLandmark: React.FC<AboutLandmarkProps> = ({ position }) => {
  const navigate = useNavigate();
  const gltf = useGLTF(LANDMARK_GLB) as unknown as { scene: THREE.Group };

  const landmark = useMemo(() => {
    const r = gltf.scene.clone(true);
    convertToNodeMaterials(r);
    return r;
  }, [gltf.scene]);

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        navigate("/hall/about");
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <primitive object={landmark} />
    </group>
  );
};

export default AboutLandmark;
