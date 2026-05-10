/** @format */

import React, { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { IDLE_CAMERA_LOOK, IDLE_CAMERA_POS } from "../sections.ts";

/**
 * Mutable rig inputs. Refs are mutated externally every frame; the rig pulls
 * them inside its own useFrame to avoid React re-renders for high-frequency
 * data (cursor parallax, idle counter, boot elapsed).
 */
export interface CameraRigInputs {
  focusTarget: THREE.Vector3 | null;
  focusLook: THREE.Vector3 | null;
  cursorNdcRef: React.MutableRefObject<{ x: number; y: number }>;
  idleTimeRef: React.MutableRefObject<number>;
  bootElapsedRef: React.MutableRefObject<number>;
  booting: boolean;
  scrollScrub: number | null;
  reducedMotion: boolean;
  dragYawRef: React.MutableRefObject<number>;
  dragPitchRef: React.MutableRefObject<number>;
}

interface CameraRigProps {
  inputs: CameraRigInputs;
}

/** Cubic ease */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const idlePos = new THREE.Vector3(...IDLE_CAMERA_POS);
const idleLook = new THREE.Vector3(...IDLE_CAMERA_LOOK);

/** B-roll spline: 4 keyframe positions for cinematic idle orbit. */
const B_ROLL_KEYS: { pos: [number, number, number]; look: [number, number, number] }[] = [
  { pos: [3, 2.4, 4],    look: [0, 0.6, 0] },
  { pos: [4.2, 1.6, 2.8],look: [0.4, 0.7, -0.3] },
  { pos: [3.8, 2.8, 1.2],look: [0.6, 0.9, -0.4] },
  { pos: [2.0, 3.2, 4.4],look: [-0.2, 0.8, -0.2] },
];

function lerpKeys(
  keys: typeof B_ROLL_KEYS,
  t: number
): { pos: THREE.Vector3; look: THREE.Vector3 } {
  const total = keys.length;
  const f = (t % 1) * total;
  const i = Math.floor(f) % total;
  const j = (i + 1) % total;
  const local = f - i;
  const e = easeInOutCubic(local);
  const a = keys[i];
  const b = keys[j];
  return {
    pos: new THREE.Vector3(
      a.pos[0] + (b.pos[0] - a.pos[0]) * e,
      a.pos[1] + (b.pos[1] - a.pos[1]) * e,
      a.pos[2] + (b.pos[2] - a.pos[2]) * e
    ),
    look: new THREE.Vector3(
      a.look[0] + (b.look[0] - a.look[0]) * e,
      a.look[1] + (b.look[1] - a.look[1]) * e,
      a.look[2] + (b.look[2] - a.look[2]) * e
    ),
  };
}

const CameraRig: React.FC<CameraRigProps> = ({ inputs }) => {
  const { camera } = useThree();
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpLook = useMemo(() => new THREE.Vector3(), []);
  const lookAtRef = useRef(idleLook.clone());
  const dollyStartRef = useRef<number | null>(null);
  const dollyStartPosRef = useRef(new THREE.Vector3());
  const dollyStartLookRef = useRef(new THREE.Vector3());
  const lastFocusRef = useRef<THREE.Vector3 | null>(null);

  useFrame((s) => {
    const t = s.clock.elapsedTime;

    if (inputs.focusTarget && lastFocusRef.current !== inputs.focusTarget) {
      dollyStartRef.current = t;
      dollyStartPosRef.current.copy(camera.position);
      dollyStartLookRef.current.copy(lookAtRef.current);
      lastFocusRef.current = inputs.focusTarget;
    }
    if (!inputs.focusTarget) {
      lastFocusRef.current = null;
      dollyStartRef.current = null;
    }

    if (inputs.booting && !inputs.reducedMotion) {
      // Boot: start in extreme close-up just outside the central monitor bezel,
      // pull back to the idle position over 2.5s.
      const startPos = new THREE.Vector3(0, 1.1, -0.05);
      const startLook = new THREE.Vector3(0, 1.1, -0.7);
      const k = Math.min(1, inputs.bootElapsedRef.current / 2.5);
      const e = easeInOutCubic(k);
      tmpPos.lerpVectors(startPos, idlePos, e);
      tmpLook.lerpVectors(startLook, idleLook, e);
      camera.position.copy(tmpPos);
      lookAtRef.current.copy(tmpLook);
      camera.lookAt(lookAtRef.current);
      return;
    }

    if (inputs.focusTarget && inputs.focusLook) {
      const start = dollyStartRef.current ?? t;
      const k = Math.min(1, (t - start) / 0.7);
      const e = easeInOutCubic(k);
      tmpPos.lerpVectors(dollyStartPosRef.current, inputs.focusTarget, e);
      tmpLook.lerpVectors(dollyStartLookRef.current, inputs.focusLook, e);
      camera.position.copy(tmpPos);
      lookAtRef.current.copy(tmpLook);
      camera.lookAt(lookAtRef.current);
      return;
    }

    if (inputs.scrollScrub !== null) {
      const scrub = lerpKeys(B_ROLL_KEYS, inputs.scrollScrub);
      camera.position.lerp(scrub.pos, 0.18);
      lookAtRef.current.lerp(scrub.look, 0.18);
      camera.lookAt(lookAtRef.current);
      return;
    }

    const idle = inputs.idleTimeRef.current;
    if (idle > 30 && !inputs.reducedMotion) {
      const phase = ((idle - 30) * 0.04) % 1;
      const k = lerpKeys(B_ROLL_KEYS, phase);
      camera.position.lerp(k.pos, 0.04);
      lookAtRef.current.lerp(k.look, 0.04);
      camera.lookAt(lookAtRef.current);
      return;
    }

    const ndc = inputs.cursorNdcRef.current;
    const parX = ndc.x * 0.18;
    const parY = ndc.y * 0.12;

    // Drag-orbit: rotate the idle position around idleLook (turntable).
    const yaw = inputs.dragYawRef.current;
    const pitch = inputs.dragPitchRef.current;
    const offset = idlePos.clone().sub(idleLook);
    const radius = offset.length();
    const baseTheta = Math.atan2(offset.x, offset.z);
    const basePhi = Math.acos(offset.y / radius);
    const theta = baseTheta + yaw;
    const phi = THREE.MathUtils.clamp(
      basePhi + pitch,
      0.25,
      Math.PI * 0.55
    );
    const orbit = new THREE.Vector3(
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.cos(theta)
    )
      .multiplyScalar(radius)
      .add(idleLook);

    tmpPos.set(orbit.x + parX, orbit.y + parY, orbit.z);
    camera.position.lerp(tmpPos, 0.06);
    lookAtRef.current.lerp(idleLook, 0.06);
    camera.lookAt(lookAtRef.current);
  });

  return null;
};

export default CameraRig;
