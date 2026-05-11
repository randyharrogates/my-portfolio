/** @format */

import React, { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const ACCENT = "#e8632a";
const PUB = process.env.PUBLIC_URL;

const KEYBOARD_GLB = `${PUB}/models/keyboard/keyboard.glb`;
const MUG_GLB = `${PUB}/models/mug/mug.glb`;
const CHAIR_GLB = `${PUB}/models/chair/chair.glb`;
const TOWER_GLB = `${PUB}/models/tower/tower.glb`;

useGLTF.preload(KEYBOARD_GLB);
useGLTF.preload(MUG_GLB);
useGLTF.preload(CHAIR_GLB);
useGLTF.preload(TOWER_GLB);

interface FittedGltf {
  scene: THREE.Object3D;
  /** Uniform scale applied by the wrapping group. */
  scale: number;
  /** Bounding-box min Y *after* scaling — use to place the wrapping group's
   *  Y so the model rests on a target world-Y (e.g. group.y = floorY - worldMinY). */
  worldMinY: number;
  /** Bounding-box min Y in pre-scale local space — use to position decorations
   *  added as children of the wrapping group (they share its scale). */
  localMinY: number;
  /** Bounding-box max Y in pre-scale local space — use to place decorations
   *  at the top of the model (e.g. steam above a mug). */
  localMaxY: number;
  /** Bounding-box min Z *after* scaling — useful when the GLTF pivot is not
   *  centered in Z and we need to know where the back of the model sits. */
  worldMinZ: number;
  /** Bounding-box max Z *after* scaling — front-of-model in world units. */
  worldMaxZ: number;
}

/** Clone a loaded GLTF scene, mark it shadow-aware, and compute a uniform
 *  scale factor that maps the model's X-axis bounding-box extent to
 *  `targetWidth`. Note: assumes the source asset is authored with X as the
 *  wide axis (typical for Sketchfab office props). If a model ships with a
 *  rotated authoring frame, the fit will be off — visible only after the
 *  asset loads. */
function useFittedGltf(url: string, targetWidth: number): FittedGltf {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = size.x > 0 ? targetWidth / size.x : 1;
    return {
      scene: clone,
      scale,
      worldMinY: box.min.y * scale,
      localMinY: box.min.y,
      localMaxY: box.max.y,
      worldMinZ: box.min.z * scale,
      worldMaxZ: box.max.z * scale,
    };
  }, [scene, targetWidth]);
}

interface AssetBoundaryState {
  hasError: boolean;
}

/** ErrorBoundary used to render the primitive fallback if the GLB itself
 *  fails to load (404 / network error). React Suspense only catches
 *  suspended-resource throws, not loader errors, so without this a missing
 *  asset crashes the entire canvas tree. */
class AssetBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  AssetBoundaryState
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): AssetBoundaryState {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    // Surface the failure once so we know if a deploy is missing assets.
    // eslint-disable-next-line no-console
    console.warn("[workstation] GLTF asset failed to load:", error.message);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

interface KeyboardProps {
  reducedMotion: boolean;
}

/** Mechanical keyboard — GLTF with breathing accent-light underglow. */
const KeyboardGltf: React.FC<{ reducedMotion: boolean }> = ({
  reducedMotion,
}) => {
  const litRef = useRef<THREE.MeshStandardMaterial>(null);
  const { scene, scale, worldMinY, localMinY } = useFittedGltf(
    KEYBOARD_GLB,
    0.95
  );
  useFrame((s) => {
    if (!litRef.current || reducedMotion) return;
    const t = s.clock.elapsedTime;
    litRef.current.emissiveIntensity =
      0.4 + (Math.sin(t * 1.0) * 0.5 + 0.5) * 0.7;
  });
  // Position the wrapping group so model bottom rests at y=0.045 (just
  // above the desk top + LED strip). yOffset uses post-scale Y delta.
  const yOffset = 0.045 - worldMinY;
  return (
    <group position={[0, yOffset, 0.46]} scale={scale}>
      <primitive object={scene} />
      {/* Underside accent-light spill — kept from primitive build so the
       *  warm underglow stays on-brand. Positioned just below the model's
       *  local min Y; the wrapping group's scale takes care of physical
       *  size. Geometry is in the same pre-scale coordinate space. */}
      <mesh position={[0, localMinY - 0.012, 0]} renderOrder={-1}>
        <boxGeometry args={[0.94, 0.004, 0.31]} />
        <meshStandardMaterial
          ref={litRef}
          color={ACCENT}
          emissive={ACCENT}
          emissiveIntensity={0.7}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

/** Fallback used while the GLTF loads (Suspense boundary) and as a hard
 *  fallback if the asset is missing. Primitive body + keys with the
 *  clearcoat material upgrade. */
const KeyboardPrimitive: React.FC<{ reducedMotion: boolean }> = ({
  reducedMotion,
}) => {
  const litRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((s) => {
    if (!litRef.current || reducedMotion) return;
    const t = s.clock.elapsedTime;
    litRef.current.emissiveIntensity =
      0.4 + (Math.sin(t * 1.0) * 0.5 + 0.5) * 0.7;
  });
  const keys: [number, number][] = [];
  for (let row = 0; row < 4; row++) for (let col = 0; col < 11; col++) keys.push([col, row]);
  return (
    <group position={[0, 0.062, 0.46]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.045, 0.32]} />
        <meshPhysicalMaterial
          color="#13110f"
          roughness={0.6}
          metalness={0.3}
          envMapIntensity={1.1}
          clearcoat={0.3}
          clearcoatRoughness={0.4}
        />
      </mesh>
      <mesh position={[0, -0.01, 0]}>
        <boxGeometry args={[0.94, 0.004, 0.31]} />
        <meshStandardMaterial
          ref={litRef}
          color={ACCENT}
          emissive={ACCENT}
          emissiveIntensity={0.7}
        />
      </mesh>
      {keys.map(([col, row]) => {
        const x = -0.41 + col * 0.082;
        const z = -0.12 + row * 0.07;
        return (
          <mesh key={`${col}-${row}`} position={[x, 0.03, z]} castShadow>
            <boxGeometry args={[0.06, 0.018, 0.055]} />
            <meshPhysicalMaterial
              color="#1f1c19"
              roughness={0.42}
              metalness={0.05}
              envMapIntensity={1.1}
              clearcoat={0.6}
              clearcoatRoughness={0.25}
            />
          </mesh>
        );
      })}
      <mesh position={[0, 0.03, 0.16]} castShadow>
        <boxGeometry args={[0.42, 0.018, 0.045]} />
        <meshPhysicalMaterial
          color="#1f1c19"
          roughness={0.42}
          metalness={0.05}
          envMapIntensity={1.1}
          clearcoat={0.6}
          clearcoatRoughness={0.25}
        />
      </mesh>
    </group>
  );
};

export const Keyboard: React.FC<KeyboardProps> = ({ reducedMotion }) => (
  <AssetBoundary fallback={<KeyboardPrimitive reducedMotion={reducedMotion} />}>
    <Suspense fallback={<KeyboardPrimitive reducedMotion={reducedMotion} />}>
      <KeyboardGltf reducedMotion={reducedMotion} />
    </Suspense>
  </AssetBoundary>
);

/** Trackpad. */
export const Trackpad: React.FC = () => (
  <mesh position={[0.62, 0.07, 0.5]} castShadow>
    <boxGeometry args={[0.26, 0.014, 0.2]} />
    <meshStandardMaterial color="#23201d" roughness={0.4} metalness={0.3} envMapIntensity={0.8} />
  </mesh>
);

/** Procedural ceramic-mug label texture: white background, "RANDY'S WORKSTATION"
 * text wrapped horizontally, designed so a single repeat covers the cylinder. */
function makeMugLabelTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }
  // Off-white ceramic body
  ctx.fillStyle = "#ece4d8";
  ctx.fillRect(0, 0, w, h);
  // Subtle horizontal noise so the surface doesn't look perfectly flat
  for (let i = 0; i < 280; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const a = Math.random() * 0.06;
    ctx.fillStyle = `rgba(80,70,55,${a})`;
    ctx.fillRect(x, y, 1, 2);
  }
  // Accent band, top + bottom
  ctx.fillStyle = "#e8632a";
  ctx.fillRect(0, h * 0.1, w, 4);
  ctx.fillRect(0, h * 0.86, w, 4);
  // Label text — repeated twice across the wrap so it reads from any angle
  ctx.fillStyle = "#1a1614";
  ctx.font = "bold 60px 'JetBrains Mono', ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("RANDY'S WORKSTATION", w * 0.25, h * 0.5);
  ctx.fillText("RANDY'S WORKSTATION", w * 0.75, h * 0.5);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/** Mug with rising steam particles. */
interface MugProps {
  reducedMotion: boolean;
}

const MugGltf: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const steamRef = useRef<THREE.Points>(null);
  // Target mug width ~0.15m (cylinder radius ~0.07).
  const { scene, scale, worldMinY, localMaxY } = useFittedGltf(MUG_GLB, 0.15);
  const positions = useMemo(() => {
    const arr = new Float32Array(20 * 3);
    for (let i = 0; i < 20; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.04;
      arr[i * 3 + 1] = Math.random() * 0.4;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
    }
    return arr;
  }, []);

  useFrame((s) => {
    if (!steamRef.current || reducedMotion) return;
    const t = s.clock.elapsedTime;
    const arr = steamRef.current.geometry.attributes.position
      .array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] += 0.0035;
      arr[i] += Math.sin(t * 0.8 + i) * 0.0007;
      if (arr[i + 1] > 0.45) {
        arr[i + 1] = 0;
        arr[i] = (Math.random() - 0.5) * 0.04;
        arr[i + 2] = (Math.random() - 0.5) * 0.04;
      }
    }
    steamRef.current.geometry.attributes.position.needsUpdate = true;
    const mat = steamRef.current.material as THREE.PointsMaterial;
    if (mat) mat.opacity = 0.18;
  });

  // Position so mug bottom sits on desk top (y=0.045 post-scale).
  const yOffset = 0.045 - worldMinY;
  return (
    <group position={[-1.18, yOffset, 0.42]} scale={scale}>
      <primitive object={scene} />
      {/* Steam — procedural rising particles above the mug top. Children
       *  inherit the wrapping group's scale, so use pre-scale Y. */}
      <points
        ref={steamRef}
        position={[0, localMaxY + 0.02, 0]}
        frustumCulled={false}
      >
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#c8bfb5"
          size={0.018 / scale}
          transparent
          opacity={0.18}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
};

const MugPrimitive: React.FC = () => {
  const labelTex = useMemo(makeMugLabelTexture, []);
  return (
    <group position={[-1.18, 0.16, 0.42]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.07, 0.06, 0.18, 32, 1, true]} />
        <meshPhysicalMaterial
          map={labelTex}
          roughness={0.45}
          metalness={0.0}
          envMapIntensity={1.2}
          clearcoat={1.0}
          clearcoatRoughness={0.06}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, -0.089, 0]}>
        <circleGeometry args={[0.06, 32]} />
        <meshStandardMaterial color="#ece4d8" roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.062, 0.062, 0.005, 32]} />
        <meshStandardMaterial color="#2a1c12" roughness={0.4} />
      </mesh>
      <mesh position={[0.085, 0.0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <torusGeometry args={[0.045, 0.012, 12, 28, Math.PI]} />
        <meshPhysicalMaterial
          color="#ece4d8"
          roughness={0.45}
          metalness={0.0}
          envMapIntensity={1.2}
          clearcoat={1.0}
          clearcoatRoughness={0.06}
        />
      </mesh>
    </group>
  );
};

export const Mug: React.FC<MugProps> = ({ reducedMotion }) => (
  <AssetBoundary fallback={<MugPrimitive />}>
    <Suspense fallback={<MugPrimitive />}>
      <MugGltf reducedMotion={reducedMotion} />
    </Suspense>
  </AssetBoundary>
);

/** Notebook (decorative only) — leather cover finish via clearcoat. */
export const Notebook: React.FC = () => (
  <mesh position={[-0.85, 0.06, 0.55]} rotation={[0, 0.18, 0]} castShadow>
    <boxGeometry args={[0.32, 0.025, 0.22]} />
    <meshPhysicalMaterial
      color="#5e2e1d"
      roughness={0.55}
      metalness={0}
      clearcoat={0.3}
      clearcoatRoughness={0.5}
      envMapIntensity={0.9}
    />
  </mesh>
);

/** Server tower with rubber-duck konami easter-egg. The detailed body now
 *  comes from a Zalman tower-case GLTF; the konami "lid opens / duck pops
 *  out" overlay stays as primitives layered on top so the easter egg works
 *  regardless of the loaded asset's geometry. */
interface ServerTowerProps {
  reducedMotion: boolean;
  konami: boolean;
}

const ServerTowerGltf: React.FC<ServerTowerProps> = ({ konami }) => {
  // Target ~0.42m wide to match the primitive footprint so the chair /
  // desk-leg relationship doesn't shift.
  const { scene, scale, worldMinY, localMaxY } = useFittedGltf(
    TOWER_GLB,
    0.42
  );
  // Position so the tower sits on the floor (y=-0.91).
  const yOffset = -0.91 - worldMinY;
  return (
    <group position={[-2.0, yOffset, -0.4]} scale={scale}>
      <primitive object={scene} />
      {/* Rubber duck — appears on top when konami fires. Positioned at
       *  the model's local top + a small Y offset. Children inherit the
       *  wrapping group's scale, so the duck stays in pre-scale space;
       *  we counter-scale it (0.6 / scale) so it reads at the same world
       *  size as the primitive build's konami duck. */}
      {konami && (
        <group position={[0, localMaxY + 0.05, 0]} scale={0.6 / scale}>

          <mesh>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#fdd23a" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshStandardMaterial color="#fdd23a" roughness={0.5} />
          </mesh>
          <mesh position={[0.07, 0.11, 0]} rotation={[0, 0, -0.2]}>
            <coneGeometry args={[0.025, 0.05, 8]} />
            <meshStandardMaterial color={ACCENT} roughness={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
};

const ServerTowerPrimitive: React.FC<ServerTowerProps> = ({
  reducedMotion,
  konami,
}) => {
  const lidRef = useRef<THREE.Group>(null);
  const fanRef = useRef<THREE.Mesh>(null);
  const ledRefs = useRef<THREE.Mesh[]>([]);
  const phasesRef = useRef<number[]>(
    new Array(5).fill(0).map(() => Math.random() * 10)
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (fanRef.current && !reducedMotion) {
      fanRef.current.rotation.z += 0.04;
    }
    ledRefs.current.forEach((m, i) => {
      if (!m) return;
      const phase = phasesRef.current[i];
      const on = ((Math.sin(t * (0.7 + i * 0.3) + phase) + 1) * 0.5) > 0.6;
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = on ? 1.6 : 0.05;
    });
    if (lidRef.current) {
      const target = konami ? -Math.PI / 2 : 0;
      lidRef.current.rotation.x +=
        (target - lidRef.current.rotation.x) * 0.08;
    }
  });
  return (
    <group position={[-2.0, -0.46, -0.4]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.95, 0.5]} />
        <meshPhysicalMaterial
          color="#1a1714"
          roughness={0.55}
          metalness={0.4}
          envMapIntensity={1.1}
          clearcoat={0.25}
          clearcoatRoughness={0.55}
        />
      </mesh>
      <mesh position={[0.215, 0, 0]}>
        <boxGeometry args={[0.005, 0.92, 0.48]} />
        <meshPhysicalMaterial
          color="#2a2825"
          roughness={0.4}
          metalness={0.85}
          envMapIntensity={1.1}
          anisotropy={0.6}
        />
      </mesh>
      {[0.3, 0.18, 0.06, -0.06, -0.18].map((y, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) ledRefs.current[i] = el;
          }}
          position={[0.22, y, 0.18]}
        >
          <boxGeometry args={[0.005, 0.018, 0.04]} />
          <meshStandardMaterial
            color={i === 0 ? ACCENT : i === 1 ? "#4ade80" : "#60a5fa"}
            emissive={i === 0 ? ACCENT : i === 1 ? "#4ade80" : "#60a5fa"}
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}
      <group position={[0.22, -0.3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh ref={fanRef}>
          <ringGeometry args={[0.02, 0.09, 16]} />
          <meshStandardMaterial
            color="#23201d"
            emissive={ACCENT}
            emissiveIntensity={0.18}
            side={THREE.DoubleSide}
          />
        </mesh>
        {[0, 1, 2, 3, 4].map((b) => (
          <mesh key={b} rotation={[0, 0, (Math.PI * 2 * b) / 5]}>
            <boxGeometry args={[0.085, 0.018, 0.005]} />
            <meshStandardMaterial color="#3a3532" roughness={0.6} />
          </mesh>
        ))}
      </group>
      <group ref={lidRef} position={[0, 0.475, 0]}>
        <mesh position={[0, 0.005, 0]}>
          <boxGeometry args={[0.42, 0.012, 0.5]} />
          <meshStandardMaterial color="#1d1a17" roughness={0.6} metalness={0.4} envMapIntensity={0.8} />
        </mesh>
      </group>
      {konami && (
        <group position={[0, 0.45, 0]} scale={0.6}>
          <mesh>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#fdd23a" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshStandardMaterial color="#fdd23a" roughness={0.5} />
          </mesh>
          <mesh position={[0.07, 0.11, 0]} rotation={[0, 0, -0.2]}>
            <coneGeometry args={[0.025, 0.05, 8]} />
            <meshStandardMaterial color={ACCENT} roughness={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
};

export const ServerTower: React.FC<ServerTowerProps> = (props) => (
  <AssetBoundary fallback={<ServerTowerPrimitive {...props} />}>
    <Suspense fallback={<ServerTowerPrimitive {...props} />}>
      <ServerTowerGltf {...props} />
    </Suspense>
  </AssetBoundary>
);

/** Server-rack panel that holds the three small monitors on the right. */
export const ServerRackPanel: React.FC = () => (
  <mesh position={[2.18, 0.95, -0.2]} rotation={[0, -Math.PI / 2.4, 0]}>
    <boxGeometry args={[0.7, 1.6, 0.06]} />
    <meshStandardMaterial color="#0e0c0b" roughness={0.85} metalness={0.2} envMapIntensity={0.8} />
  </mesh>
);

/** Office chair with sin-wave micro-sway and konami spin. */
interface ChairProps {
  reducedMotion: boolean;
  konami: boolean;
}

const ChairGltf: React.FC<ChairProps> = ({ reducedMotion, konami }) => {
  const ref = useRef<THREE.Group>(null);
  const spinRef = useRef(0);
  // Target chair width ~0.65m to match the desk/keyboard scale.
  const { scene, scale, worldMinY, worldMinZ } = useFittedGltf(
    CHAIR_GLB,
    0.65
  );

  useFrame((s) => {
    if (!ref.current) return;
    const t = s.clock.elapsedTime;
    if (konami) {
      spinRef.current += 0.18;
      ref.current.rotation.y = spinRef.current;
      if (spinRef.current > Math.PI * 4) spinRef.current = 0;
    } else if (!reducedMotion) {
      ref.current.rotation.y = Math.sin(t * 0.6) * 0.04;
    }
  });

  // Position the GLTF so its bottom rests on the floor (y=-0.91).
  const yOffset = -0.91 - worldMinY;
  // Place the chair so its nearest-to-desk edge sits at world Z = 1.1
  // (0.3m clear of the desk front face at Z = 0.8). Computed from the
  // model's scaled Z bounds so we don't depend on where the GLTF's
  // authored pivot lives along Z — without this, an off-center pivot lets
  // the backrest intersect the desk volume.
  const CHAIR_MIN_Z = 1.1;
  const zOffset = CHAIR_MIN_Z - worldMinZ;
  return (
    <group ref={ref} position={[-0.6, yOffset, zOffset]} scale={scale}>
      <primitive object={scene} />
    </group>
  );
};

const ChairPrimitive: React.FC<ChairProps> = ({ reducedMotion, konami }) => {
  const ref = useRef<THREE.Group>(null);
  const spinRef = useRef(0);
  useFrame((s) => {
    if (!ref.current) return;
    const t = s.clock.elapsedTime;
    if (konami) {
      spinRef.current += 0.18;
      ref.current.rotation.y = spinRef.current;
      if (spinRef.current > Math.PI * 4) spinRef.current = 0;
    } else if (!reducedMotion) {
      ref.current.rotation.y = Math.sin(t * 0.6) * 0.04;
    }
  });
  return (
    <group ref={ref} position={[-0.6, -0.3, 1.45]}>
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.55, 0.08, 0.5]} />
        <meshPhysicalMaterial
          color="#1a1614"
          roughness={0.55}
          metalness={0}
          clearcoat={0.35}
          clearcoatRoughness={0.55}
          envMapIntensity={0.9}
        />
      </mesh>
      <mesh position={[0, 0.45, -0.2]} castShadow>
        <boxGeometry args={[0.55, 0.85, 0.06]} />
        <meshPhysicalMaterial
          color="#1a1614"
          roughness={0.55}
          metalness={0}
          clearcoat={0.35}
          clearcoatRoughness={0.55}
          envMapIntensity={0.9}
        />
      </mesh>
      <mesh position={[-0.31, 0.18, 0]}>
        <boxGeometry args={[0.04, 0.4, 0.32]} />
        <meshPhysicalMaterial
          color="#1a1614"
          roughness={0.55}
          metalness={0}
          clearcoat={0.35}
          clearcoatRoughness={0.55}
        />
      </mesh>
      <mesh position={[0.31, 0.18, 0]}>
        <boxGeometry args={[0.04, 0.4, 0.32]} />
        <meshPhysicalMaterial
          color="#1a1614"
          roughness={0.55}
          metalness={0}
          clearcoat={0.35}
          clearcoatRoughness={0.55}
        />
      </mesh>
      <mesh position={[0, -0.24, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.4, 12]} />
        <meshStandardMaterial color="#1f1c19" roughness={0.4} metalness={0.7} envMapIntensity={0.8} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (Math.PI * 2 * i) / 5;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.25, -0.45, Math.sin(a) * 0.25]}
          >
            <sphereGeometry args={[0.04, 10, 10]} />
            <meshStandardMaterial color="#0a0908" roughness={0.5} metalness={0.4} envMapIntensity={0.8} />
          </mesh>
        );
      })}
    </group>
  );
};

export const Chair: React.FC<ChairProps> = (props) => (
  <AssetBoundary fallback={<ChairPrimitive {...props} />}>
    <Suspense fallback={<ChairPrimitive {...props} />}>
      <ChairGltf {...props} />
    </Suspense>
  </AssetBoundary>
);

