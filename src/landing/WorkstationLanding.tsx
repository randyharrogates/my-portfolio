/** @format */

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import HUD from "./HUD.tsx";
import Scene from "./Workstation/Scene.tsx";
import CameraRig, { type CameraRigInputs } from "./Workstation/CameraRig.tsx";
import Postprocessing from "./Workstation/Postprocessing.tsx";
import Audio from "./Workstation/Audio.tsx";
import EasterEgg from "./Workstation/EasterEgg.tsx";
import {
  SECTIONS,
  IDLE_CAMERA_POS,
  IDLE_CAMERA_LOOK,
  IDLE_CAMERA_POS_PORTRAIT,
  IDLE_CAMERA_LOOK_PORTRAIT,
  IDLE_CAMERA_FOV_LANDSCAPE,
  IDLE_CAMERA_FOV_PORTRAIT,
} from "./sections.ts";
import {
  useFidelityMode,
  useAudioMutedToggle,
  useReducedMotion,
  useDocumentHidden,
  useViewportAspect,
  isMobileViewport,
} from "./use-low-power.ts";
import { portfolioData } from "../data/portfolio.ts";

const PAPER = "#0c0b0a";
const ACCENT = "#e8632a";

const BOOT_KEY = "landing.bootSeen";

interface FpsSamplerProps {
  onSample: (fps: number) => void;
}

const FpsSampler: React.FC<FpsSamplerProps> = ({ onSample }) => {
  const lastRef = useRef(performance.now());
  useFrame(() => {
    const now = performance.now();
    const dt = now - lastRef.current;
    lastRef.current = now;
    if (dt > 0) onSample(1000 / dt);
  });
  return null;
};

interface CursorTrackerProps {
  ndcRef: React.MutableRefObject<{ x: number; y: number }>;
}

const CursorTracker: React.FC<CursorTrackerProps> = ({ ndcRef }) => {
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -((e.clientY / window.innerHeight) * 2 - 1);
      ndcRef.current.x = x;
      ndcRef.current.y = y;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [ndcRef]);
  return null;
};

const WorkstationLanding: React.FC = () => {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const hidden = useDocumentHidden();
  const aspect = useViewportAspect();
  const isPortrait = aspect < 1;
  const { mode, setMode, lowFidelity, reportFps } = useFidelityMode();
  const { muted: audioMuted, toggle: toggleAudio } = useAudioMutedToggle();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<THREE.Vector3 | null>(null);
  const [focusLook, setFocusLook] = useState<THREE.Vector3 | null>(null);
  const [flashAmount, setFlashAmount] = useState(0);
  const [paperFade, setPaperFade] = useState(0);
  const [konami, setKonami] = useState(false);
  const [matrixRain, setMatrixRain] = useState(false);
  const [scrollScrub, setScrollScrub] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [whooshTick, setWhooshTick] = useState(0);
  const [tickTick, setTickTick] = useState(0);

  // High-frequency refs (mutated, not setState)
  const cursorNdcRef = useRef({ x: 0, y: 0 });
  const idleTimeRef = useRef(0);
  const bootElapsedRef = useRef(0);
  const dragYawRef = useRef(0);
  const dragPitchRef = useRef(0);
  const dragRadiusRef = useRef(1);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, yaw: 0, pitch: 0 });
  const pointerDownRef = useRef(false);
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchStartDistRef = useRef(0);
  const pinchStartRadiusRef = useRef(1);
  const wasMultiRef = useRef(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [grabbing, setGrabbing] = useState(false);

  // Aspect-aware camera pose. Refs (not state) so CameraRig pulls live values
  // each frame and lerps smoothly into the new framing on resize/rotate.
  const idlePosRef = useRef(
    new THREE.Vector3(...(isPortrait ? IDLE_CAMERA_POS_PORTRAIT : IDLE_CAMERA_POS))
  );
  const idleLookRef = useRef(
    new THREE.Vector3(...(isPortrait ? IDLE_CAMERA_LOOK_PORTRAIT : IDLE_CAMERA_LOOK))
  );
  const fovRef = useRef(
    isPortrait ? IDLE_CAMERA_FOV_PORTRAIT : IDLE_CAMERA_FOV_LANDSCAPE
  );

  useEffect(() => {
    if (isPortrait) {
      idlePosRef.current.set(...IDLE_CAMERA_POS_PORTRAIT);
      idleLookRef.current.set(...IDLE_CAMERA_LOOK_PORTRAIT);
      fovRef.current = IDLE_CAMERA_FOV_PORTRAIT;
    } else {
      idlePosRef.current.set(...IDLE_CAMERA_POS);
      idleLookRef.current.set(...IDLE_CAMERA_LOOK);
      fovRef.current = IDLE_CAMERA_FOV_LANDSCAPE;
    }
  }, [isPortrait]);

  const [booting, setBooting] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return false;
    try {
      return !sessionStorage.getItem(BOOT_KEY);
    } catch {
      return false;
    }
  });

  const finishBoot = useCallback(() => {
    setBooting(false);
    try {
      sessionStorage.setItem(BOOT_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  // Boot timer — updates ref, not state
  useEffect(() => {
    if (!booting) return;
    let raf = 0;
    const start = performance.now();
    const step = () => {
      const e = (performance.now() - start) / 1000;
      bootElapsedRef.current = e;
      if (e > 2.5) {
        finishBoot();
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [booting, finishBoot]);

  // Idle timer — ref-based, no rerenders
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      idleTimeRef.current = Math.min(idleTimeRef.current + dt, 6000);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const reset = () => {
      idleTimeRef.current = 0;
    };
    window.addEventListener("mousemove", reset);
    window.addEventListener("keydown", reset);
    window.addEventListener("touchstart", reset);
    window.addEventListener("wheel", reset);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", reset);
      window.removeEventListener("keydown", reset);
      window.removeEventListener("touchstart", reset);
      window.removeEventListener("wheel", reset);
    };
  }, []);

  // Drag-orbit (single pointer) + pinch-dolly (two pointers). Listeners live
  // on the wrapper with setPointerCapture so a finger that drifts off the
  // bounding rect keeps streaming pointermove. Skipped during boot, focus
  // dolly, or scroll scrub so the rig only orbits in the idle branch.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const dist = (
      a: { x: number; y: number },
      b: { x: number; y: number }
    ) => Math.hypot(b.x - a.x, b.y - a.y);

    const onPointerDown = (e: PointerEvent) => {
      if (focusedId !== null || booting || scrollScrub !== null) return;
      // Capture only touch/pen so a finger that drifts off the wrapper keeps
      // streaming pointermove. Mouse capture would redirect pointerup away
      // from the canvas and break R3F's mesh click pipeline (bezel onClick).
      if (e.pointerType === "touch" || e.pointerType === "pen") {
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* setPointerCapture can throw if the element is detached — ignore */
        }
      }
      activePointersRef.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
      });
      const n = activePointersRef.current.size;

      if (n === 1) {
        pointerDownRef.current = true;
        isDraggingRef.current = false;
        dragStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          yaw: dragYawRef.current,
          pitch: dragPitchRef.current,
        };
      } else if (n === 2) {
        // Single → pinch transition: cancel any in-flight drag, baseline pinch.
        isDraggingRef.current = false;
        wasMultiRef.current = true;
        const [a, b] = Array.from(activePointersRef.current.values());
        pinchStartDistRef.current = dist(a, b);
        pinchStartRadiusRef.current = dragRadiusRef.current;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!activePointersRef.current.has(e.pointerId)) return;
      activePointersRef.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
      });
      const n = activePointersRef.current.size;

      if (n === 1 && pointerDownRef.current) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        if (!isDraggingRef.current && Math.abs(dx) + Math.abs(dy) > 4) {
          isDraggingRef.current = true;
          setGrabbing(true);
        }
        if (!isDraggingRef.current) return;
        const yaw = dragStartRef.current.yaw - dx * 0.005;
        const pitch = dragStartRef.current.pitch - dy * 0.004;
        dragYawRef.current = Math.max(
          -Math.PI / 3,
          Math.min(Math.PI / 3, yaw)
        );
        dragPitchRef.current = Math.max(-0.6, Math.min(0.4, pitch));
      } else if (n >= 2 && pinchStartDistRef.current > 0) {
        const [a, b] = Array.from(activePointersRef.current.values());
        const ratio = dist(a, b) / pinchStartDistRef.current;
        // Spreading fingers (ratio > 1) zooms in → smaller orbit radius.
        const next = pinchStartRadiusRef.current / ratio;
        dragRadiusRef.current = Math.max(0.6, Math.min(1.5, next));
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!activePointersRef.current.has(e.pointerId)) return;
      activePointersRef.current.delete(e.pointerId);
      const n = activePointersRef.current.size;

      if (n === 0) {
        pointerDownRef.current = false;
        setGrabbing(false);
        // Defer flag clear so the synthetic R3F monitor-click event sees the
        // drag/multi flag and bails out in handleClickSection.
        setTimeout(() => {
          isDraggingRef.current = false;
          wasMultiRef.current = false;
        }, 0);
      } else if (n === 1) {
        // Pinch ended with one finger remaining — re-arm drag baseline at
        // the surviving finger's position so further movement doesn't snap.
        const [last] = Array.from(activePointersRef.current.values());
        dragStartRef.current = {
          x: last.x,
          y: last.y,
          yaw: dragYawRef.current,
          pitch: dragPitchRef.current,
        };
        pointerDownRef.current = true;
        isDraggingRef.current = false;
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  }, [focusedId, booting, scrollScrub]);

  // Snap-back: when a monitor takes focus, decay the user's drag yaw/pitch to 0
  // and the pinch radius to 1 over the same window as the focus dolly so the
  // framing lands on-axis at the default distance.
  useEffect(() => {
    if (focusedId === null) return;
    const startYaw = dragYawRef.current;
    const startPitch = dragPitchRef.current;
    const startRadius = dragRadiusRef.current;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 700);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const decay = 1 - e;
      dragYawRef.current = startYaw * decay;
      dragPitchRef.current = startPitch * decay;
      dragRadiusRef.current = 1 + (startRadius - 1) * decay;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [focusedId]);

  useEffect(() => {
    let scrubVal = 0;
    let releaseTimer: ReturnType<typeof setTimeout> | null = null;
    const onWheel = (e: WheelEvent) => {
      if (focusedId) return;
      scrubVal = Math.min(1, Math.max(0, scrubVal + e.deltaY * 0.0008));
      setScrollScrub(scrubVal);
      if (releaseTimer) clearTimeout(releaseTimer);
      releaseTimer = setTimeout(() => {
        scrubVal = 0;
        setScrollScrub(null);
      }, 380);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      if (releaseTimer) clearTimeout(releaseTimer);
    };
  }, [focusedId]);

  useEffect(() => {
    const username = portfolioData.socials.github.split("/").pop();
    if (!username) return;
    fetch(`https://api.github.com/users/${username}`)
      .then((r) => r.json())
      .then((profile) => {
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
      })
      .catch(() => {});
  }, []);

  const handleHover = useCallback((id: string | null) => {
    setHoveredId((prev) => {
      if (prev !== id && id) setTickTick((t) => t + 1);
      return id;
    });
  }, []);

  const handleClickSection = useCallback(
    (id: string) => {
      if (isDraggingRef.current || wasMultiRef.current) return;
      const cfg = SECTIONS.find((s) => s.id === id);
      if (!cfg) return;
      const euler = new THREE.Euler(...cfg.rotation);
      const forward = new THREE.Vector3(0, 0, 1).applyEuler(euler);
      const monitorPos = new THREE.Vector3(...cfg.position);
      const targetPos = monitorPos
        .clone()
        .add(forward.clone().multiplyScalar(0.85));
      targetPos.y += 0.04;
      setFocusTarget(targetPos);
      setFocusLook(monitorPos);
      setFocusedId(id);
      setWhooshTick((t) => t + 1);

      let flashStart: number | null = null;
      let raf = 0;
      const step = (now: number) => {
        if (flashStart === null) flashStart = now;
        const e = now - flashStart;
        if (e < 700) {
          raf = requestAnimationFrame(step);
          return;
        }
        if (e < 900) {
          setFlashAmount(Math.min(1, (e - 700) / 200));
          raf = requestAnimationFrame(step);
          return;
        }
        if (e < 1150) {
          setPaperFade(Math.min(1, (e - 900) / 250));
          raf = requestAnimationFrame(step);
          return;
        }
        navigate(cfg.route);
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    },
    [navigate]
  );

  const handleCycleMode = useCallback(() => {
    const next = mode === "auto" ? "low" : mode === "low" ? "full" : "auto";
    setMode(next);
  }, [mode, setMode]);

  const handleKonami = useCallback(() => {
    setKonami(true);
    setMatrixRain(true);
    setTimeout(() => {
      setKonami(false);
      setMatrixRain(false);
    }, 6500);
  }, []);

  const rigInputs = useMemo<CameraRigInputs>(
    () => ({
      focusTarget,
      focusLook,
      cursorNdcRef,
      idleTimeRef,
      bootElapsedRef,
      booting,
      scrollScrub,
      reducedMotion,
      dragYawRef,
      dragPitchRef,
      dragRadiusRef,
      idlePosRef,
      idleLookRef,
      fovRef,
    }),
    [focusTarget, focusLook, booting, scrollScrub, reducedMotion, dragRadiusRef, idlePosRef, idleLookRef, fovRef]
  );

  const dpr: [number, number] = isMobileViewport()
    ? [1, 1]
    : lowFidelity
    ? [1, 1.0]
    : [1, 2.0];

  const frameloop = hidden ? "never" : "always";
  const ambientActive = !lowFidelity && !reducedMotion;

  return (
    <div
      className="landing-bleed"
      ref={wrapperRef}
      style={{ cursor: grabbing ? "grabbing" : "grab" }}
    >
      <Canvas
        dpr={dpr}
        gl={{
          antialias: !lowFidelity,
          powerPreference: lowFidelity ? "low-power" : "high-performance",
          alpha: false,
        }}
        shadows
        onCreated={({ gl }) => {
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
        camera={{
          position: isPortrait ? IDLE_CAMERA_POS_PORTRAIT : IDLE_CAMERA_POS,
          fov: isPortrait ? IDLE_CAMERA_FOV_PORTRAIT : IDLE_CAMERA_FOV_LANDSCAPE,
          near: 0.1,
          far: 100,
        }}
        frameloop={frameloop}
        style={{ background: PAPER, position: "absolute", inset: 0 }}
      >
        <AdaptiveDpr pixelated />
        <FpsSampler onSample={reportFps} />
        <CursorTracker ndcRef={cursorNdcRef} />
        <Suspense fallback={null}>
          <Scene
            hoveredId={hoveredId}
            setHoveredId={handleHover}
            onClickSection={handleClickSection}
            flashAmount={flashAmount}
            matrixRain={matrixRain}
            reducedMotion={reducedMotion}
            konami={konami}
            avatarUrl={avatarUrl}
            lowFidelity={lowFidelity}
            ambientActive={ambientActive}
          />
        </Suspense>
        <CameraRig inputs={rigInputs} />
        <Postprocessing
          enabled={!lowFidelity && !reducedMotion}
          focused={focusedId !== null}
        />
        <Audio
          muted={audioMuted}
          triggerWhoosh={whooshTick}
          triggerTick={tickTick}
        />
      </Canvas>

      <EasterEgg onTrigger={handleKonami} />

      <HUD
        mode={mode}
        effectiveLow={lowFidelity}
        onCycleMode={handleCycleMode}
        audioMuted={audioMuted}
        onToggleAudio={toggleAudio}
        bootSkippable={booting}
        onSkipBoot={finishBoot}
      />

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: PAPER,
          opacity: paperFade,
          pointerEvents: "none",
          transition: "opacity 60ms linear",
          zIndex: 5,
        }}
      />

      {hoveredId && (
        <div
          style={{
            position: "absolute",
            bottom: 56,
            left: 18,
            color: ACCENT,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 12,
            letterSpacing: 0.5,
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          → enter {hoveredId}
        </div>
      )}
    </div>
  );
};

export default WorkstationLanding;
