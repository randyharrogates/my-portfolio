/** @format */

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { HallTargetId, HallTargetPose } from "../sections.ts";

interface CameraDirectorProps {
  /** Resolved table of every named target the camera can fly to. */
  targets: Record<HallTargetId, HallTargetPose>;
  /** Which target the camera is currently moving toward / resting on. */
  active: HallTargetId;
  /** Optional intermediate waypoints traversed during the next fly. When set,
   *  the camera flies through these poses (in order) before landing on the
   *  active target. Used by the door-intro sequence. */
  flyWaypoints?: HallTargetPose[];
  /** True for the rare cases (reduced-motion, mobile boot) where we should
   *  hard-cut to the target instead of flying. */
  hardCut?: boolean;
  /** Disable idle orbit (e.g. boot sequence is animating, or the user is
   *  hovering an arch). */
  idleOrbitDisabled?: boolean;
  /** Enable user drag-to-orbit. Defaults false so callers must opt in. */
  dragEnabled?: boolean;
  /** Fly duration in seconds. Default 1.2s (cinematic but not sluggish). */
  flyDuration?: number;
}

const DEFAULT_FLY_DURATION = 1.2;

const DRAG_SENS_MOUSE = 0.005;
const DRAG_SENS_TOUCH = 0.008;
const DRAG_THRESHOLD_PX = 3;

const DEG = Math.PI / 180;
const HUB_PHI_MIN = Math.PI / 2 - 50 * DEG;
const HUB_PHI_MAX = Math.PI / 2 + 15 * DEG;
const ALCOVE_YAW_LIMIT = 15 * DEG;
const ALCOVE_PITCH_LIMIT = 10 * DEG;

/** cubic ease-in-out — feels more cinematic than smoothstep at this duration. */
function cubicInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function poseOffsetSpherical(pose: HallTargetPose, target: THREE.Spherical): void {
  const dx = pose.position[0] - pose.lookAt[0];
  const dy = pose.position[1] - pose.lookAt[1];
  const dz = pose.position[2] - pose.lookAt[2];
  target.setFromCartesianCoords(dx, dy, dz);
}

/** N-target camera director with B-spline path interpolation + drag-orbit.
 *
 *  Behaviour:
 *  - On target change, builds a fly path (single arched Bezier or Catmull-Rom
 *    polyline when waypoints are supplied) and tweens t from 0 → 1 with
 *    cubic ease-in-out over `flyDuration` seconds.
 *  - When `dragEnabled`, mouse/touch drag on the canvas rotates the camera
 *    around the current target's lookAt point. Offsets persist across idle
 *    frames and are reset whenever a new fly begins (so the canonical pose
 *    is the destination of every fly).
 *  - At idle on the hub, a slow yaw drift continues on top of any user
 *    drag offset. Other targets have no idle drift.
 *  - hardCut bypasses the spline (snap to target).
 */
const CameraDirector: React.FC<CameraDirectorProps> = ({
  targets,
  active,
  flyWaypoints,
  hardCut = false,
  idleOrbitDisabled = false,
  dragEnabled = false,
  flyDuration = DEFAULT_FLY_DURATION,
}) => {
  const { camera, gl } = useThree();
  const lookAtRef = useRef(new THREE.Vector3());

  const animRef = useRef<{
    active: boolean;
    elapsed: number;
    duration: number;
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    midPos: THREE.Vector3;
    fromLook: THREE.Vector3;
    toLook: THREE.Vector3;
    fromFov: number;
    toFov: number;
    posCurve: THREE.CatmullRomCurve3 | null;
    lookCurve: THREE.CatmullRomCurve3 | null;
  }>({
    active: false,
    elapsed: 0,
    duration: flyDuration,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    midPos: new THREE.Vector3(),
    fromLook: new THREE.Vector3(),
    toLook: new THREE.Vector3(),
    fromFov: 46,
    toFov: 46,
    posCurve: null,
    lookCurve: null,
  });

  // Per-target offset bookkeeping. Idle-yaw drifts the camera around the hub.
  // userYaw / userPitch are accumulated drag deltas (radians) applied on top.
  const orbitRef = useRef({ idleYaw: 0, userYaw: 0, userPitch: 0 });
  // Remembers the last (active, waypoints) pair we kicked off a fly for, so
  // we don't re-fly when only the waypoints prop clears.
  const lastFlyKeyRef = useRef<{
    active: HallTargetId;
    waypoints: HallTargetPose[] | null;
  }>({ active, waypoints: null });
  // Live drag state — mutated by raw pointer event listeners.
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startUserYaw: 0,
    startUserPitch: 0,
    pointerId: -1,
    pointerType: "" as "mouse" | "touch" | "pen" | "",
  });

  const targetPose = targets[active];

  // Mount-time snap.
  useEffect(() => {
    const p = targetPose;
    camera.position.set(p.position[0], p.position[1], p.position[2]);
    lookAtRef.current.set(p.lookAt[0], p.lookAt[1], p.lookAt[2]);
    camera.lookAt(lookAtRef.current);
    if (p.fov && "fov" in camera) {
      (camera as THREE.PerspectiveCamera).fov = p.fov;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger a new fly whenever active / waypoints change.
  useEffect(() => {
    const pose = targets[active];
    if (hardCut) {
      camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
      lookAtRef.current.set(pose.lookAt[0], pose.lookAt[1], pose.lookAt[2]);
      camera.lookAt(lookAtRef.current);
      if (pose.fov && "fov" in camera) {
        (camera as THREE.PerspectiveCamera).fov = pose.fov;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }
      animRef.current.active = false;
      orbitRef.current = { idleYaw: 0, userYaw: 0, userPitch: 0 };
      lastFlyKeyRef.current = { active, waypoints: flyWaypoints ?? null };
      return;
    }

    // Skip when nothing meaningful changed — guards against spurious re-flies
    // when only the waypoints prop transitions back to undefined.
    const prev = lastFlyKeyRef.current;
    const activeChanged = prev.active !== active;
    const waypointsNewlySet = !!flyWaypoints && prev.waypoints !== flyWaypoints;
    if (!activeChanged && !waypointsNewlySet) {
      lastFlyKeyRef.current = { active, waypoints: flyWaypoints ?? null };
      return;
    }
    lastFlyKeyRef.current = { active, waypoints: flyWaypoints ?? null };

    const a = animRef.current;
    a.fromPos.copy(camera.position);
    a.toPos.set(pose.position[0], pose.position[1], pose.position[2]);
    a.fromLook.copy(lookAtRef.current);
    a.toLook.set(pose.lookAt[0], pose.lookAt[1], pose.lookAt[2]);

    if (flyWaypoints && flyWaypoints.length > 0) {
      // Polyline fly — Catmull-Rom through every waypoint plus terminal points.
      const positions: THREE.Vector3[] = [a.fromPos.clone()];
      const lookAts: THREE.Vector3[] = [a.fromLook.clone()];
      for (const wp of flyWaypoints) {
        positions.push(new THREE.Vector3(wp.position[0], wp.position[1], wp.position[2]));
        lookAts.push(new THREE.Vector3(wp.lookAt[0], wp.lookAt[1], wp.lookAt[2]));
      }
      positions.push(a.toPos.clone());
      lookAts.push(a.toLook.clone());
      a.posCurve = new THREE.CatmullRomCurve3(positions, false, "centripetal", 0.5);
      a.lookCurve = new THREE.CatmullRomCurve3(lookAts, false, "centripetal", 0.5);
    } else {
      // Single-target fly — arched midpoint Bezier (existing behaviour).
      a.posCurve = null;
      a.lookCurve = null;
      a.midPos.copy(a.fromPos).lerp(a.toPos, 0.5);
      a.midPos.y += Math.min(2.0, a.fromPos.distanceTo(a.toPos) * 0.15);
    }

    if ("fov" in camera) {
      a.fromFov = (camera as THREE.PerspectiveCamera).fov;
      a.toFov = pose.fov ?? a.fromFov;
    }
    a.elapsed = 0;
    a.duration = flyDuration;
    a.active = true;

    // Reset orbit offsets so the destination is the canonical pose.
    orbitRef.current = { idleYaw: 0, userYaw: 0, userPitch: 0 };
    // Drop any in-flight drag — fly takes priority.
    dragRef.current.active = false;
    dragRef.current.moved = false;
  }, [active, hardCut, flyDuration, targets, camera, targetPose, flyWaypoints]);

  // Pointer-based drag-to-orbit. Listens on the WebGL canvas, in the capture
  // phase so a confirmed drag can suppress R3F's subsequent click event.
  useEffect(() => {
    if (!dragEnabled) return;
    const el = gl.domElement;
    const drag = dragRef.current;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (animRef.current.active) return;
      drag.active = true;
      drag.moved = false;
      drag.startX = e.clientX;
      drag.startY = e.clientY;
      drag.startUserYaw = orbitRef.current.userYaw;
      drag.startUserPitch = orbitRef.current.userPitch;
      drag.pointerId = e.pointerId;
      drag.pointerType = e.pointerType as "mouse" | "touch" | "pen";
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* setPointerCapture can throw if pointer is not captureable; ignore */
      }
    };

    const applyDrag = (e: PointerEvent) => {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!drag.moved) {
        const d = Math.hypot(dx, dy);
        if (d < DRAG_THRESHOLD_PX) return;
        drag.moved = true;
      }
      const sens = drag.pointerType === "touch" ? DRAG_SENS_TOUCH : DRAG_SENS_MOUSE;
      let yaw = drag.startUserYaw + dx * sens;
      let pitch = drag.startUserPitch + dy * sens;

      if (active === "hub") {
        // Yaw free 360°. Pitch absolute-clamped relative to canonical phi.
        const canonical = new THREE.Spherical();
        poseOffsetSpherical(targets[active], canonical);
        pitch = THREE.MathUtils.clamp(
          pitch,
          HUB_PHI_MIN - canonical.phi,
          HUB_PHI_MAX - canonical.phi
        );
      } else {
        yaw = THREE.MathUtils.clamp(yaw, -ALCOVE_YAW_LIMIT, ALCOVE_YAW_LIMIT);
        pitch = THREE.MathUtils.clamp(pitch, -ALCOVE_PITCH_LIMIT, ALCOVE_PITCH_LIMIT);
      }
      orbitRef.current.userYaw = yaw;
      orbitRef.current.userPitch = pitch;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drag.active || e.pointerId !== drag.pointerId) return;
      if (animRef.current.active) {
        drag.active = false;
        return;
      }
      applyDrag(e);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!drag.active || e.pointerId !== drag.pointerId) return;
      const wasDragging = drag.moved;
      drag.active = false;
      drag.moved = false;
      drag.pointerId = -1;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (wasDragging) {
        // Stop the synthetic click that R3F would otherwise fire on alcoves.
        e.stopImmediatePropagation();
      }
    };

    el.addEventListener("pointerdown", onPointerDown, { capture: true });
    el.addEventListener("pointermove", onPointerMove, { capture: true });
    el.addEventListener("pointerup", onPointerUp, { capture: true });
    el.addEventListener("pointercancel", onPointerUp, { capture: true });
    return () => {
      el.removeEventListener("pointerdown", onPointerDown, { capture: true } as EventListenerOptions);
      el.removeEventListener("pointermove", onPointerMove, { capture: true } as EventListenerOptions);
      el.removeEventListener("pointerup", onPointerUp, { capture: true } as EventListenerOptions);
      el.removeEventListener("pointercancel", onPointerUp, { capture: true } as EventListenerOptions);
    };
  }, [gl, dragEnabled, active, targets]);

  // Re-usable temporaries — created once outside useFrame to avoid GC churn.
  const tmpA = useMemo(() => new THREE.Vector3(), []);
  const tmpB = useMemo(() => new THREE.Vector3(), []);
  const tmpLook = useMemo(() => new THREE.Vector3(), []);
  const tmpSph = useMemo(() => new THREE.Spherical(), []);
  const tmpCanonical = useMemo(() => new THREE.Spherical(), []);
  const tmpCurve = useMemo(() => new THREE.Vector3(), []);

  useFrame((_state, delta) => {
    const a = animRef.current;

    if (a.active) {
      a.elapsed += delta;
      const raw = Math.min(1, a.elapsed / a.duration);
      const t = cubicInOut(raw);

      if (a.posCurve && a.lookCurve) {
        a.posCurve.getPoint(t, tmpCurve);
        camera.position.copy(tmpCurve);
        a.lookCurve.getPoint(t, tmpCurve);
        lookAtRef.current.copy(tmpCurve);
      } else {
        // Quadratic Bezier via two lerps — equivalent to a single-control-point
        // spline. Lifts the camera through an arched midpoint.
        tmpA.lerpVectors(a.fromPos, a.midPos, t);
        tmpB.lerpVectors(a.midPos, a.toPos, t);
        camera.position.lerpVectors(tmpA, tmpB, t);
        lookAtRef.current.lerpVectors(a.fromLook, a.toLook, t);
      }
      camera.lookAt(lookAtRef.current);

      if ("fov" in camera) {
        const cam = camera as THREE.PerspectiveCamera;
        cam.fov = a.fromFov + (a.toFov - a.fromFov) * t;
        cam.updateProjectionMatrix();
      }

      if (raw >= 1) a.active = false;
      return;
    }

    // Idle frame — apply idle-orbit drift + user-drag offsets on top of the
    // canonical pose for the current target.
    const pose = targets[active];
    const orbit = orbitRef.current;

    if (active === "hub" && !idleOrbitDisabled && !dragRef.current.active) {
      orbit.idleYaw += delta * 0.045;
    }

    poseOffsetSpherical(pose, tmpCanonical);
    tmpSph.copy(tmpCanonical);
    tmpSph.theta += orbit.idleYaw + orbit.userYaw;
    tmpSph.phi += orbit.userPitch;

    if (active === "hub") {
      tmpSph.phi = THREE.MathUtils.clamp(tmpSph.phi, HUB_PHI_MIN, HUB_PHI_MAX);
    } else {
      tmpSph.phi = THREE.MathUtils.clamp(
        tmpSph.phi,
        tmpCanonical.phi - ALCOVE_PITCH_LIMIT,
        tmpCanonical.phi + ALCOVE_PITCH_LIMIT
      );
      let dTheta = tmpSph.theta - tmpCanonical.theta;
      // Wrap to [-pi, pi] before clamping so wrap-around doesn't blow out the limit.
      dTheta = ((dTheta + Math.PI) % (Math.PI * 2)) - Math.PI;
      dTheta = THREE.MathUtils.clamp(dTheta, -ALCOVE_YAW_LIMIT, ALCOVE_YAW_LIMIT);
      tmpSph.theta = tmpCanonical.theta + dTheta;
    }

    tmpLook.set(pose.lookAt[0], pose.lookAt[1], pose.lookAt[2]);
    tmpA.setFromSpherical(tmpSph);
    camera.position.copy(tmpLook).add(tmpA);
    lookAtRef.current.copy(tmpLook);
    camera.lookAt(tmpLook);
  });

  return null;
};

export default CameraDirector;
