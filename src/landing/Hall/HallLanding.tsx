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
import { useLocation, useNavigate } from "react-router-dom";
import Scene from "./Scene.tsx";
import CameraDirector from "./CameraDirector.tsx";
import Postprocessing from "./Postprocessing.tsx";
import HUDOverlay from "./HUDOverlay.tsx";
import Map from "./Map.tsx";
import HallAudio from "./HallAudio.tsx";
import {
  HALL_ALCOVE_ORDER,
  HALL_BOOT_POSE,
  HALL_DOOR_POSE,
  HALL_DOORWAY_POSE,
  HALL_HALLWAY_WAYPOINT,
  buildHallTargetPoses,
} from "../sections.ts";
import type { HallTargetId, HallTargetPose, SectionId } from "../sections.ts";
import {
  useFidelityMode,
  useAudioMutedToggle,
  useReducedMotion,
  useDocumentHidden,
  isMobileViewport,
} from "../use-low-power.ts";
import "./HallLanding.css";

const BOOT_KEY = "landing.hall.bootSeen";
const ENTERED_KEY = "landing.hall.entered";
const INTRO_FLY_DURATION = 2.4;

type HallPhase = "intro" | "entering" | "interactive";

interface FpsSamplerProps {
  onSample: (fps: number) => void;
}

const FpsSampler: React.FC<FpsSamplerProps> = ({ onSample }) => {
  const lastRef = useRef(performance.now());
  const framesRef = useRef(0);
  useFrame(() => {
    framesRef.current += 1;
    const now = performance.now();
    if (now - lastRef.current >= 500) {
      const fps = Math.round((framesRef.current * 1000) / (now - lastRef.current));
      onSample(fps);
      framesRef.current = 0;
      lastRef.current = now;
    }
  });
  return null;
};

/** Resolve the deep-link target from the URL hash. `/hall` → hub. `/hall/projects`
 *  → projects. Unknown → hub. */
function deriveTargetFromPath(pathname: string): HallTargetId {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2 || parts[0] !== "hall") return "hub";
  const seg = parts[1].toLowerCase();
  if ((HALL_ALCOVE_ORDER as string[]).includes(seg)) return seg as SectionId;
  return "hub";
}

/** The Hall — multi-room cinematic landing. Mounted at `/hall` during
 *  Phases 0-7; will become `/` at Phase 8 default-landing swap.
 *
 *  Geometry is placeholder primitive R3F today; each piece is structured
 *  so that swapping in a `useGLTF` load from `public/models/hall/*.glb` is
 *  a one-import change.
 */
const HallLanding: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const reducedMotion = useReducedMotion();
  const hidden = useDocumentHidden();
  const { lowFidelity, reportFps, mode: fidMode, setMode: setFidMode } =
    useFidelityMode();
  const { muted, toggle: toggleMuted } = useAudioMutedToggle();

  const mobile = useMemo(() => isMobileViewport(), []);

  const targets = useMemo(() => buildHallTargetPoses(), []);

  const initialTarget = useMemo(
    () => deriveTargetFromPath(location.pathname),
    [location.pathname]
  );
  const isDeepLink = useMemo(
    () => initialTarget !== "hub",
    [initialTarget]
  );
  const [active, setActive] = useState<HallTargetId>(initialTarget);
  const [hoveredId, setHoveredId] = useState<SectionId | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [fps, setFps] = useState(0);
  const [transitionEpoch, setTransitionEpoch] = useState(0);

  // Phase machine — drives the door+hallway intro. `intro` shows the door
  // and parks the camera at HALL_DOOR_POSE; `entering` plays the fly through
  // the corridor; `interactive` is the normal hub experience.
  const [phase, setPhase] = useState<HallPhase>(() => {
    if (reducedMotion || mobile || isDeepLink) return "interactive";
    try {
      return localStorage.getItem(ENTERED_KEY) === "1"
        ? "interactive"
        : "intro";
    } catch {
      return "interactive";
    }
  });

  // Boot sequence: first visit only, fly camera from BOOT_POSE to HUB. Only
  // applies on the normal (non-intro) path — the door intro replaces the
  // bird's-eye fly for first-time visitors.
  const [bootStarting, setBootStarting] = useState<boolean>(() => {
    if (reducedMotion || mobile) return false;
    if (phase !== "interactive") return false;
    try {
      return localStorage.getItem(BOOT_KEY) !== "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!bootStarting) return;
    try {
      localStorage.setItem(BOOT_KEY, "1");
    } catch {
      /* ignore */
    }
    // After 250ms (Canvas has mounted + initial render), kick the fly.
    const t = setTimeout(() => {
      setActive((curr) => (curr === "hub" ? "hub" : curr));
      setBootStarting(false);
      setTransitionEpoch((x) => x + 1);
    }, 250);
    return () => clearTimeout(t);
  }, [bootStarting]);

  // Door fly waypoints — only populated while phase === "entering".
  const introWaypoints = useMemo<HallTargetPose[] | undefined>(() => {
    if (phase !== "entering") return undefined;
    return [HALL_DOORWAY_POSE, HALL_HALLWAY_WAYPOINT];
  }, [phase]);

  const onEnterDoor = useCallback(() => {
    setPhase((p) => {
      if (p !== "intro") return p;
      setActive("hub");
      setTransitionEpoch((x) => x + 1);
      return "entering";
    });
  }, []);

  // When the entry fly completes, settle into the interactive phase and
  // persist "user has been here" so future visits skip the door.
  useEffect(() => {
    if (phase !== "entering") return;
    const t = setTimeout(() => {
      setPhase("interactive");
      try {
        localStorage.setItem(ENTERED_KEY, "1");
        localStorage.setItem(BOOT_KEY, "1");
      } catch {
        /* ignore */
      }
    }, INTRO_FLY_DURATION * 1000);
    return () => clearTimeout(t);
  }, [phase]);

  // Sync URL hash → camera target. Keeps deep links working & back-button
  // navigation moving the camera.
  useEffect(() => {
    const t = deriveTargetFromPath(location.pathname);
    if (t !== active) {
      setActive(t);
      setTransitionEpoch((x) => x + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Sync camera target → URL hash (replace, not push, to avoid spamming
  // history with every key press).
  useEffect(() => {
    const desired =
      active === "hub" ? "/hall" : `/hall/${active}`;
    if (location.pathname !== desired) {
      navigate(desired, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const flyTo = useCallback((target: HallTargetId) => {
    setActive((curr) => {
      if (curr === target) return curr;
      setTransitionEpoch((x) => x + 1);
      return target;
    });
  }, []);

  const handleAlcoveSelect = useCallback(
    (id: SectionId) => {
      flyTo(id);
    },
    [flyTo]
  );

  // Keyboard navigation: 0 → hub, 1-6 → alcove, M → map, Esc → close map /
  // return to workstation if at hub. During intro, Enter triggers the door.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;
      if (phase === "intro" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onEnterDoor();
        return;
      }
      if (phase !== "interactive") return;
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setMapOpen((v) => !v);
        return;
      }
      if (e.key === "0") {
        flyTo("hub");
        return;
      }
      const n = Number.parseInt(e.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= HALL_ALCOVE_ORDER.length) {
        flyTo(HALL_ALCOVE_ORDER[n - 1]);
        return;
      }
      if (e.key === "Escape") {
        if (mapOpen) {
          setMapOpen(false);
        } else if (active === "hub") {
          navigate("/");
        } else {
          flyTo("hub");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, mapOpen, navigate, flyTo, phase, onEnterDoor]);

  const handleReturnToWorkstation = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const toggleFidelity = useCallback(() => {
    if (fidMode === "low") setFidMode("auto");
    else setFidMode("low");
  }, [fidMode, setFidMode]);

  // Reduced-motion: hard-cut camera changes, lock hologram + atmosphere
  // animation. Document-hidden: freeze the frame loop entirely.
  const hardCut = reducedMotion;
  const idleOrbitDisabled =
    reducedMotion || hoveredId !== null || mapOpen || phase !== "interactive";
  const staticMode = reducedMotion;
  const dragEnabled = phase === "interactive";

  // While the door intro is running, override the hub pose so CameraDirector
  // parks the camera outside the door (intro) and flies through the corridor
  // on the next render (entering). On entering→interactive, the override is
  // dropped and the camera rests at the real hub pose.
  const effectiveTargets = useMemo(() => {
    if (phase === "intro") return { ...targets, hub: HALL_DOOR_POSE };
    if (bootStarting) return { ...targets, hub: HALL_BOOT_POSE };
    return targets;
  }, [phase, bootStarting, targets]);

  const initialCameraPosition = useMemo<[number, number, number]>(() => {
    if (phase === "intro") return HALL_DOOR_POSE.position;
    if (bootStarting) return HALL_BOOT_POSE.position;
    return targets[active].position;
  }, [phase, bootStarting, targets, active]);

  const effectiveFlyDuration =
    phase === "entering"
      ? INTRO_FLY_DURATION
      : bootStarting
      ? 0
      : 1.2;

  const dprCap: [number, number] = mobile ? [1, 1] : [1, 1.25];

  return (
    <div className="hall-scene" role="main">
      <Canvas
        shadows={!lowFidelity}
        dpr={dprCap}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{
          position: initialCameraPosition,
          fov: 46,
          near: 0.1,
          far: 60,
        }}
        frameloop={hidden ? "never" : "always"}
        onPointerMissed={() => setHoveredId(null)}
      >
        <Suspense fallback={null}>
          <Scene
            hoveredId={hoveredId}
            onAlcoveHover={setHoveredId}
            onAlcoveSelect={handleAlcoveSelect}
            lowFidelity={lowFidelity}
            staticMode={staticMode}
            showEntrance={phase !== "interactive"}
            entranceClosed={phase === "intro"}
            onEnterDoor={onEnterDoor}
          />
          <CameraDirector
            targets={effectiveTargets}
            active={bootStarting ? "hub" : active}
            flyWaypoints={introWaypoints}
            hardCut={hardCut}
            idleOrbitDisabled={idleOrbitDisabled}
            dragEnabled={dragEnabled}
            flyDuration={effectiveFlyDuration}
          />
          <Postprocessing enabled={!lowFidelity && !reducedMotion} />
          <AdaptiveDpr pixelated={false} />
          <FpsSampler
            onSample={(f) => {
              setFps(f);
              reportFps(f);
            }}
          />
        </Suspense>
      </Canvas>

      <HUDOverlay
        active={hoveredId ?? active}
        hoveredId={hoveredId}
        lowFidelity={lowFidelity}
        audioMuted={muted}
        fps={fps}
        phase={phase}
        onToggleMap={() => setMapOpen((v) => !v)}
        onToggleAudio={toggleMuted}
        onToggleFidelity={toggleFidelity}
        onReturnToWorkstation={handleReturnToWorkstation}
        onJumpToTerminal={() => navigate("/about")}
        onEnterDoor={onEnterDoor}
      />

      <Map
        open={mapOpen}
        active={active}
        onClose={() => setMapOpen(false)}
        onSelect={(t) => {
          setMapOpen(false);
          flyTo(t);
        }}
      />

      <HallAudio
        muted={muted}
        transitionEpoch={transitionEpoch}
        active={active}
      />
    </div>
  );
};

export default HallLanding;
