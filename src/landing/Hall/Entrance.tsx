/** @format */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  entranceAngle,
  HALL_DOOR_RADIUS,
  HALL_HALLWAY_WIDTH,
} from "../sections.ts";

interface EntranceProps {
  /** True while the door is intact (intro phase). When false, the door
   *  begins its open/dissolve animation in step with the entry fly. */
  closed: boolean;
  /** Click callback — same flow as the keyboard Enter fallback. */
  onEnter: () => void;
}

const HALLWAY_LENGTH = 8;
const HALLWAY_HEIGHT = 3.6;
const DOOR_W = 2.8;
const DOOR_H = 3.0;
const DOOR_OPEN_DURATION = 0.6;

const BRASS_BASE = "#8a6328";
const BRASS_BRIGHT = "#b8862a";
const BRASS_GLOW = "#e8b45a";
const SCONCE_GLOW = "#f4d8a8";

/** Door + hallway prologue. Mounted in front of the hub during the intro
 *  phase. Clicking the door triggers the fly-through, after which the parent
 *  unmounts this component. */
const Entrance: React.FC<EntranceProps> = ({ closed, onEnter }) => {
  const angle = entranceAngle();
  const groupPos = useMemo<[number, number, number]>(
    () => [
      Math.sin(angle) * HALL_DOOR_RADIUS,
      0,
      -Math.cos(angle) * HALL_DOOR_RADIUS,
    ],
    [angle]
  );
  const groupRot = useMemo<[number, number, number]>(
    () => [0, -angle, 0],
    [angle]
  );

  const doorRef = useRef<THREE.Mesh>(null);
  const doorMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const enterTextMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const archMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const openProgressRef = useRef(0);
  const pulseRef = useRef(0);

  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!closed || !hovered) {
      document.body.style.cursor = "";
      return;
    }
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered, closed]);

  useFrame((_, delta) => {
    pulseRef.current += delta;
    const pulse = 0.5 + 0.5 * Math.sin(pulseRef.current * 1.6);

    // Hovered or idle pulse on the ENTER text emissive.
    if (enterTextMatRef.current) {
      const base = hovered && closed ? 0.85 : 0.55;
      const range = hovered && closed ? 0.15 : 0.1;
      enterTextMatRef.current.opacity = base + range * pulse;
    }

    if (archMatRef.current) {
      archMatRef.current.emissiveIntensity =
        hovered && closed ? 0.32 + 0.08 * pulse : 0.12 + 0.04 * pulse;
    }

    if (!closed) {
      openProgressRef.current = Math.min(
        1,
        openProgressRef.current + delta / DOOR_OPEN_DURATION
      );
      const p = openProgressRef.current;
      const s = Math.max(0.001, 1 - p);
      if (doorRef.current) {
        // Top-pivot shrink — door dissolves up into the lintel.
        doorRef.current.scale.y = s;
        doorRef.current.position.y = DOOR_H - (DOOR_H * s) / 2;
      }
      if (doorMatRef.current) {
        doorMatRef.current.opacity = 1 - p;
      }
    }
  });

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (closed) setHovered(true);
    },
    [closed]
  );
  const handlePointerOut = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
  }, []);
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (closed) onEnter();
    },
    [closed, onEnter]
  );

  // Hallway pieces — local +Z extends inward toward the hub.
  const wallX = HALL_HALLWAY_WIDTH;

  return (
    <group position={groupPos} rotation={groupRot}>
      {/* Hallway floor — runs from the door inward toward the hub. */}
      <mesh
        position={[0, 0.02, HALLWAY_LENGTH / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[HALL_HALLWAY_WIDTH * 2, HALLWAY_LENGTH]} />
        <meshStandardMaterial color="#0e1a1f" metalness={0.3} roughness={0.65} />
      </mesh>

      {/* Hallway ceiling */}
      <mesh
        position={[0, HALLWAY_HEIGHT, HALLWAY_LENGTH / 2]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[HALL_HALLWAY_WIDTH * 2, HALLWAY_LENGTH]} />
        <meshStandardMaterial color="#0a1216" metalness={0.2} roughness={0.8} />
      </mesh>

      {/* Left wall */}
      <mesh
        position={[-wallX, HALLWAY_HEIGHT / 2, HALLWAY_LENGTH / 2]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[HALLWAY_LENGTH, HALLWAY_HEIGHT]} />
        <meshStandardMaterial color="#0d1d22" metalness={0.25} roughness={0.7} />
      </mesh>

      {/* Right wall */}
      <mesh
        position={[wallX, HALLWAY_HEIGHT / 2, HALLWAY_LENGTH / 2]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <planeGeometry args={[HALLWAY_LENGTH, HALLWAY_HEIGHT]} />
        <meshStandardMaterial color="#0d1d22" metalness={0.25} roughness={0.7} />
      </mesh>

      {/* Sconces — small emissive plates on each wall. */}
      {[2, 5].map((z, i) => (
        <group key={`s-${i}`}>
          <mesh position={[-wallX + 0.02, 2.1, z]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.18, 0.45]} />
            <meshBasicMaterial color={SCONCE_GLOW} transparent opacity={0.85} />
          </mesh>
          <pointLight
            position={[-wallX + 0.3, 2.1, z]}
            color={SCONCE_GLOW}
            intensity={0.35}
            distance={3.2}
            decay={2}
          />
          <mesh position={[wallX - 0.02, 2.1, z]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[0.18, 0.45]} />
            <meshBasicMaterial color={SCONCE_GLOW} transparent opacity={0.85} />
          </mesh>
          <pointLight
            position={[wallX - 0.3, 2.1, z]}
            color={SCONCE_GLOW}
            intensity={0.35}
            distance={3.2}
            decay={2}
          />
        </group>
      ))}

      {/* Doorframe columns + lintel. Local z=0 sits at the door plane; the
       *  user (outside) faces local -Z, so the frame's outward face is at -Z. */}
      <mesh position={[-DOOR_W / 2 - 0.18, DOOR_H / 2 + 0.1, 0]} castShadow>
        <boxGeometry args={[0.36, DOOR_H + 0.2, 0.5]} />
        <meshStandardMaterial color={BRASS_BASE} metalness={0.85} roughness={0.32} />
      </mesh>
      <mesh position={[DOOR_W / 2 + 0.18, DOOR_H / 2 + 0.1, 0]} castShadow>
        <boxGeometry args={[0.36, DOOR_H + 0.2, 0.5]} />
        <meshStandardMaterial color={BRASS_BASE} metalness={0.85} roughness={0.32} />
      </mesh>
      {/* Lintel — brass capital across the doorway. */}
      <mesh position={[0, DOOR_H + 0.32, 0]} castShadow>
        <boxGeometry args={[DOOR_W + 0.72, 0.44, 0.5]} />
        <meshStandardMaterial
          ref={archMatRef}
          color={BRASS_BRIGHT}
          metalness={0.9}
          roughness={0.25}
          emissive={BRASS_GLOW}
          emissiveIntensity={0.12}
        />
      </mesh>

      {/* Door slab — closed by default, fades + shrinks toward the lintel. */}
      <mesh
        ref={doorRef}
        position={[0, DOOR_H / 2, -0.02]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <boxGeometry args={[DOOR_W, DOOR_H, 0.08]} />
        <meshStandardMaterial
          ref={doorMatRef}
          color="#1a1410"
          metalness={0.55}
          roughness={0.45}
          emissive={BRASS_GLOW}
          emissiveIntensity={0.04}
          transparent
        />
      </mesh>

      {/* ENTER text — sits just outside the lintel, facing the user (local -Z). */}
      <Text
        position={[0, DOOR_H + 1.0, -0.3]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.42}
        letterSpacing={0.28}
        anchorX="center"
        anchorY="middle"
        color={BRASS_GLOW}
      >
        ENTER
        <meshBasicMaterial
          ref={enterTextMatRef}
          attach="material"
          color={BRASS_GLOW}
          transparent
          opacity={0.6}
        />
      </Text>

      {/* Practical fill light just outside the door — gives the doorframe
       *  brass a directional highlight when the camera approaches. */}
      <pointLight
        position={[0, DOOR_H, -1.6]}
        color={BRASS_GLOW}
        intensity={0.85}
        distance={5}
        decay={2}
      />
    </group>
  );
};

export default Entrance;
