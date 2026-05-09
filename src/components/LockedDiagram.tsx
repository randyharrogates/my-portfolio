/** @format */

import React, { useEffect, useState } from "react";
import ArchitectureDiagram from "./ArchitectureDiagram.tsx";
import {
  type DiagramId,
  getDecrypted,
  isUnlocked,
  subscribe,
  tryUnlockAll,
} from "./diagram-unlock.ts";
import "./LockedDiagram.css";

interface LockedDiagramProps {
  diagramId: DiagramId;
  ariaLabel: string;
  caption?: string;
  requestEmail: string;
  requestSubject?: string;
}

const LockedDiagram: React.FC<LockedDiagramProps> = ({
  diagramId,
  ariaLabel,
  caption,
  requestEmail,
  requestSubject,
}) => {
  const [unlocked, setUnlocked] = useState<boolean>(() => isUnlocked(diagramId));
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribe(() => setUnlocked(isUnlocked(diagramId)));
  }, [diagramId]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || pending) return;
    setPending(true);
    setError(null);
    try {
      const ok = await tryUnlockAll(password);
      if (!ok) {
        setError("incorrect");
        setPending(false);
        return;
      }
      setPassword("");
      setPending(false);
    } catch (err) {
      setError("incorrect");
      setPending(false);
    }
  };

  if (unlocked) {
    const svg = getDecrypted(diagramId);
    if (svg) {
      return (
        <ArchitectureDiagram ariaLabel={ariaLabel} caption={caption}>
          <span dangerouslySetInnerHTML={{ __html: svg }} />
        </ArchitectureDiagram>
      );
    }
  }

  const mailto = `mailto:${requestEmail}?subject=${encodeURIComponent(
    requestSubject || "Architecture diagram access request"
  )}`;

  return (
    <figure className="locked-diagram" aria-label={`${ariaLabel} (gated)`}>
      <div className="locked-diagram-inner">
        <div className="locked-diagram-icon" aria-hidden="true">
          [ locked ]
        </div>
        <div className="locked-diagram-title">Architecture diagram · gated content</div>
        <div className="locked-diagram-sub">
          Enter the access key to view, or request one via email.
        </div>
        <form className="locked-diagram-form" onSubmit={handleUnlock}>
          <input
            type="password"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="access key"
            className="locked-diagram-input"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            aria-label="Access key"
            disabled={pending}
          />
          <button
            type="submit"
            className="locked-diagram-btn"
            disabled={!password || pending}
          >
            {pending ? "unlocking…" : "unlock"}
          </button>
        </form>
        {error && (
          <div className="locked-diagram-error" role="alert">
            {error}
          </div>
        )}
        <div className="locked-diagram-cta">
          <a href={mailto} className="terminal-btn">
            <span className="btn-prefix">$</span> request access
          </a>
        </div>
      </div>
    </figure>
  );
};

export default LockedDiagram;
