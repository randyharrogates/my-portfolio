/** @format */

const ACTIVE = new Set<string>();

export function setHoverDrill(id: string | null) {
  if (typeof document === "undefined") return;
  const cls = "landing3d-active";
  if (id === null) {
    ACTIVE.forEach((c) => document.body.classList.remove(c));
    ACTIVE.clear();
    document.body.classList.remove(cls);
    return;
  }
  const next = `landing3d-hover-${id}`;
  if (ACTIVE.has(next)) return;
  ACTIVE.forEach((c) => document.body.classList.remove(c));
  ACTIVE.clear();
  document.body.classList.add(next);
  document.body.classList.add(cls);
  ACTIVE.add(next);
  ACTIVE.add(cls);
}
