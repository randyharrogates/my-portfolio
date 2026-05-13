/** @format */

import React, { useMemo } from "react";
import * as THREE from "three";
import {
  abs,
  float,
  fract,
  length,
  min,
  mix,
  oneMinus,
  positionWorld,
  smoothstep,
  step,
  uniform,
  vec2,
} from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";

/** Tron-style infinite-grid floor below the hub island. Visually
 *  anchors the floating archipelago and adds a depth cue: parallel
 *  grid lines converge toward the horizon when the camera tilts low,
 *  which the eye reads as scale + distance.
 *
 *  Procedural: no texture needed. The fragment shader takes the
 *  interpolated world XZ, folds it through `fract` to get cell-local
 *  coords, then measures the minimum distance to the nearest cell
 *  edge. A `smoothstep` under a thin line-width gives anti-aliased
 *  grid lines. Distance from origin drives a fadeout so the edges
 *  blend into the dark skybox lower hemisphere instead of clipping.
 *
 *  Major lines (every 5th cell) tint magenta; the rest stay cyan, to
 *  match the scene's two-light neon palette.
 */
const GridFloor: React.FC = () => {
  const material = useMemo(() => {
    const uCyan = uniform(new THREE.Color("#6fe8ff"));
    const uMagenta = uniform(new THREE.Color("#ff5fa8"));
    const uCellSize = uniform(6.0); // metres per minor cell
    const uLineWidth = uniform(0.04); // fraction of cell
    const uMajorEvery = uniform(5.0); // every Nth line is major (magenta)
    const uFadeStart = uniform(110.0); // fade begins here
    const uFadeEnd = uniform(360.0); // fully gone by here

    // Cell-local coordinates: each `uCellSize` block maps to [-0.5, 0.5].
    const worldXZ = vec2(positionWorld.x, positionWorld.z);
    const cellLocal = fract(worldXZ.div(uCellSize)).sub(0.5);
    const lineDist = min(abs(cellLocal.x), abs(cellLocal.y));
    const minor = oneMinus(smoothstep(float(0.0), uLineWidth, lineDist));

    // Major lines: detect cells whose index is a multiple of
    // `uMajorEvery` on either axis. `step` returns 1 when we're in the
    // top half of the period — used as a binary "is major" pick.
    const majorPeriod = uCellSize.mul(uMajorEvery);
    const majorCoord = fract(worldXZ.div(majorPeriod)).sub(0.5);
    const majorDist = min(abs(majorCoord.x), abs(majorCoord.y));
    const isMajor = oneMinus(step(uLineWidth.mul(0.6), majorDist));

    const lineColor = mix(uCyan, uMagenta, isMajor);

    // Atmospheric fade: lines beyond `uFadeStart` taper to invisibility
    // by `uFadeEnd`. Without it the grid clips at the plane's edge and
    // breaks the "infinite floor" illusion.
    const distFromCentre = length(worldXZ);
    const distFalloff = oneMinus(
      smoothstep(uFadeStart, uFadeEnd, distFromCentre)
    );

    const finalAlpha = minor.mul(distFalloff).mul(0.55);

    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = lineColor;
    mat.opacityNode = finalAlpha;
    mat.transparent = true;
    mat.depthWrite = false;
    mat.side = THREE.DoubleSide;
    mat.fog = false;
    return mat;
  }, []);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -56, 0]}
      renderOrder={-1}
    >
      <planeGeometry args={[800, 800, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

export default GridFloor;
