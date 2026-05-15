/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { MeshStandardNodeMaterial } from "three/webgpu";
import { texture, uv, vec3 } from "three/tsl";

const LANDMARK_GLB = `${process.env.PUBLIC_URL}/models/hall/landmarks/landmark-skills.glb`;
useGLTF.preload(LANDMARK_GLB);

/** /skills landmark — AAA forge cave authored 2026-05-14 PM.
 *
 *  Replaces the old landmark-skills.glb (which had skl_ground_merged
 *  with upper-island blob, skl_organics_merged with basalt-hex columns,
 *  skl_river_v2, skl_plunge_pool_v2, and the 3-tier mini-waterfall).
 *  All those have been redesigned around: a rocky outcrop with carved
 *  cave (skl_forge_outcrop), and inside the cave a smithy with PBR-
 *  textured forge platform, anvil, hammer, sword (vibranium-magenta
 *  emissive edge), glowing coals, and terminal pedestal.
 *
 *  Polyhaven 2K PBR texture sets used:
 *   - aerial_rocks_02 → cave walls / outcrop
 *   - castle_wall_slates → forge platform + pedestal base
 *   - metal_plate_02 → anvil + hammer head (full metal PBR)
 *   - fine_grained_wood → hammer handle
 *   - Custom Principled BSDF → sword blade (polished steel + magenta
 *     emission), coals (charcoal + orange emission), pedestal screen
 *     (dark + cyan emission)
 *
 *  Forge geometry sits at landmark-local ~(9, -0.5, -8); cave opening
 *  faces NE. When mounted at HALL_POI_POSITIONS[2], the cave entrance
 *  reads from the orbital camera angle and the orb hovers above the
 *  anvil inside. */
function convertToNodeMaterials(root: THREE.Group) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return;
    const src = mesh.material as THREE.MeshStandardMaterial;
    if (!src) return;

    const srcEmissive = src.emissive ?? new THREE.Color(0, 0, 0);
    const emissionMagnitude = Math.max(srcEmissive.r, srcEmissive.g, srcEmissive.b);
    const hasAuthoredEmission = emissionMagnitude > 0.02;
    const hasBaseTexture = !!src.map;

    // Build the TSL node material preserving every PBR map from the
    // GLB. The new forge interior ships with proper Polyhaven 2K
    // diffuse + normal + roughness (+ metallic for the anvil/hammer)
    // baked into the GLB — we want them all to make it to the runtime
    // shader so the AAA PBR look survives.
    const nodeMat = new MeshStandardNodeMaterial({
      color: src.color.clone(),
      roughness: src.roughness,
      metalness: src.metalness,
      emissive: hasAuthoredEmission ? srcEmissive.clone() : new THREE.Color(0, 0, 0),
      emissiveIntensity: hasAuthoredEmission ? (emissionMagnitude >= 0.4 ? 5.0 : 2.0) : 0,
      transparent: src.transparent,
      opacity: src.opacity,
      side: src.side,
    });
    if (src.map) {
      nodeMat.map = src.map;
      // Baseline self-emission at 0.30 for textured rocks so they read
      // against the dim neon-dusk scene (mirrors AboutLandmark recipe).
      // Skip for explicitly emissive surfaces — they have their own glow.
      if (!hasAuthoredEmission) {
        const colorSample = texture(src.map, uv());
        // 2026-05-14 PM (cliff aesthetic pass): the cliff outcrop ships
        // with Polyhaven aerial_rocks_02 PBR — photoreal warm brown that
        // clashes with the neon-dusk archipelago palette. Dark blue-purple
        // tint pulls it toward the Projects-landmark mountain palette so
        // the /skills cliff reads as the same stylised faceted rock
        // language rather than a photoscanned mismatch.
        if (mesh.name === "skl_forge_outcrop" || mesh.name.startsWith("skl_boulder")) {
          const tint = vec3(0.30, 0.28, 0.42);
          // @ts-expect-error - TSL node arithmetic
          const tinted = colorSample.mul(tint);
          nodeMat.colorNode = tinted;
          // @ts-expect-error - TSL node arithmetic
          nodeMat.emissiveNode = tinted.mul(0.20);
        } else {
          nodeMat.colorNode = colorSample;
          // @ts-expect-error - TSL node arithmetic
          nodeMat.emissiveNode = colorSample.mul(0.30);
        }
      }
    }
    if (src.normalMap) {
      nodeMat.normalMap = src.normalMap;
      if (src.normalScale) nodeMat.normalScale = src.normalScale.clone();
    }
    if (src.roughnessMap) nodeMat.roughnessMap = src.roughnessMap;
    if (src.metalnessMap) nodeMat.metalnessMap = src.metalnessMap;
    if (src.aoMap) nodeMat.aoMap = src.aoMap;
    if (src.emissiveMap) nodeMat.emissiveMap = src.emissiveMap;

    mesh.material = nodeMat;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
}

interface SkillsLandmarkProps {
  position: [number, number, number];
}

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
