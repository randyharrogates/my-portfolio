/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { MeshStandardNodeMaterial } from "three/webgpu";
import {
  float,
  mix,
  sin,
  timerLocal,
  uv,
  vec2,
  vec3,
} from "three/tsl";

const LANDMARK_GLB = `${process.env.PUBLIC_URL}/models/hall/landmarks/landmark-skills.glb`;
useGLTF.preload(LANDMARK_GLB);

/** Identify water meshes by name (handles Blender's `.001` suffix +
 *  glTF's `_001` rename). Returns a categorical "kind" string we use
 *  to pick the animation pattern. */
function getWaterKind(meshName: string): "waterfall" | "spray" | "pool" | "creek" | "trough" | null {
  const lower = meshName.toLowerCase();
  if (lower.includes("waterfall_spray")) return "spray";
  if (lower.includes("waterfall_main")) return "waterfall";
  if (lower.includes("plunge_pool")) return "pool";
  if (lower.includes("creek_surface")) return "creek";
  if (lower.includes("water_trough_surface")) return "trough";
  return null;
}

/** Build a TSL-animated water material. The pattern is time-driven:
 *  layered sin-wave noise that scrolls in the direction the water flows.
 *
 *  - waterfall + spray: UV scrolls DOWN (the curtain falls)
 *  - creek: UV scrolls in +X (creek flows east toward the rim)
 *  - pool + trough: UV uses radial ripple from centre (calm surface
 *    disturbed by water hitting it)
 *
 *  Colour is mixed between deep blue and a brighter highlight blue,
 *  driven by the noise — gives the surface a constantly-shifting
 *  pattern of bright water highlights against the deep colour. */
function buildAnimatedWaterMaterial(kind: NonNullable<ReturnType<typeof getWaterKind>>): MeshStandardNodeMaterial {
  const mat = new MeshStandardNodeMaterial({
    color: new THREE.Color(0.10, 0.35, 0.85),
    roughness: 0.1,
    metalness: 0.0,
  });

  let scrolled;
  let freqA = 20;
  let freqB = 15;
  let speedA = 1.5;
  let speedB = 2.3;
  if (kind === "waterfall" || kind === "spray") {
    // Scroll DOWN: subtract from V so pattern moves toward +V over time
    scrolled = uv().add(vec2(float(0), timerLocal().mul(-1.5)));
    freqA = 28;
    freqB = 24;
    speedA = 4.0;
    speedB = 5.5;
  } else if (kind === "creek") {
    // Creek flows in +X (east). Scroll U with time.
    scrolled = uv().add(vec2(timerLocal().mul(0.5), float(0)));
    freqA = 22;
    freqB = 18;
    speedA = 2.0;
    speedB = 2.8;
  } else {
    // Pool + trough: gentle ripple — slow radial pulse
    scrolled = uv();
    freqA = 18;
    freqB = 14;
    speedA = 1.2;
    speedB = 1.6;
  }

  // Layered sin-wave noise — two perpendicular frequencies multiplied
  // gives a checker-y water highlight pattern that reads as caustics.
  const waveA = sin(scrolled.x.mul(freqA).add(timerLocal().mul(speedA))).mul(0.5).add(0.5);
  const waveB = sin(scrolled.y.mul(freqB).add(timerLocal().mul(speedB))).mul(0.5).add(0.5);
  const noise = waveA.mul(waveB);

  // Darker, deeper blue palette — previous (0.10, 0.35, 0.85 / bright
  // 0.45, 0.75, 1.25) was reading too white-blown-out against the
  // magenta skybox + bloom. New palette stays in saturated deep blue
  // even at the bright caustic peaks.
  const baseBlue = vec3(0.03, 0.10, 0.32);
  const brightBlue = vec3(0.10, 0.30, 0.70);

  const animatedColor = mix(baseBlue, brightBlue, noise);

  mat.colorNode = animatedColor;
  // Toned-down self-emission (was 2.0×, now 1.0×) so the water reads
  // as glowing deep blue without blowing out to white. The TSL noise
  // animation still drives the highlight movement visibly.
  mat.emissiveNode = animatedColor.mul(1.0);

  // Spray + trough are slightly translucent so they don't read as
  // solid sheets when overlapping.
  if (kind === "spray") {
    mat.transparent = true;
    mat.opacity = 0.65;
    mat.depthWrite = false;
  }

  return mat;
}

/** Same three-tier emission strategy as AboutLandmark / ProjectsLandmark
 *  for non-water meshes (baked diffuse → emissive map at 0.55, plain
 *  colour → 0.45× self-emission, authored emissive → 5× hard or 2×
 *  soft). Water meshes (waterfall, spray, plunge pool, creek, trough)
 *  get TSL-animated materials instead, with time-driven scrolling
 *  noise that reads as constantly-flowing water. */
function convertToNodeMaterials(root: THREE.Group) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return;
    const src = mesh.material as THREE.MeshStandardMaterial;
    if (!src) return;

    // Water meshes get the TSL-animated material — bypass standard
    // emission strategy.
    const waterKind = getWaterKind(mesh.name);
    if (waterKind) {
      mesh.material = buildAnimatedWaterMaterial(waterKind);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      return;
    }

    const srcEmissive = src.emissive ?? new THREE.Color(0, 0, 0);
    const emissionMagnitude = Math.max(srcEmissive.r, srcEmissive.g, srcEmissive.b);
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

    mesh.material = nodeMat;
    // All shadows are baked into the textures. Dynamic shadow camera
    // is sized for the house area (-25..+25); skills lives at world
    // ~(-30, 0, -6) outside the frustum so dynamic shadows would just
    // produce clipped black bars. Bake already has shadows.
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
}

interface SkillsLandmarkProps {
  position: [number, number, number];
}

/** /skills landmark — floating rock outcrop above the island with a
 *  tall waterfall pouring down into a plunge pool ringed with basalt-
 *  style hex stone columns. Forge platform (anvil + hammer + tool
 *  rack + sword-in-progress) sits on the eastern bank tying back the
 *  "tool armory" theme. Mounted at `HALL_POI_POSITIONS[2]`.
 *
 *  Water meshes use TSL-animated materials with time-driven scrolling
 *  noise so the waterfall + pool + creek read as constantly flowing.
 *  Everything else is Cycles-baked.
 *
 *  Clicking the landmark navigates to /hall/skills. The pedestal
 *  screen + the lime orb above it (in Scene.tsx) jump straight to
 *  /skills. */
const SkillsLandmark: React.FC<SkillsLandmarkProps> = ({ position }) => {
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
        navigate("/hall/skills");
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

export default SkillsLandmark;
