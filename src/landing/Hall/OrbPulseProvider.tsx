/** @format */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  HALL_TUTORIAL_KEYS,
  readTutorialFlag,
  useHallSettings,
  writeTutorialFlag,
} from "./useHallSettings.ts";

/** Duration the first-visit orb pulse runs unless the user hovers an orb
 *  first. Plan locked 2026-05-17 = 8 seconds. */
const PULSE_DURATION_MS = 8000;

interface OrbPulseContextValue {
  /** True while the orb-pulse animation should play. Orbs read this in
   *  useFrame to scale-pulse + halo-oscillate. */
  pulseActive: boolean;
  /** Mark that the user hovered an orb. Stops the pulse on all 6 orbs
   *  + persists the flag so the pulse doesn't replay on next mount. */
  markOrbHovered: () => void;
}

const OrbPulseContext = createContext<OrbPulseContextValue>({
  pulseActive: false,
  markOrbHovered: () => {},
});

interface OrbPulseProviderProps {
  children: React.ReactNode;
  /** True when boot is still flying through waypoints — pulse should
   *  not start until the camera is interactive. */
  bootActive?: boolean;
}

export const OrbPulseProvider: React.FC<OrbPulseProviderProps> = ({
  children,
  bootActive = false,
}) => {
  const { resetEpoch } = useHallSettings();
  const [pulseActive, setPulseActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Decide whether to arm the pulse on this mount or after a reset.
  useEffect(() => {
    if (bootActive) return;
    const alreadySeen = readTutorialFlag(HALL_TUTORIAL_KEYS.orbPulseSeen);
    if (alreadySeen) {
      setPulseActive(false);
      return;
    }
    setPulseActive(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setPulseActive(false);
      writeTutorialFlag(HALL_TUTORIAL_KEYS.orbPulseSeen, true);
    }, PULSE_DURATION_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [bootActive, resetEpoch]);

  const markOrbHovered = useMemo(
    () => () => {
      setPulseActive((curr) => {
        if (!curr) return curr;
        writeTutorialFlag(HALL_TUTORIAL_KEYS.orbPulseSeen, true);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        return false;
      });
    },
    []
  );

  const value = useMemo<OrbPulseContextValue>(
    () => ({ pulseActive, markOrbHovered }),
    [pulseActive, markOrbHovered]
  );

  return (
    <OrbPulseContext.Provider value={value}>
      {children}
    </OrbPulseContext.Provider>
  );
};

export function useOrbPulse(): OrbPulseContextValue {
  return useContext(OrbPulseContext);
}
