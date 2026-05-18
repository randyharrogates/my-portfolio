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
// Postprocessing currently disabled — see comment near the
// `<Canvas>` JSX below. Re-import when the TSL bloom pipeline is
// re-tuned. The file still exists in src/landing/Hall/ as a stub
// for that future work.
// import Postprocessing from "./Postprocessing.tsx";
import HUDOverlay from "./HUDOverlay.tsx";
import Map from "./Map.tsx";
import HallAudio from "./HallAudio.tsx";
import {
  HallSettingsProvider,
  readViewModeFromUrl,
  resolveReducedMotion,
  useHallSettings,
} from "./useHallSettings.ts";
import type { HallViewMode } from "./useHallSettings.ts";
import {
  HALL_ALCOVE_ORDER,
  HALL_BOOT_POSE,
  HALL_GUIDED_TOUR_ORDER,
  buildHallTargetPoses,
} from "../sections.ts";
import type { HallTargetId, HallTargetPose, SectionId } from "../sections.ts";
import {
  useFidelityMode,
  useAudioMutedToggle,
  useReducedMotion,
  useDocumentHidden,
  isMobileViewport,
  useWebGPUAvailable,
} from "../use-low-power.ts";
import "./HallLanding.css";

const BOOT_KEY = "landing.hall.bootSeen";

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
 *  → projects. Unknown → hub. Section targets are mapped onto the hub pose
 *  until Phase 6 lands the satellite islands; deep links still route, they
 *  just don't fly anywhere distinct yet. */
function deriveTargetFromPath(pathname: string): HallTargetId {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2 || parts[0] !== "hall") return "hub";
  const seg = parts[1].toLowerCase();
  if ((HALL_ALCOVE_ORDER as string[]).includes(seg)) return seg as SectionId;
  return "hub";
}

/** The Hall — archipelago exterior landing. Mounted at `/hall`.
 *
 *  Cathedral interior (Hub, Alcoves, Entrance, outer wall) was unmounted
 *  on 2026-05-12 in favour of the pure archipelago direction. The only
 *  rendered element today is the hub island (a floating rock platter);
 *  Phase 6 will add six satellite islands for the section routes.
 */
const HallLanding: React.FC = () => {
  return (
    <HallSettingsProvider>
      <HallLandingInner />
    </HallSettingsProvider>
  );
};

const HallLandingInner: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, setViewMode } = useHallSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Honor `?view=orbit|guided` on first mount so deep-links land
  // in the requested view mode. We only consume the URL once.
  useEffect(() => {
    const fromUrl = readViewModeFromUrl();
    if (fromUrl && fromUrl !== settings.viewMode) {
      setViewMode(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const systemReducedMotion = useReducedMotion();
  const reducedMotion = resolveReducedMotion(
    systemReducedMotion,
    settings.reducedMotionOverride
  );
  const hidden = useDocumentHidden();

  // Phase 4.5 Stage 3 (2026-05-12): WebGPU is the only supported renderer
  // path for /hall. The async probe runs first (resolves to "available"
  // when navigator.gpu + adapter both succeed); any "unavailable" result
  // redirects back to the workstation since the scene's materials are
  // all NodeMaterial and won't compile under the legacy WebGL renderer.
  const webgpuState = useWebGPUAvailable();
  useEffect(() => {
    if (webgpuState === "unavailable") {
      navigate("/", { replace: true });
    }
  }, [webgpuState, navigate]);
  const useWebGPU = webgpuState === "available";
  const probingRenderer = webgpuState === "probing";
  const glFactory = useMemo(() => {
    if (!useWebGPU) return undefined;
    // R3F v9 passes the gl factory a props object containing the canvas
    // plus render props (`{ canvas, powerPreference, antialias, alpha }`),
    // NOT the canvas element directly. Unwrap it so WebGPURenderer sees
    // an actual HTMLCanvasElement as its dom element.
    return async (
      props: HTMLCanvasElement | { canvas: HTMLCanvasElement }
    ) => {
      const canvas =
        props instanceof HTMLCanvasElement ? props : props.canvas;
      const [{ WebGPURenderer }, three] = await Promise.all([
        import("three/webgpu"),
        import("three"),
      ]);
      const renderer = new WebGPURenderer({
        canvas,
        antialias: true,
        powerPreference: "high-performance",
      });
      // `PostProcessing.outputColorTransform` reads
      // `renderer.toneMapping`. ACES (what the WebGL stack used)
      // crushes the neon palette: saturated magenta horizon
      // desaturates to red, and the dark rock material falls below
      // the shadow toe → pure black silhouette. NeutralToneMapping
      // preserves chroma in highlights, and a small exposure bump
      // lifts the lightmap rim above the toe so the spire reads.
      renderer.toneMapping = three.NeutralToneMapping;
      renderer.toneMappingExposure = 2.2;
      renderer.outputColorSpace = three.SRGBColorSpace;
      await renderer.init();
      return renderer as unknown as import("three").WebGLRenderer;
    };
  }, [useWebGPU]);
  const { lowFidelity, reportFps, mode: fidMode, setMode: setFidMode } =
    useFidelityMode();
  const { muted, toggle: toggleMuted } = useAudioMutedToggle();

  const mobile = useMemo(() => isMobileViewport(), []);

  const targets = useMemo(() => {
    // Phase 6 (2026-05-13): each section flies the camera to its PoI
    // marker on the hub island top. Hub remains the wide orbital pose.
    return buildHallTargetPoses();
  }, []);

  const initialTarget = useMemo(
    () => deriveTargetFromPath(location.pathname),
    [location.pathname]
  );
  const [active, setActive] = useState<HallTargetId>(initialTarget);
  const [mapOpen, setMapOpen] = useState(false);
  const [fps, setFps] = useState(0);
  const [transitionEpoch, setTransitionEpoch] = useState(0);

  // Boot sequence: first visit only, fly camera through a multi-waypoint
  // path loaded from `/data/hall-boot-path.json`. Now an exterior orbital
  // reveal of the floating hub island.
  const [bootStarting, setBootStarting] = useState<boolean>(() => {
    if (reducedMotion || mobile) return false;
    try {
      return sessionStorage.getItem(BOOT_KEY) !== "1";
    } catch {
      return false;
    }
  });
  const [bootWaypoint, setBootWaypoint] = useState<HallTargetPose | null>(null);
  const bootPathRef = useRef<HallTargetPose[] | null>(null);
  useEffect(() => {
    if (!bootStarting) return;
    try {
      sessionStorage.setItem(BOOT_KEY, "1");
    } catch {
      /* ignore */
    }
    let canceled = false;
    const dwellsRef = { current: [] as number[] };

    fetch(`${process.env.PUBLIC_URL}/data/hall-boot-path.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg: { waypoints?: Array<{ position: number[]; lookAt: number[]; fov?: number; dwellMs?: number }> } | null) => {
        if (canceled || !cfg?.waypoints?.length) {
          setBootStarting(false);
          setTransitionEpoch((x) => x + 1);
          return;
        }
        const path = cfg.waypoints.map<HallTargetPose>((w) => ({
          position: [w.position[0], w.position[1], w.position[2]],
          lookAt: [w.lookAt[0], w.lookAt[1], w.lookAt[2]],
          fov: w.fov,
        }));
        dwellsRef.current = cfg.waypoints.map((w) => w.dwellMs ?? 1000);
        bootPathRef.current = path;
        let i = 1;
        const step = (): void => {
          if (canceled) return;
          if (i >= path.length) {
            setBootWaypoint(null);
            setBootStarting(false);
            setTransitionEpoch((x) => x + 1);
            return;
          }
          setBootWaypoint(path[i]);
          setTransitionEpoch((x) => x + 1);
          const dwell = dwellsRef.current[i] ?? 1100;
          i += 1;
          setTimeout(step, dwell);
        };
        setTimeout(step, 250);
      })
      .catch(() => {
        setBootStarting(false);
        setTransitionEpoch((x) => x + 1);
      });

    return () => {
      canceled = true;
    };
  }, [bootStarting]);

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

  // Sync camera target → URL hash (replace, not push).
  useEffect(() => {
    const desired = active === "hub" ? "/hall" : `/hall/${active}`;
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

  // Keyboard navigation: 0 → hub, 1-6 → section, M → map, Esc → close
  // map / exit guided mode / return to workstation if at hub.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;
      if (e.target && (e.target as HTMLElement).tagName === "TEXTAREA") return;
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
        if (settingsOpen) {
          setSettingsOpen(false);
        } else if (mapOpen) {
          setMapOpen(false);
        } else if (settings.viewMode === "guided") {
          setViewMode("orbit");
        } else if (active === "hub") {
          navigate("/");
        } else {
          flyTo("hub");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, mapOpen, navigate, flyTo, settings.viewMode, setViewMode, settingsOpen]);

  const handleReturnToWorkstation = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const toggleFidelity = useCallback(() => {
    if (fidMode === "low") setFidMode("auto");
    else setFidMode("low");
  }, [fidMode, setFidMode]);

  // Guided-tour controls. Entering guided mode flies to the hub
  // overview (step 1); `next` steps through HALL_GUIDED_TOUR_ORDER one
  // landmark at a time; finishing on the last stop exits back to orbit.
  const handleViewModeChange = useCallback(
    (m: HallViewMode) => {
      setSettingsOpen(false);
      setViewMode(m);
      if (m === "guided") flyTo("hub");
    },
    [setViewMode, flyTo]
  );

  const handleGuidedNext = useCallback(() => {
    const idx = HALL_GUIDED_TOUR_ORDER.indexOf(active);
    const cur = idx >= 0 ? idx : 0;
    if (cur >= HALL_GUIDED_TOUR_ORDER.length - 1) {
      // Last stop — finish the tour, drop back to free orbit at the hub.
      setViewMode("orbit");
      flyTo("hub");
      return;
    }
    flyTo(HALL_GUIDED_TOUR_ORDER[cur + 1]);
  }, [active, flyTo, setViewMode]);

  const handleGuidedExit = useCallback(() => {
    setViewMode("orbit");
  }, [setViewMode]);

  const hardCut = reducedMotion;
  const idleOrbitDisabled = reducedMotion || mapOpen;
  const staticMode = reducedMotion;

  // While the boot fly is running, point the "hub" target at the current
  // waypoint so CameraDirector flies the camera there.
  const effectiveTargets = useMemo(() => {
    if (bootStarting) {
      const dest = bootWaypoint ?? HALL_BOOT_POSE;
      return { ...targets, hub: dest };
    }
    return targets;
  }, [bootStarting, bootWaypoint, targets]);

  const initialCameraPosition = useMemo<[number, number, number]>(() => {
    if (bootStarting) return HALL_BOOT_POSE.position;
    return targets[active].position;
  }, [bootStarting, targets, active]);

  const effectiveFlyDuration = bootStarting ? 1.0 : 1.2;

  const dprCap: [number, number] = mobile ? [1, 1] : [1, 1.25];

  return (
    <div className="hall-scene" role="main">
      {probingRenderer ? null : (
      <Canvas
        shadows
        dpr={dprCap}
        gl={glFactory ?? { antialias: true, powerPreference: "high-performance" }}
        camera={{
          position: initialCameraPosition,
          fov: 46,
          near: 0.1,
          far: 500,
        }}
        frameloop={hidden ? "never" : "always"}
      >
        <Suspense fallback={null}>
          <Scene
            lowFidelity={lowFidelity}
            staticMode={staticMode}
            poiLabels={settings.poiLabels}
            bootActive={bootStarting}
          />
          <CameraDirector
            targets={effectiveTargets}
            active={bootStarting ? "hub" : active}
            hardCut={hardCut}
            idleOrbitDisabled={idleOrbitDisabled}
            dragEnabled
            flyDuration={effectiveFlyDuration}
            sensitivity={settings.sensitivity}
            fovOverride={settings.fov}
            autoRotate={settings.autoRotate}
          />
          {/* Postprocessing disabled on Stage 3 — TSL bloom + tone
              mapping under WebGPU was crushing the scene to near-black.
              The renderer's `toneMapping` + `outputColorSpace` (set in
              the gl factory) handle final colour transform directly,
              and the scene renders correctly without a composite pass.
              Bloom + polish post-fx come back in a later session once
              the pipeline is properly tuned for `three/webgpu`. */}
          {/* <Postprocessing enabled={!lowFidelity && !reducedMotion} /> */}
          <AdaptiveDpr pixelated={false} />
          <FpsSampler
            onSample={(f) => {
              setFps(f);
              reportFps(f);
            }}
          />
        </Suspense>
      </Canvas>
      )}

      <HUDOverlay
        active={active}
        hoveredId={null}
        lowFidelity={lowFidelity}
        audioMuted={muted}
        fps={fps}
        phase="interactive"
        showFps={settings.fpsCounter}
        viewMode={settings.viewMode}
        settingsOpen={settingsOpen}
        onCloseSettings={() => setSettingsOpen(false)}
        onResetTutorials={() => {
          /* resetAll() in the gear panel clears hall.tutorial.* keys
             already; OrbPulseProvider + MobileTutorial respond to
             resetEpoch in their own effects. No action needed here. */
        }}
        onToggleMap={() => setMapOpen((v) => !v)}
        onToggleAudio={toggleMuted}
        onToggleFidelity={toggleFidelity}
        onReturnToWorkstation={handleReturnToWorkstation}
        onJumpToTerminal={() => navigate("/about")}
        onEnterDoor={() => {
          /* no-op — entrance/door removed with cathedral */
        }}
        onViewModeChange={handleViewModeChange}
        onOpenSettings={() => setSettingsOpen((v) => !v)}
        onGuidedNext={handleGuidedNext}
        onGuidedExit={handleGuidedExit}
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
