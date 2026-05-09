/** @format */

import React from "react";
import { AMBIENT_SCENES } from "./types.ts";
import { useAmbientScene } from "./useAmbientScene.ts";

const AmbientToggle: React.FC = () => {
  const { sceneId, setSceneId } = useAmbientScene();
  return (
    <div className="ambient-toggle" role="radiogroup" aria-label="Ambient background">
      <span className="ambient-toggle-label">ambient:</span>
      {AMBIENT_SCENES.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={sceneId === s.id}
          title={s.title}
          className={`ambient-toggle-btn${sceneId === s.id ? " is-active" : ""}`}
          onClick={() => setSceneId(s.id)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
};

export default AmbientToggle;
