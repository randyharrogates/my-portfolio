/** @format */

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { BackSide } from "three";
import { useFrame } from "@react-three/fiber";
import {
  cos,
  float,
  mix,
  positionLocal,
  pow,
  sin,
  smoothstep,
  uniform,
} from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";

/** Genshin Sumeru cyan-magic-night painted sky (locked 2026-05-15).
 *
 *  Replaces the prior dim-dusk + Path-A "softer royal-purple zenith"
 *  gradient with a painterly 3-stop palette + painted cumulus cloud
 *  layer. Stops:
 *
 *    ZENITH  — deep cyan-magic indigo  (top of dome)
 *    HORIZON — luminous cyan-magic band (Sumeru bioluminescent horizon)
 *    GROUND  — soft warm-rose hint     (subtle ground bounce tint)
 *
 *  Painted clouds are procedurally generated (two-octave low-frequency
 *  sin/cos blobs in world-direction space) so they look hand-painted
 *  rather than photoreal. Cloud tint sits between ZENITH and HORIZON so
 *  they read as part of the painted sky, never as photoreal alpha cards.
 *
 *  No IBL contribution beyond what `SkyEnvMap.ts` bakes — Lighting.tsx
 *  provides the actual scene shading.
 *
 *  Stops are mirrored in `SkyEnvMap.ts`. Update both together.
 */
const ZENITH = "#1c2b5e";   // deep cyan-magic indigo
const HORIZON = "#46c8d8";  // luminous cyan-magic band
const GROUND = "#3a2d44";   // warm rose-violet ground tint
const HORIZON_BAND = 0.18;
const CLOUD_TINT = "#9fe6f0";

const Skybox: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.copy(state.camera.position);
    }
  });

  const material = useMemo(() => {
    const uZenith = uniform(new THREE.Color(ZENITH));
    const uHorizon = uniform(new THREE.Color(HORIZON));
    const uGround = uniform(new THREE.Color(GROUND));
    const uCloudTint = uniform(new THREE.Color(CLOUD_TINT));
    const uHorizonBand = uniform(HORIZON_BAND);

    const dir = positionLocal.normalize();
    const y = dir.y;

    // === 3-stop gradient: HORIZON → ZENITH above, HORIZON → GROUND below.
    // Pow 0.55 keeps the band concentrated near the horizon.
    const tSky = pow(
      smoothstep(float(0.0), uHorizonBand, y),
      0.55,
    );
    const skyCol = mix(uHorizon, uZenith, tSky);
    const tGround = smoothstep(float(0.0), float(0.45), y.negate());
    const groundCol = mix(uHorizon, uGround, tGround);
    // @ts-expect-error - TSL select via smoothstep blend at y=0 horizon
    const baseCol = mix(groundCol, skyCol, smoothstep(float(-0.02), float(0.02), y));

    // === Painted cumulus cloud layer — two low-frequency sin/cos octaves
    // in the upper hemisphere only. Stylised painted cards drifting in
    // the painted sky, not photoreal alpha sprites.
    const cloudBand = smoothstep(float(0.05), float(0.55), y);
    // @ts-expect-error - dir.x/.z TSL nodes
    const noise1 = sin(dir.x.mul(3.6)).mul(cos(dir.z.mul(2.8)));
    // @ts-expect-error
    const noise2 = sin(dir.x.mul(7.2).add(1.1)).mul(cos(dir.z.mul(5.5).sub(0.4)));
    // @ts-expect-error
    const cloudNoise = noise1.mul(0.55).add(noise2.mul(0.45));
    // @ts-expect-error - remap to [0,1] + smoothstep into painted band
    const cloudMask = smoothstep(float(0.25), float(0.65), cloudNoise.mul(0.5).add(0.5))
      .mul(cloudBand);
    // @ts-expect-error - paint cloud tint into base sky
    const finalCol = mix(baseCol, uCloudTint, cloudMask.mul(0.55));

    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = finalCol;
    mat.side = BackSide;
    mat.depthWrite = false;
    mat.depthTest = false;
    mat.fog = false;
    return mat;
  }, []);

  return (
    <mesh ref={meshRef} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[150, 32, 16]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

export default Skybox;
