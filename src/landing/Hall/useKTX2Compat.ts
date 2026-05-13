/** @format */

import { useLoader, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import type * as THREE from "three";

/** Drop-in replacement for `@react-three/drei`'s `useKTX2` that works under
 *  both `WebGLRenderer` and `WebGPURenderer`. Two reasons drei's hook breaks
 *  under WebGPU:
 *
 *  1. drei imports `KTX2Loader` from `three-stdlib`, whose `detectSupport`
 *     unconditionally reads `renderer.extensions.has(...)` and
 *     `renderer.capabilities.isWebGL2`. Both are undefined on
 *     `WebGPURenderer`. Three.js core's `KTX2Loader` (r0.169+) added an
 *     `if (renderer.isWebGPURenderer === true)` branch that uses
 *     `renderer.hasFeature('texture-compression-…')` instead, so we import
 *     from there.
 *
 *  2. drei calls `gl.initTexture(texture)` in a `useEffect` to force-upload
 *     before the first render. `initTexture` is a `WebGLRenderer` instance
 *     method only; `WebGPURenderer` doesn't have it. We guard the call.
 */
export function useKTX2Compat(
  url: string,
  basisPath: string
): THREE.Texture {
  const gl = useThree((s) => s.gl) as unknown as THREE.WebGLRenderer & {
    isWebGPURenderer?: boolean;
    initTexture?: (t: THREE.Texture) => void;
  };

  const texture = useLoader(KTX2Loader, url, (loader) => {
    loader.detectSupport(gl as unknown as THREE.WebGLRenderer);
    loader.setTranscoderPath(basisPath);
  }) as THREE.Texture;

  useEffect(() => {
    // Skip the eager GPU upload on WebGPURenderer — it has no `initTexture`
    // method, and the texture will be lazily uploaded by the backend on
    // first sampler bind anyway.
    if (gl.isWebGPURenderer === true) return;
    if (typeof gl.initTexture === "function") {
      gl.initTexture(texture);
    }
  }, [gl, texture]);

  return texture;
}
