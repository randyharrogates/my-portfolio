/** @format */

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { MeshBasicNodeMaterial } from "three/webgpu";

interface WaterfallVideoProps {
  /** World position where the waterfall plane is centred. */
  position: [number, number, number];
  /** Width of the plane (matches FLIP-render aspect: portrait 720×1280 → 9:16). */
  width?: number;
  /** Height of the plane. */
  height?: number;
}

const VIDEO_PATH = `${process.env.PUBLIC_URL}/models/hall/landmarks/waterfall-loop.webm`;

/** Cycles-rendered FLIP fluid waterfall played back as a video texture
 *  on a billboard plane. Replaces the runtime TSL `skl_waterfall_main`
 *  geometry — the old TSL approach gave us flat scrolling stripes; this
 *  one ships an actual 3D-rendered fluid sim (cascade, splash, foam)
 *  baked once in Blender (~30s sim @ res 64 + 2-3h Cycles render).
 *
 *  The plane yaws to face the camera each frame (Y-axis only — keeps the
 *  column visually vertical). Other orbit angles are blocked by the
 *  mountain ridge behind the cliff, so the billboard trick stays hidden. */
const WaterfallVideo: React.FC<WaterfallVideoProps> = ({
  position,
  width = 12,
  height = 22,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  const { videoTexture, material } = useMemo(() => {
    const video = document.createElement("video");
    video.src = VIDEO_PATH;
    video.loop = true;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    videoElRef.current = video;
    void video.play().catch(() => {
      // Browsers may block autoplay until first user gesture — retry on
      // any document interaction.
      const retry = () => {
        void video.play().catch(() => {});
        document.removeEventListener("pointerdown", retry);
      };
      document.addEventListener("pointerdown", retry, { once: true });
    });

    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;

    const mat = new MeshBasicNodeMaterial({
      map: tex,
      side: THREE.DoubleSide,
      transparent: false,
      depthWrite: true,
    });
    mat.fog = false;

    return { videoTexture: tex, material: mat };
  }, []);

  // Y-axis billboard only — keeps the column vertical regardless of pitch.
  useFrame((state) => {
    if (!meshRef.current) return;
    const cam = state.camera.position;
    const m = meshRef.current;
    m.rotation.y = Math.atan2(cam.x - m.position.x, cam.z - m.position.z);
  });

  useEffect(() => {
    return () => {
      videoTexture.dispose();
      material.dispose();
      const v = videoElRef.current;
      if (v) {
        v.pause();
        v.removeAttribute("src");
        v.load();
      }
    };
  }, [videoTexture, material]);

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[width, height]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

export default WaterfallVideo;
