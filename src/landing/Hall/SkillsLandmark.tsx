/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { MeshStandardNodeMaterial } from "three/webgpu";
import {
  abs,
  atan2,
  clamp,
  cos,
  float,
  floor,
  hash,
  mix,
  normalView,
  oneMinus,
  positionLocal,
  positionViewDirection,
  pow,
  sin,
  smoothstep,
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
  // Creek, river fork branches, and the small cascade at the river's
  // far end all flow east-ish → use the creek's east-scrolling pattern
  if (lower.includes("creek_surface") ||
      lower.includes("river_fork") ||
      lower.includes("river_cascade")) return "creek";
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
/** Build a stylised jordan-breton-style water material. Targets the
 *  reference look (image #49):
 *   - many vertical bright cyan streamers over a darker translucent blue
 *   - random foam bursts that pop in/out
 *   - fresnel rim brightening at silhouette
 *   - variable transparency (see-through between streamers)
 *   - pool gets concentric ripple caustics + a foam patch around the
 *     waterfall impact point
 *  Driven entirely via TSL so it animates every frame with no CPU cost. */
function buildAnimatedWaterMaterial(kind: NonNullable<ReturnType<typeof getWaterKind>>): MeshStandardNodeMaterial {
  const mat = new MeshStandardNodeMaterial({
    color: new THREE.Color(0.05, 0.18, 0.50),
    roughness: 0.08,
    metalness: 0.0,
  });

  const t = timerLocal();
  // Don't rely on the cylindrical waterfall mesh's UV unwrap (Blender's
  // smart-project on a separate non-merged mesh gave us bad UVs that
  // collapsed to (0,0) → uniform colour). Derive U from the angular
  // position around the cylinder axis (X-Z plane in local space), and
  // V from the vertical position (local Y). Falls back to standard UV
  // for non-cylinder water meshes (plunge pool, creek, trough — those
  // are merged + properly unwrapped).
  const POOL_CX_LOCAL = float(-3.0);
  const POOL_CZ_LOCAL = float(0.0);
  const dx = positionLocal.x.sub(POOL_CX_LOCAL);
  const dz = positionLocal.z.sub(POOL_CZ_LOCAL);
  const angleAround = atan2(dz, dx);
  // Normalised angular coord, 0..1 around the cylinder
  const cylU = angleAround.mul(0.5 / Math.PI).add(0.5);
  // Vertical V coord: 0 at pool surface, 1 at top of fall (~40m)
  const cylV = positionLocal.y.mul(1.0 / 40.0);

  // Pick the right (u, v) source — derived cylindrical for waterfall+
  // spray, regular UV for the merged-mesh water surfaces.
  const u = (kind === "waterfall" || kind === "spray") ? cylU : uv().x;
  const v = (kind === "waterfall" || kind === "spray") ? cylV : uv().y;

  // === Fresnel — brighter at silhouette ===
  // dot(view dir, normal) → close to 1 when looking at face head-on,
  // close to 0 when grazing. Invert + pow for falloff.
  const cosTheta = abs(normalView.dot(positionViewDirection));
  const fresnel = pow(oneMinus(cosTheta), float(2.0));

  const isFall = kind === "waterfall" || kind === "spray";

  if (isFall) {
    // ============================================================
    // WATERFALL: wide soft blobs flowing down + foam at base
    // (closer to jordan-breton's painterly fluid look than thin
    // striped streamers — fewer, wider, softer)
    // ============================================================
    const N_BLOBS = 6;  // was 18 — fewer, much wider blobs
    const blobIdx = floor(u.mul(N_BLOBS));
    const blobHash = hash(blobIdx);

    // Soft blob envelope around the cylinder. cos centres each blob in
    // its band; smoothstep gives soft fades at the edges (no sharp
    // pow() crisping — that's what made the previous look stripey).
    const bandPhase = u.mul(N_BLOBS).mul(Math.PI * 2);
    const blobRaw = cos(bandPhase).mul(0.5).add(0.5);
    // Soft falloff: smoothstep widens the blob centres + fades edges
    const blobMask = smoothstep(float(0.15), float(0.85), blobRaw);

    // Each blob has its own random vertical phase + speed scale
    const fallSpeed = float(2.0);
    const blobSpeedJitter = blobHash.mul(0.6).add(0.7); // 0.7-1.3 speed range
    const scrolledV = v.add(t.mul(fallSpeed).mul(blobSpeedJitter)).add(blobHash.mul(3.0));

    // Two octaves for the blob's vertical brightness pulse:
    //  - low freq (5): big slow on/off cycle
    //  - mid freq (12): wider "patch" inside the blob
    const slow = sin(scrolledV.mul(5)).mul(0.5).add(0.5);
    const med = sin(scrolledV.mul(12).add(t.mul(1.5))).mul(0.5).add(0.5);
    const blobPulse = slow.mul(0.6).add(med.mul(0.4));

    // Combined blob intensity — soft edges + smooth pulse
    const blob = blobMask.mul(blobPulse);

    // === Wider foam patches (not pixel-sparse bursts) ===
    const foamSeedU = floor(u.mul(15));
    const foamSeedV = floor(v.mul(8).sub(t.mul(1.2)));
    const foamSeed = foamSeedU.add(foamSeedV.mul(15));
    const foamRand = hash(foamSeed);
    const foamPatch = smoothstep(float(0.70), float(0.95), foamRand);
    // Modulate foam by blob mask so foam appears mostly on/near blobs
    const foam = foamPatch.mul(blobMask.add(0.3));

    // === Bottom-glow accent: brighten the base of the waterfall
    // where the water hits the pool, mimicking the foam cluster ===
    const bottomGlow = smoothstep(float(0.15), float(0.0), v);

    // === Colour mix (3-stop palette) ===
    const baseBlue = vec3(0.10, 0.30, 0.65);      // semi-transparent base
    const blobBlue = vec3(0.55, 0.80, 1.10);      // bright cyan
    const foamColor = vec3(1.00, 1.05, 1.10);     // white foam

    let color = mix(baseBlue, blobBlue, blob.mul(0.85));
    color = mix(color, foamColor, foam.mul(0.7));
    // Fresnel rim: brighter at silhouette so the blob shapes pop
    color = mix(color, blobBlue.mul(1.3), fresnel.mul(0.40));
    // Bottom glow — extra white at the impact point
    color = mix(color, foamColor, bottomGlow.mul(0.6));

    // === Opacity: see-through between blobs, opaque on blob cores ===
    const alphaMix = clamp(
      blobMask.mul(0.55).add(foam.mul(0.35)).add(fresnel.mul(0.40)).add(bottomGlow.mul(0.5)),
      float(0), float(1)
    );
    const alpha = mix(float(0.45), float(0.98), alphaMix);

    mat.colorNode = color;
    mat.emissiveNode = color.mul(0.6);
    mat.opacityNode = alpha;
    mat.transparent = true;
    mat.depthWrite = false;
    mat.side = THREE.DoubleSide;
  } else if (kind === "creek") {
    // ============================================================
    // CREEK: gentle east-flowing surface with caustic glints
    // ============================================================
    const scroll = vec2(t.mul(0.35), float(0));
    const scrolledU = u.add(scroll.x);
    const wave1 = sin(scrolledU.mul(20).add(v.mul(8)).add(t.mul(1.5))).mul(0.5).add(0.5);
    const wave2 = sin(scrolledU.mul(50).add(t.mul(2.2))).mul(0.5).add(0.5);
    const causticMask = pow(wave1.mul(wave2), float(2.5));

    const baseBlue = vec3(0.04, 0.16, 0.45);
    const causticColor = vec3(0.65, 0.90, 1.20);
    const color = mix(baseBlue, causticColor, causticMask);

    mat.colorNode = color;
    mat.emissiveNode = color.mul(0.7);
    mat.opacityNode = mix(float(0.7), float(1.0), causticMask);
    mat.transparent = true;
    mat.depthWrite = false;
  } else {
    // ============================================================
    // PLUNGE POOL + TROUGH: concentric ripples from centre + caustics
    // ============================================================
    // Distance from UV centre (pool centre)
    const centeredU = u.sub(0.5);
    const centeredV = v.sub(0.5);
    const dist = centeredU.mul(centeredU).add(centeredV.mul(centeredV)).sqrt();

    // Concentric ripple rings, moving outward from centre
    const ripple = sin(dist.mul(40).sub(t.mul(4))).mul(0.5).add(0.5);
    const rippleSoft = pow(ripple, float(2.0));

    // Caustic glints: random hash-based bright spots that pop in/out
    const causticSeedU = floor(u.mul(35).add(t.mul(0.3)));
    const causticSeedV = floor(v.mul(35).sub(t.mul(0.4)));
    const causticSeed = causticSeedU.add(causticSeedV.mul(35));
    const causticRand = hash(causticSeed);
    const causticGlint = smoothstep(float(0.88), float(1.0), causticRand);

    // Foam patch around centre (where waterfall lands)
    const foamPatch = smoothstep(float(0.20), float(0.05), dist);

    const baseBlue = vec3(0.04, 0.15, 0.42);
    const rippleColor = vec3(0.25, 0.55, 1.00);
    const foamColor = vec3(0.95, 1.00, 1.05);

    let color = mix(baseBlue, rippleColor, rippleSoft.mul(0.65));
    color = mix(color, foamColor, causticGlint.mul(0.6));
    color = mix(color, foamColor, foamPatch.mul(0.7));

    mat.colorNode = color;
    mat.emissiveNode = color.mul(0.6);
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
      // 0.30 (was 0.55) — the previous value was amplifying any
      // pink-tinted baked pixels (basalt columns picking up magenta
      // sun) into bright pink hotspots that broke the dark-stone
      // read of the island. Lower intensity keeps the bake visible
      // without lighting up wrong-colour pixels.
      finalIntensity = 0.30;
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
