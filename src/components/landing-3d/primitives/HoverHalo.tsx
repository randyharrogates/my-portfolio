/** @format */

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface HoverHaloProps {
  hovered: boolean;
  scale?: number;
  hoverScale?: number;
  children: React.ReactNode;
}

const HoverHalo: React.FC<HoverHaloProps> = ({
  hovered,
  scale = 1,
  hoverScale = 1.2,
  children,
}) => {
  const ref = useRef<THREE.Group>(null);
  const target = hovered ? hoverScale : scale;

  useFrame((_, delta) => {
    if (!ref.current) return;
    const cur = ref.current.scale.x;
    const next = THREE.MathUtils.damp(cur, target, 8, delta);
    ref.current.scale.setScalar(next);
  });

  return <group ref={ref}>{children}</group>;
};

export default HoverHalo;
