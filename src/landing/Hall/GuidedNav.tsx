/** @format */

import React from "react";
import {
  HALL_GUIDED_TOUR_ORDER,
  HALL_GUIDED_TOUR_LABELS,
} from "../sections.ts";
import type { HallTargetId } from "../sections.ts";
import "./GuidedNav.css";

interface GuidedNavProps {
  /** The camera's current target — used to derive the tour step. */
  active: HallTargetId;
  /** Advance to the next tour stop (or finish on the last stop). */
  onNext: () => void;
  /** Exit guided mode back to free orbit. */
  onExit: () => void;
}

/** Floating bottom-center pill for the guided tour. Walks the camera
 *  through `HALL_GUIDED_TOUR_ORDER` one stop at a time — the user
 *  controls the pace via the `next →` button. The step is derived from
 *  the camera's `active` target so number-key navigation stays in sync
 *  with the pill. */
const GuidedNav: React.FC<GuidedNavProps> = ({ active, onNext, onExit }) => {
  const total = HALL_GUIDED_TOUR_ORDER.length;
  const rawIdx = HALL_GUIDED_TOUR_ORDER.indexOf(active);
  // If the camera is on a target that's somehow off-route, treat it as
  // the hub overview (step 0) so the pill still reads sensibly.
  const idx = rawIdx >= 0 ? rawIdx : 0;
  const isLast = idx >= total - 1;
  const nextTarget = isLast
    ? null
    : HALL_GUIDED_TOUR_ORDER[idx + 1];
  const currentLabel = HALL_GUIDED_TOUR_LABELS[active] ?? "the hall";

  return (
    <div className="hall-guidednav" role="region" aria-label="guided tour">
      <button
        type="button"
        className="hall-guidednav__exit"
        onClick={onExit}
        aria-label="exit guided tour"
      >
        exit guide
      </button>

      <div className="hall-guidednav__progress">
        <span className="hall-guidednav__step">
          stop {idx + 1} / {total}
        </span>
        <span className="hall-guidednav__current">{currentLabel}</span>
      </div>

      <button
        type="button"
        className="hall-guidednav__next"
        onClick={onNext}
      >
        {isLast ? (
          <>finish tour ✓</>
        ) : (
          <>
            next → {HALL_GUIDED_TOUR_LABELS[nextTarget as HallTargetId]}
          </>
        )}
      </button>
    </div>
  );
};

export default GuidedNav;
