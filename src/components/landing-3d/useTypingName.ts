/** @format */

import { useEffect, useState } from "react";

export function useTypingName(fullName: string): { typed: string; showCursor: boolean } {
  const [typed, setTyped] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let i = 0;
    setTyped("");
    const delay = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setTyped(fullName.slice(0, i));
        if (i >= fullName.length) clearInterval(interval);
      }, 75);
    }, 400);
    return () => clearTimeout(delay);
  }, [fullName]);

  useEffect(() => {
    const id = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  return { typed, showCursor };
}
