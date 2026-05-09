/** @format */

import React, { useMemo } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { TERMINAL_THEME } from "../colors.ts";

interface TerminalScreenProps {
  width?: number;
  height?: number;
  typedName: string;
  showCursor: boolean;
  role: string;
  position?: [number, number, number];
}

const TerminalScreen: React.FC<TerminalScreenProps> = ({
  width = 2.6,
  height = 1.7,
  typedName,
  showCursor,
  role,
  position = [0, 0, 0],
}) => {
  const screenMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0a0908",
        emissive: TERMINAL_THEME.accent,
        emissiveIntensity: 0.08,
        roughness: 0.3,
        metalness: 0.1,
      }),
    []
  );

  return (
    <group position={position}>
      {/* Screen plane */}
      <mesh material={screenMaterial}>
        <planeGeometry args={[width, height]} />
      </mesh>

      {/* Prompt line */}
      <Text
        position={[-width / 2 + 0.12, height / 2 - 0.18, 0.001]}
        fontSize={0.1}
        color={TERMINAL_THEME.mute}
        anchorX="left"
        anchorY="middle"
      >
        ~/portfolio $ whoami
      </Text>

      {/* Typed name + cursor */}
      <Text
        position={[-width / 2 + 0.12, height / 2 - 0.42, 0.001]}
        fontSize={0.18}
        color={TERMINAL_THEME.accent}
        anchorX="left"
        anchorY="middle"
      >
        {typedName + (showCursor ? "_" : " ")}
      </Text>

      {/* Role */}
      <Text
        position={[-width / 2 + 0.12, height / 2 - 0.7, 0.001]}
        fontSize={0.085}
        color={TERMINAL_THEME.ink}
        anchorX="left"
        anchorY="middle"
        maxWidth={width - 0.24}
      >
        {role}
      </Text>

      {/* Status line */}
      <Text
        position={[-width / 2 + 0.12, -height / 2 + 0.2, 0.001]}
        fontSize={0.08}
        color={TERMINAL_THEME.green}
        anchorX="left"
        anchorY="middle"
      >
        ● available for work
      </Text>

      {/* Subtle scanlines via emissive offset would be ideal; skip for perf. */}
    </group>
  );
};

export default TerminalScreen;
