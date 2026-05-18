/** @format */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  HALL_TUTORIAL_KEYS,
  readTutorialFlag,
  useHallSettings,
  writeTutorialFlag,
} from "./useHallSettings.ts";
import "./MobileTutorial.css";

interface MobileTutorialProps {
  /** Only mounted on mobile viewports (≤720 px) by the caller. */
  visible: boolean;
  onDismiss: () => void;
}

interface CardSpec {
  icon: React.ReactNode;
  headline: string;
  body: string;
}

const CARDS: CardSpec[] = [
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="6" fill="#4dd0c4" />
        <circle
          cx="24"
          cy="24"
          r="14"
          stroke="rgba(77, 208, 196, 0.5)"
          strokeWidth="1.5"
          fill="none"
        />
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke="rgba(77, 208, 196, 0.2)"
          strokeWidth="1"
          fill="none"
        />
      </svg>
    ),
    headline: "tap a glowing orb",
    body: "Each orb floats above a landmark on the hub island. Tap one to enter that section.",
  },
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
        <path
          d="M14 24 L14 14 L24 14"
          stroke="#4dd0c4"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M34 24 L34 34 L24 34"
          stroke="#4dd0c4"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="24" cy="24" r="6" fill="rgba(77, 208, 196, 0.4)" />
        <path
          d="M14 14 L34 34 M34 14 L14 34"
          stroke="rgba(77, 208, 196, 0.3)"
          strokeWidth="1.2"
        />
      </svg>
    ),
    headline: "drag to look around",
    body: "Drag anywhere on screen to rotate the camera. Pinch — coming soon — will zoom; for now use the bar to focus a landmark.",
  },
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
        <rect
          x="6"
          y="32"
          width="36"
          height="10"
          rx="2"
          stroke="#4dd0c4"
          strokeWidth="1.5"
          fill="rgba(77, 208, 196, 0.12)"
        />
        <circle cx="14" cy="37" r="1.6" fill="#4dd0c4" />
        <circle cx="24" cy="37" r="1.6" fill="#e8b45a" />
        <circle cx="34" cy="37" r="1.6" fill="#a7b5b0" />
        <path
          d="M20 18 L24 12 L28 18 M24 12 L24 26"
          stroke="#e8b45a"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    ),
    headline: "use the bottom bar",
    body: "Switch view modes, open the map, or skip ahead to the terminal portfolio. Tap the gear for sensitivity, FOV, and more.",
  },
];

const MobileTutorial: React.FC<MobileTutorialProps> = ({ visible, onDismiss }) => {
  const { resetEpoch } = useHallSettings();
  const [active, setActive] = useState<boolean>(() => {
    if (!visible) return false;
    return !readTutorialFlag(HALL_TUTORIAL_KEYS.mobileDeck);
  });
  const [idx, setIdx] = useState(0);
  const swipeRef = useRef({
    startX: 0,
    startY: 0,
    active: false,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Re-arm whenever the visible flag flips back on or the user hits
  // "reset all + replay tutorial" (resetEpoch bumps).
  useEffect(() => {
    if (!visible) {
      setActive(false);
      return;
    }
    setIdx(0);
    setActive(!readTutorialFlag(HALL_TUTORIAL_KEYS.mobileDeck));
  }, [visible, resetEpoch]);

  const dismiss = useCallback(() => {
    writeTutorialFlag(HALL_TUTORIAL_KEYS.mobileDeck, true);
    setActive(false);
    onDismiss();
  }, [onDismiss]);

  const next = useCallback(() => {
    setIdx((i) => {
      if (i >= CARDS.length - 1) {
        dismiss();
        return i;
      }
      return i + 1;
    });
  }, [dismiss]);

  const prev = useCallback(() => {
    setIdx((i) => Math.max(0, i - 1));
  }, []);

  if (!active) return null;

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    swipeRef.current = { startX: t.clientX, startY: t.clientY, active: true };
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!swipeRef.current.active) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeRef.current.startX;
    const dy = t.clientY - swipeRef.current.startY;
    swipeRef.current.active = false;
    // Horizontal swipe wins if |dx| > 50 and |dx| > |dy|.
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
    }
  };

  const card = CARDS[idx];
  const isLast = idx === CARDS.length - 1;

  return (
    <div
      className="hall-mobile-tutorial"
      role="dialog"
      aria-modal="true"
      aria-label="hall tutorial"
    >
      <button
        type="button"
        className="hall-mobile-tutorial__skip"
        onClick={dismiss}
        aria-label="skip tutorial"
      >
        skip
      </button>
      <div
        ref={containerRef}
        className="hall-mobile-tutorial__card"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="hall-mobile-tutorial__icon" aria-hidden="true">
          {card.icon}
        </div>
        <h2 className="hall-mobile-tutorial__headline">{card.headline}</h2>
        <p className="hall-mobile-tutorial__body">{card.body}</p>
        <div className="hall-mobile-tutorial__dots" role="tablist">
          {CARDS.map((_, i) => (
            <span
              key={i}
              className={`hall-mobile-tutorial__dot${
                i === idx ? " is-active" : ""
              }`}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="hall-mobile-tutorial__cta-row">
          {idx > 0 && (
            <button
              type="button"
              className="hall-mobile-tutorial__back"
              onClick={prev}
            >
              ← back
            </button>
          )}
          <button
            type="button"
            className="hall-mobile-tutorial__cta"
            onClick={next}
          >
            {isLast ? "get started" : "next →"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileTutorial;
