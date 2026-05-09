/** @format */

import React from "react";
import { Html } from "@react-three/drei";
import { TERMINAL_THEME } from "../colors.ts";

interface FloatingLabelProps {
  text: string;
  sub?: string;
  visible?: boolean;
  offset?: [number, number, number];
}

const FloatingLabel: React.FC<FloatingLabelProps> = ({
  text,
  sub,
  visible = true,
  offset = [0, 0.6, 0],
}) => {
  if (!visible) return null;
  return (
    <Html position={offset} center distanceFactor={6} occlude={false}>
      <div
        style={{
          padding: "4px 8px",
          background: TERMINAL_THEME.panel,
          border: `1px solid ${TERMINAL_THEME.line}`,
          color: TERMINAL_THEME.ink,
          fontFamily: TERMINAL_THEME.font,
          fontSize: 11,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          userSelect: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ color: TERMINAL_THEME.accent }}>{text}</div>
        {sub && (
          <div style={{ color: TERMINAL_THEME.mute, fontSize: 10, marginTop: 2 }}>{sub}</div>
        )}
      </div>
    </Html>
  );
};

export default FloatingLabel;
