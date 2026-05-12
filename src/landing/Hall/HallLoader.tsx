/** @format */

import React from "react";
import "./HallLoader.css";

/** Phase 8 polish — loading-screen brass tessellation. Shown by App.tsx
 *  Suspense fallback while the Hall lazy chunk loads. Six brass triangles
 *  arranged in a hexagonal pattern, each pulsing with a 0.18 s phase
 *  offset for a slow-rolling shimmer. Echoes the hex-tracery motif used
 *  by the alcove arches + dome ribs.
 *
 *  Pure CSS animation — no PNG/GIF/WebM asset. Total payload added: the
 *  CSS file (~1 KB gzipped). */
const HallLoader: React.FC = () => {
  return (
    <div className="hall-loader" role="status" aria-label="Loading hall…">
      <div className="hall-loader__ring">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="hall-loader__tri"
            style={{
              transform: `rotate(${i * 60}deg) translate(0, -36px)`,
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </div>
      <div className="hall-loader__label">entering the hall</div>
    </div>
  );
};

export default HallLoader;
