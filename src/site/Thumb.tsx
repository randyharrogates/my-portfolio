import React, { useState } from "react";
import { Project } from "./data.ts";
import Visual from "./Visual.tsx";
export default function Thumb({ project: p }: { project: Project }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="thumb" aria-hidden="true">
      {p.img && !failed ? (
        <img
          src={p.img}
          alt=""
          style={p.pos ? { objectPosition: p.pos } : undefined}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <Visual project={p} />
      )}
    </div>
  );
}
