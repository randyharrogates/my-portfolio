/** @format */

import React, { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { Scene, Camera } from "three";
import { bloom, pass } from "three/tsl";
import { PostProcessing } from "three/webgpu";

interface PostprocessingProps {
  /** Kept for API parity with prior dual-path version. Today bloom +
   *  tone mapping are always on (the neon-on-dark palette depends on
   *  bloom selecting on bright saturated motes + rim emissives). When
   *  Phase 5+ adds SMAA/N8AO/Vignette via TSL node passes, this flag
   *  will gate those polish passes the way it did under the old
   *  `@react-three/postprocessing` stack. */
  enabled: boolean;
}

// Tuned for `three/webgpu`'s `BloomNode` (UnrealBloom-style). BloomNode's
// `radius` controls per-mip gaussian weighting; high values create a
// wide halo that wraps around dark silhouettes (a "ring" around the
// island). Keep radius low so glow stays close to the bright pixel,
// and threshold high so only the saturated horizon + motes contribute
// — not the broad magenta sky.
const BLOOM_STRENGTH = 0.4;
const BLOOM_RADIUS = 0.12;
const BLOOM_THRESHOLD = 0.85;

/** Postfx pipeline. WebGPU-only since the Stage-3 flip:
 *  `three/webgpu`'s `PostProcessing` class wired to TSL nodes. Scene
 *  pass + UnrealBloom-style bloom + auto tone mapping (renderer's
 *  `toneMapping` flows through `outputColorTransform`).
 *
 *  R3F invokes `gl.render(scene, camera)` each frame. We override that
 *  to call `postProcessing.render()` instead, which renders the scene
 *  through the pass node and composites bloom on top in a single
 *  fullscreen quad. Restores original on unmount.
 */
const Postprocessing: React.FC<PostprocessingProps> = () => {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    if (!gl || !scene || !camera) return;
    const renderer = gl as unknown as {
      render: (s: Scene, c: Camera) => void;
      isWebGPURenderer?: boolean;
    };

    const scenePass = pass(scene, camera);
    const sceneColor = scenePass.getTextureNode();
    const bloomEffect = bloom(
      sceneColor,
      BLOOM_STRENGTH,
      BLOOM_RADIUS,
      BLOOM_THRESHOLD
    );
    const final = sceneColor.add(bloomEffect);

    const postProcessing = new PostProcessing(
      renderer as unknown as import("three/webgpu").WebGPURenderer,
      final
    );
    // The PassNode renders the scene through the renderer's tone-mapping
    // pipeline already. If we let `outputColorTransform=true` (the
    // default) re-apply it on the composited quad, we end up double
    // tone-mapping — saturated emissives blow out and dark rock gets
    // crushed below the visible range. Disabling it lets the pre-mapped
    // colours pass through unchanged.
    postProcessing.outputColorTransform = false;

    const originalRender = renderer.render;
    let reentry = false;
    renderer.render = function patchedRender(this: unknown, ...args: unknown[]) {
      // PostProcessing.render() internally calls
      // `_quadMesh.render(renderer)` which calls `renderer.render(quadScene,
      // quadCamera)`. Without this guard the override re-enters itself and
      // stack-overflows. Re-entrant calls fall through to the original.
      if (reentry) {
        return (
          originalRender as (...inner: unknown[]) => unknown
        ).apply(this, args);
      }
      reentry = true;
      try {
        postProcessing.render();
      } finally {
        reentry = false;
      }
    } as typeof renderer.render;

    return () => {
      renderer.render = originalRender;
    };
  }, [gl, scene, camera]);

  return null;
};

export default Postprocessing;
