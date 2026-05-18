/** @format */

import React from "react";
import { Html } from "@react-three/drei";
import {
  HALL_ALCOVE_ORDER,
  HALL_POI_POSITIONS,
} from "../sections.ts";

const LABEL_TEXT: Record<string, string> = {
  about: "ABOUT",
  projects: "PROJECTS",
  skills: "SKILLS",
  blog: "BLOG",
  resume: "RESUME",
  contact: "CONTACT",
};

/** Vertical offset above the orb position so the label floats clear of
 *  the orb sphere. The 6 orb positions in Scene.tsx differ from the POI
 *  marker positions; here we hover labels above the marker since that
 *  is the section's canonical anchor on the hub. */
const LABEL_Y_OFFSET = 5.5;

interface PoiLabelsProps {
  /** Gated on the gear-panel "POI labels" setting. */
  enabled: boolean;
}

/** Six floating billboard labels above each landmark POI. Mounted at
 *  Scene level, gated on `settings.poiLabels`. Uses drei `<Html>` so the
 *  label is real DOM with CSS — sharp at any zoom, and the JetBrains
 *  Mono font matches the rest of the HUD vocabulary. */
const PoiLabels: React.FC<PoiLabelsProps> = ({ enabled }) => {
  if (!enabled) return null;
  return (
    <>
      {HALL_ALCOVE_ORDER.map((id, i) => {
        const p = HALL_POI_POSITIONS[i];
        if (!p) return null;
        const text = LABEL_TEXT[id] ?? id.toUpperCase();
        return (
          <group key={id} position={[p[0], p[1] + LABEL_Y_OFFSET, p[2]]}>
            <Html
              center
              distanceFactor={20}
              zIndexRange={[10, 0]}
              style={{
                pointerEvents: "none",
                userSelect: "none",
                whiteSpace: "nowrap",
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: "0.7rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#4dd0c4",
                background: "rgba(10, 13, 16, 0.72)",
                padding: "0.25rem 0.55rem",
                border: "1px solid rgba(122, 255, 240, 0.45)",
                textShadow: "0 0 6px rgba(77, 208, 196, 0.6)",
              }}
            >
              {text}
            </Html>
          </group>
        );
      })}
    </>
  );
};

export default PoiLabels;
