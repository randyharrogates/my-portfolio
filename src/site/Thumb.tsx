import React, { useState } from "react";
import { Project } from "./data.ts";
import Visual from "./Visual.tsx";
export default function Thumb({ project: p }: { project: Project }) {
  const [failed, setFailed] = useState(false);
  const src = p.img ?? p.art;
  return (
    <div className="thumb" aria-hidden="true">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          style={p.pos ? { objectPosition: p.pos } : p.img ? undefined : { objectPosition: "center" }}
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
