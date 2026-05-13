/** @format */

import React, { useMemo } from "react";
import * as THREE from "three";
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial } from "three/webgpu";

interface SignboardProps {
  /** World position of the post's base. */
  position: [number, number, number];
  /** Yaw rotation (radians) so the plank face turns to the camera. */
  rotationY?: number;
  /** Plank text (rendered onto a canvas texture). */
  text?: string;
  /** Overall scale of the signboard (post + plank). Use >1 for longer
   *  text so the plank stays readable. Default 1. */
  scale?: number;
}

/** Build a 1024×512 canvas with neon hand-painted text + arrow, return
 *  it as a Three.js CanvasTexture suitable for a `MeshBasicNodeMaterial`.
 *  The arrow points right (→ direction) so the sign should be placed to
 *  the LEFT of the thing it indicates, with the plank facing the camera.
 */
function buildSignTexture(text: string): THREE.CanvasTexture {
  // Canvas is sized to the text — wide-aspect for long words so the
  // letters don't get clipped or shrunk into the plank corners.
  const charCount = Math.max(text.length, 6);
  // Each letter ~110 px wide (italic bold mono), plus side margins
  const w = Math.max(1024, charCount * 110 + 220);
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;

  // Plank gradient backdrop — warm wood tones so the sign reads as a
  // physical object even before it picks up scene tinting.
  const planks = ctx.createLinearGradient(0, 0, 0, h);
  planks.addColorStop(0, "#4a2e1d");
  planks.addColorStop(0.5, "#6a3f24");
  planks.addColorStop(1, "#3d2417");
  ctx.fillStyle = planks;
  ctx.fillRect(0, 0, w, h);

  // Faint horizontal plank seams for woodgrain feel.
  ctx.strokeStyle = "rgba(20, 10, 4, 0.55)";
  ctx.lineWidth = 4;
  for (const y of [h * 0.32, h * 0.66]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Nail / rivet dots at corners.
  ctx.fillStyle = "#1a0f08";
  for (const [x, y] of [[40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40]]) {
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
  }

  // Magenta border that mirrors the scene's key-light hue. Two passes
  // (outer thick, inner thin) read as a hand-painted frame stroke.
  ctx.strokeStyle = "#ff5fa8";
  ctx.lineWidth = 14;
  ctx.strokeRect(28, 28, w - 56, h - 56);
  ctx.strokeStyle = "#ffb05a";
  ctx.lineWidth = 4;
  ctx.strokeRect(60, 60, w - 120, h - 120);

  // Big funky neon text — tilted slightly for the "funky" feel.
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.04);
  ctx.font = "bold italic 168px 'JetBrains Mono', 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Cyan glow outline (matches scene rim light).
  ctx.shadowColor = "#5feaff";
  ctx.shadowBlur = 24;
  ctx.strokeStyle = "#0a0414";
  ctx.lineWidth = 14;
  ctx.strokeText(text, 0, -20);
  // Warm amber fill (matches the orb itself).
  ctx.shadowColor = "#ffb05a";
  ctx.shadowBlur = 30;
  ctx.fillStyle = "#ffd97a";
  ctx.fillText(text, 0, -20);
  ctx.restore();

  // Big arrow under the text, pointing right (toward the orb).
  const ax0 = w * 0.30;
  const ax1 = w * 0.70;
  const ay = h * 0.78;
  ctx.shadowColor = "#5feaff";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = "#ffd97a";
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ax0, ay);
  ctx.lineTo(ax1, ay);
  ctx.stroke();
  // Arrowhead.
  ctx.beginPath();
  ctx.moveTo(ax1, ay);
  ctx.lineTo(ax1 - 38, ay - 32);
  ctx.moveTo(ax1, ay);
  ctx.lineTo(ax1 - 38, ay + 32);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/** A "big funky signboard" — tilted wooden post with a hand-painted
 *  plank pointing to the doorway orb. Renders entirely under WebGPU's
 *  NodeMaterial path: text comes from a canvas texture sampled by a
 *  `MeshBasicNodeMaterial` so the sign stays readable even when the
 *  scene's directional rig misses the front face.
 */
const Signboard: React.FC<SignboardProps> = ({
  position,
  rotationY = 0,
  text = "ABOUT ME",
  scale = 1,
}) => {
  const signTex = useMemo(() => buildSignTexture(text), [text]);

  // Plank material — emissive-from-texture so the sign self-lights and
  // reads against the dark archipelago even in deep shade.
  const plankMaterial = useMemo(() => {
    const mat = new MeshBasicNodeMaterial();
    mat.map = signTex;
    mat.toneMapped = false;
    return mat;
  }, [signTex]);

  // Wooden post material — dark stained wood with a small magenta
  // self-light so it doesn't fall to pure black silhouette.
  const postMaterial = useMemo(() => {
    const mat = new MeshStandardNodeMaterial({
      color: new THREE.Color(0.18, 0.10, 0.06),
      roughness: 0.85,
      emissive: new THREE.Color(0.12, 0.04, 0.08),
      emissiveIntensity: 0.6,
    });
    return mat;
  }, []);

  // Post height + plank dimensions tuned to read at the about-camera
  // distance (~12-14m away). Plank tilts back ~6° so it looks hand-hung.
  // Plank width also stretches with text length so long phrases like
  // "CASE STUDIES" fit without clipping the leading/trailing characters.
  const charCount = Math.max(text.length, 6);
  const widthFactor = Math.max(1, charCount / 8); // 8-char baseline
  const postHeight = 3.4;
  const plankW = 3.2 * widthFactor;
  const plankH = 1.6;
  const plankTilt = -0.10;

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={[scale, scale, scale]}>
      {/* Post — small cylinder rising from the ground. */}
      <mesh
        position={[0, postHeight / 2, 0]}
        rotation={[0, 0, 0.04]}
      >
        <cylinderGeometry args={[0.13, 0.16, postHeight, 10]} />
        <primitive object={postMaterial} attach="material" />
      </mesh>
      {/* Cross-brace at the top of the post for the "fence sign" feel. */}
      <mesh position={[0, postHeight - 0.15, 0]}>
        <boxGeometry args={[0.6, 0.12, 0.12]} />
        <primitive object={postMaterial} attach="material" />
      </mesh>
      {/* Plank — tilted back slightly so it reads hand-hung. */}
      <group
        position={[0, postHeight - 0.05, 0]}
        rotation={[plankTilt, 0, 0.02]}
      >
        <mesh>
          <boxGeometry args={[plankW, plankH, 0.08]} />
          <primitive object={plankMaterial} attach="material" />
        </mesh>
        {/* Thin chain-style risers — two short bars connecting the
            plank to the cross-brace, giving the "hanging sign" silhouette. */}
        <mesh position={[-plankW * 0.32, plankH * 0.55, 0]}>
          <boxGeometry args={[0.05, 0.4, 0.05]} />
          <primitive object={postMaterial} attach="material" />
        </mesh>
        <mesh position={[plankW * 0.32, plankH * 0.55, 0]}>
          <boxGeometry args={[0.05, 0.4, 0.05]} />
          <primitive object={postMaterial} attach="material" />
        </mesh>
      </group>
    </group>
  );
};

export default Signboard;
