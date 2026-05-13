/** @format */

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { BackSide } from "three";
import { useFrame } from "@react-three/fiber";
import {
  positionLocal,
  uniform,
  mix,
  clamp,
  pow,
  select,
} from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";

/** Procedural neon-dusk skybox. TSL-authored radial gradient sphere
 *  rendered from the inside: deep-black zenith → saturated magenta
 *  horizon band → near-black ground. samsy.ninja-flavoured palette.
 *  No IBL contribution — `Lighting.tsx` provides the actual scene
 *  lighting. */
const ZENITH = "#0a0420";
const HORIZON = "#c11a6c";
const GROUND = "#020108";
const HORIZON_BAND = 0.1;

const Skybox: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Lock the skybox to follow the camera each frame so the gradient
  // always renders behind whatever the user is looking at, regardless
  // of how far they orbit. Without this, dragging the camera past the
  // sphere's 150m radius makes the user see the skybox from OUTSIDE —
  // a dark sphere wedge against an empty backdrop with the magenta
  // band visible on the far interior wall.
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.copy(state.camera.position);
    }
  });

  const material = useMemo(() => {
    const uZenith = uniform(new THREE.Color(ZENITH));
    const uHorizon = uniform(new THREE.Color(HORIZON));
    const uGround = uniform(new THREE.Color(GROUND));
    const uHorizonBand = uniform(HORIZON_BAND);

    const dir = positionLocal.normalize();
    const y = dir.y;
    const tSky = pow(clamp(y.div(uHorizonBand), 0, 1), 0.55);
    const skyCol = mix(uHorizon, uZenith, tSky);
    const tGround = clamp(y.negate().mul(2.6), 0, 1);
    const groundCol = mix(uHorizon, uGround, tGround);
    const finalCol = select(y.greaterThanEqual(0), skyCol, groundCol);

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
