/** @format */

import React, { useEffect } from "react";

const KONAMI = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];

interface EasterEggProps {
  onTrigger: () => void;
}

const EasterEgg: React.FC<EasterEggProps> = ({ onTrigger }) => {
  useEffect(() => {
    let buffer: string[] = [];
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      buffer.push(k);
      if (buffer.length > KONAMI.length) buffer = buffer.slice(-KONAMI.length);
      if (
        buffer.length === KONAMI.length &&
        buffer.every((kk, i) => kk === KONAMI[i])
      ) {
        onTrigger();
        buffer = [];
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onTrigger]);

  return null;
};

export default EasterEgg;
