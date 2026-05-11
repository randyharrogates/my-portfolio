/** @format */

import React, { useEffect, useRef } from "react";
import {
  HALL_ALCOVE_ORDER,
  HALL_THEMES,
  alcoveCentre,
} from "../sections.ts";
import type { HallTargetId, SectionId } from "../sections.ts";
import "./Map.css";

interface MapProps {
  open: boolean;
  active: HallTargetId;
  onClose: () => void;
  onSelect: (target: HallTargetId) => void;
}

const MAP_SIZE = 360; // px square

function projectToMap(x: number, z: number, mapSize: number): [number, number] {
  // Scene radius covers ≈10 world units; map to [0, mapSize].
  const sceneRadius = 9;
  const half = mapSize / 2;
  const px = half + (x / sceneRadius) * half * 0.85;
  // -Z in world → up in map.
  const py = half - (z / sceneRadius) * half * 0.85;
  return [px, py];
}

/** Top-down map overlay. Triggered by `M`. Shows hub at centre + 6 alcoves
 *  as hex tiles around it. Click a tile to fly the camera there.
 */
const Map: React.FC<MapProps> = ({ open, active, onClose, onSelect }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const tiles = HALL_ALCOVE_ORDER.map((id, i) => {
    const c = alcoveCentre(i);
    const [px, py] = projectToMap(c[0], c[2], MAP_SIZE);
    return { id, px, py, theme: HALL_THEMES[id] };
  });

  return (
    <div
      className="hall-map"
      role="dialog"
      aria-modal="true"
      aria-label="hall map"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="hall-map__panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hall-map__head">
          <span className="hall-map__title">hall · top-down</span>
          <button
            type="button"
            className="hall-map__close"
            onClick={onClose}
            aria-label="close map (M or Esc)"
          >
            close · M
          </button>
        </div>

        <svg
          width={MAP_SIZE}
          height={MAP_SIZE}
          viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`}
          className="hall-map__svg"
          role="img"
          aria-label="zones"
        >
          <defs>
            <pattern
              id="hall-map-grid"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke="rgba(122, 255, 240, 0.08)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width={MAP_SIZE} height={MAP_SIZE} fill="url(#hall-map-grid)" />

          {/* Connection rings from hub centre to each alcove */}
          {tiles.map((t) => (
            <line
              key={`line-${t.id}`}
              x1={MAP_SIZE / 2}
              y1={MAP_SIZE / 2}
              x2={t.px}
              y2={t.py}
              stroke="rgba(122, 255, 240, 0.25)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Hub centre */}
          <g
            transform={`translate(${MAP_SIZE / 2}, ${MAP_SIZE / 2})`}
            className={`hall-map__node${active === "hub" ? " is-active" : ""}`}
            onClick={() => onSelect("hub")}
            tabIndex={0}
            role="button"
            aria-label="hub"
          >
            <circle r="28" />
            <text textAnchor="middle" dy="4">
              HUB
            </text>
          </g>

          {/* Alcove tiles */}
          {tiles.map((t) => (
            <g
              key={t.id}
              transform={`translate(${t.px}, ${t.py})`}
              className={`hall-map__node${active === t.id ? " is-active" : ""}`}
              onClick={() => onSelect(t.id as SectionId)}
              tabIndex={0}
              role="button"
              aria-label={t.theme.title}
              style={{ "--node-accent": t.theme.accent } as React.CSSProperties}
            >
              <polygon points="-24,0 -12,-20 12,-20 24,0 12,20 -12,20" />
              <text textAnchor="middle" dy="4">
                {t.id}
              </text>
            </g>
          ))}
        </svg>

        <div className="hall-map__legend">
          <span>1-6 jump · 0 hub · M close</span>
        </div>
      </div>
    </div>
  );
};

export default Map;
