import React from "react";
export const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;
export function jump(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({
      behavior: reducedMotion() ? "auto" : "smooth",
      block: "start",
    });
}
export function destination(hash: string) {
  return hash === "#home"
    ? "/"
    : hash.startsWith("#work/")
      ? "/work?theme=" + hash.slice(6)
      : "/" + hash.slice(1);
}
export function Pill({ children }: { children: string }) {
  return (
    <span
      className={
        "pill" +
        (/^Live/.test(children)
          ? " live"
          : /Open source/.test(children)
            ? " oss"
            : "")
      }
    >
      {children}
    </span>
  );
}
export function Tags({ tags }: { tags: string[] }) {
  return (
    <div className="tags">
      {tags.map((t) => (
        <span className="tag" key={t}>
          {t}
        </span>
      ))}
    </div>
  );
}
