/** @format */

import React, { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { buildStylizedWater, buildStylizedFoam } from "./stylizedWater.ts";

const MODEL_PATH = `${process.env.PUBLIC_URL}/models/hall/connections.glb`;
useGLTF.preload(MODEL_PATH);

/** Cross-landmark cartoon-water layer authored in `blender/hall-master.blend`.
 *
 *  Locked 2026-05-15 (Genshin pivot): all water meshes inside
 *  `connections.glb` are routed through the cartoon `stylizedWater`
 *  shader — UV-scrolling cyan base + painted caustic noise + foam edges.
 *  Drops the prior AAA-stack mesh routing (river_bank / river_grass /
 *  river_pebble / river_bedrock / river_bush / river_boulder), drops the
 *  per-surface planar reflector pair, drops the wet-rock floor pass —
 *  Genshin water is a painted surface, not a refractive medium.
 *
 *  Mesh-name → material routing (matched case-insensitively):
 *    "_foam"                 → buildStylizedFoam — painted white edge ribbon
 *    "_back"                 → buildStylizedWater backMesh — translucent rear sheet
 *    "waterfall", "spillover" → vertical-down flow + splashAtBase band
 *    "river", "flow_channel"  → horizontal-east scroll
 *    "source_pool", "basin"   → radial-out scroll
 *    default                  → horizontal-east scroll
 *
 *  Non-water meshes (banks, grass, pebbles, bedrock, bushes, boulders
 *  authored under the photoreal target) are LEFT UNTOUCHED and ship with
 *  whatever material they carry out of the GLB — they will be re-baked
 *  for the Genshin look in Phase 3 of the pivot. */
const Connections: React.FC = () => {
  const gltf = useGLTF(MODEL_PATH) as unknown as { scene: THREE.Group };

  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useMemo(() => {
    scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!(m as unknown as { isMesh?: boolean }).isMesh) return;
      const name = m.name.toLowerCase();
      // Only retarget meshes belonging to the water system. Non-water
      // meshes keep their existing GLB material until they're re-baked
      // in Phase 3 of the pivot.
      const isWaterMesh =
        name.includes("water") ||
        name.includes("river") ||
        name.includes("waterfall") ||
        name.includes("spillover") ||
        name.includes("source_pool") ||
        name.includes("basin") ||
        name.includes("flow_channel") ||
        name.endsWith("_foam") ||
        name.endsWith("_back");
      if (!isWaterMesh) return;

      if (name.endsWith("_foam") || name.includes("_foam")) {
        const isImpact =
          name.includes("waterfall") ||
          name.includes("spillover") ||
          name.includes("impact");
        m.material = buildStylizedFoam({
          brightness: isImpact ? 1.45 : 1.2,
          pulseAmplitude: isImpact ? 0.4 : 0.3,
          scrollSpeed: isImpact ? 0.8 : 0.5,
        });
        m.castShadow = false;
        m.receiveShadow = false;
        m.renderOrder = 2;
        return;
      }

      if (name.endsWith("_back") || name.includes("_back")) {
        m.material = buildStylizedWater({
          flow: "vertical-down",
          tile: 1.4,
          scrollSpeed: 0.8,
          backMesh: true,
        });
        m.castShadow = false;
        m.receiveShadow = false;
        m.renderOrder = 1;
        return;
      }

      if (name.includes("waterfall") || name.includes("spillover")) {
        m.material = buildStylizedWater({
          flow: "vertical-down",
          tile: 1.4,
          scrollSpeed: 1.0,
          splashAtBase: true,
        });
      } else if (name.includes("source_pool") || name.includes("basin")) {
        m.material = buildStylizedWater({
          flow: "radial-out",
          tile: 1.6,
          scrollSpeed: 0.5,
        });
      } else if (name.includes("river") || name.includes("flow_channel")) {
        m.material = buildStylizedWater({
          flow: "horizontal-east",
          tile: 1.8,
          scrollSpeed: 0.7,
        });
      } else {
        m.material = buildStylizedWater({
          flow: "horizontal-east",
          tile: 1.6,
          scrollSpeed: 0.5,
        });
      }

      m.castShadow = false;
      m.receiveShadow = false;
      m.renderOrder = 1;
    });
  }, [scene]);

  return <primitive object={scene} position={[0, 0, 0]} />;
};

export default Connections;
