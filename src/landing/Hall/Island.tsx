/** @format */

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { MeshStandardNodeMaterial } from "three/webgpu";
import {
  float,
  mix,
  mx_fractal_noise_float,
  positionWorld,
  smoothstep,
  vec3,
} from "three/tsl";
import { useKTX2Compat } from "./useKTX2Compat.ts";

const ISLAND_HUB_GLB = `${process.env.PUBLIC_URL}/models/hall/island-hub.glb`;
const BASIS_PATH = `${process.env.PUBLIC_URL}/basis/`;
const ISLAND_AO_KTX2 = `${process.env.PUBLIC_URL}/textures/hall/baked/ao/island-hub.ktx2`;
const ISLAND_LM_KTX2 = `${process.env.PUBLIC_URL}/textures/hall/baked/lightmap/island-hub.ktx2`;
useGLTF.preload(ISLAND_HUB_GLB);

/** Hub island — floating rock platter, archipelago centerpiece. GLB
 *  geometry + Cycles-baked AO (1024², ~100 KB KTX2) + Cycles-baked
 *  lightmap (1024², ~93 KB KTX2). Both maps share UV channel 1.
 *
 *  AO darkens the displaced rock crevices when the runtime IBL hits the
 *  surface. Lightmap encodes the offline daylight bake (HOSEK sky + warm
 *  sun key from above-right) — a pre-shaded layer that multiplies into
 *  the diffuse, giving the dark rock subtle warmth on the rim and a
 *  cooler fall-off on the spire underside that pure runtime IBL wouldn't
 *  capture cheaply.
 *
 *  Island top face rests at world y = 0; rock extends ~30 m outward and
 *  ~18 m below. */
const Island: React.FC = () => {
  const { scene } = useGLTF(ISLAND_HUB_GLB) as unknown as {
    scene: THREE.Group;
  };
  const aoMap = useKTX2Compat(ISLAND_AO_KTX2, BASIS_PATH);
  const lightMap = useKTX2Compat(ISLAND_LM_KTX2, BASIS_PATH);

  const rockMaterial = useMemo(() => {
    // 2026-05-15 evening (palette revision — "real ground, not flat
    // disc", v2): replaced the camouflage-grid sin/cos noise pattern
    // with proper MaterialX fractal Perlin noise (mx_fractal_noise_float)
    // so the colour patches blob irregularly instead of repeating in a
    // visible grid. 4-stop palette stays harmonised with dark earthy
    // landmark base-plates. Sharper smoothstep thresholds give DISTINCT
    // patches rather than blended averages.
    void aoMap; void lightMap;

    const moss = vec3(0.30, 0.38, 0.24);   // #4d614d mossy green
    const dirt = vec3(0.35, 0.26, 0.16);   // #594229 warm dirt
    const stone = vec3(0.34, 0.36, 0.34);  // #575c57 weathered slate
    const shadow = vec3(0.10, 0.14, 0.10); // #1a241a deep shadow moss

    // World-XZ position scaled — fractal noise samples ~6-8m blobs at
    // scale 0.08, octaves=3, lacunarity=2 gives a natural-looking
    // multi-frequency irregular pattern (no visible grid).
    const pos = positionWorld;
    // @ts-expect-error - TSL vec3 from positionWorld
    const samplePos = vec3(pos.x.mul(0.08), pos.y.mul(0.04), pos.z.mul(0.08));

    // Layer 1 — large patches (~8m): moss ↔ dirt dominant
    const n1 = mx_fractal_noise_float(samplePos, 3, 2.0, 0.55, 1.0);
    // @ts-expect-error
    const t1 = smoothstep(float(-0.35), float(0.35), n1);

    // Layer 2 — medium variation (~3m): stone patches at different offset
    // @ts-expect-error
    const samplePos2 = vec3(pos.x.mul(0.18).add(31.0), pos.y.mul(0.08), pos.z.mul(0.18).sub(17.0));
    const n2 = mx_fractal_noise_float(samplePos2, 2, 2.0, 0.5, 1.0);
    // @ts-expect-error
    const t2 = smoothstep(float(0.18), float(0.45), n2);

    // Layer 3 — small dark flecks (~1m): rare grit specks
    // @ts-expect-error
    const samplePos3 = vec3(pos.x.mul(0.55).sub(13.0), pos.y.mul(0.3), pos.z.mul(0.55).add(7.0));
    const n3 = mx_fractal_noise_float(samplePos3, 2, 2.5, 0.5, 1.0);
    // @ts-expect-error
    const t3 = smoothstep(float(0.30), float(0.55), n3);

    // Build the layered colour
    // @ts-expect-error - TSL mix
    let color = mix(moss, dirt, t1);
    // @ts-expect-error
    color = mix(color, stone, t2.mul(0.6));
    // @ts-expect-error
    color = mix(color, shadow, t3.mul(0.55));

    const mat = new MeshStandardNodeMaterial({
      color: new THREE.Color(0xffffff),
      roughness: 0.92,
      metalness: 0.02,
    });
    mat.colorNode = color;
    // Emissive matches the procedural pattern × 0.32 so patches
    // self-illuminate per-colour, not as a uniform overlay
    // @ts-expect-error
    mat.emissiveNode = color.mul(0.32);
    return mat;
  }, [aoMap, lightMap]);

  const cloned = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.material = rockMaterial;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });
    return root;
  }, [scene, rockMaterial]);

  // Phase 6 — hub island scaled up so each of the six themed
  // landmarks (house, satellite, waterfall, tree, garden, entrance)
  // has its own zone without crowding. Authored radius was ~28 m; at
  // 2.0× the platter spans ~56 m which lets the landmarks read as
  // distinct districts rather than props on a side-table. Rebuilding
  // the GLB at the larger native scale is a backlog item; for now the
  // displacement detail just reads bigger, which is fine for a
  // stylised look.
  return <primitive object={cloned} scale={2.0} />;
};

export default Island;
