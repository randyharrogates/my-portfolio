import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Answer, ORDER, P, QA, THEMES } from "./data.ts";
import ContactBand from "./ContactBand.tsx";
import { reducedMotion } from "./shared.tsx";
import "./site.css";
export default function SiteLayout() {
  const location = useLocation();
  const work =
    location.pathname === "/work" || location.pathname.startsWith("/work/");
  const project = P.find((p) => location.pathname === "/work/" + p.id);
  const theme = THEMES.find(
    (t) =>
      t.id ===
      (project?.theme || new URLSearchParams(location.search).get("theme")),
  );
  const previousRoute = useRef<{ pathname: string; search: string } | null>(
    null,
  );
  useEffect(() => {
    const previous = previousRoute.current;
    const withoutTheme = (search: string) => {
      const params = new URLSearchParams(search);
      params.delete("theme");
      return params.toString();
    };
    const onlyThemeChanged =
      previous?.pathname === "/work" &&
      location.pathname === "/work" &&
      withoutTheme(previous.search) === withoutTheme(location.search);
    if (!onlyThemeChanged) window.scrollTo(0, 0);
    previousRoute.current = {
      pathname: location.pathname,
      search: location.search,
    };
  }, [location.pathname, location.search]);
  useEffect(() => {
    try {
      const t = localStorage.getItem("rc-theme");
      if (t) document.documentElement.dataset.theme = t;
    } catch {}
  }, []);
  function toggleTheme() {
    const root = document.documentElement;
    const dark = root.dataset.theme
      ? root.dataset.theme === "dark"
      : window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const next = dark ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("rc-theme", next);
    } catch {}
  }
  const [open, setOpen] = useState(false),
    [closing, setClosing] = useState(false),
    [filter, setFilter] = useState(""),
    [selected, setSelected] = useState(0),
    [answer, setAnswer] = useState<Answer | null>(null);
  const ask = useRef<HTMLButtonElement>(null),
    input = useRef<HTMLInputElement>(null),
    palette = useRef<HTMLDivElement>(null),
    opener = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const items = QA.filter(
    (x) =>
      !filter.trim() || x.q.toLowerCase().includes(filter.toLowerCase().trim()),
  );
  const showPalette = useCallback(() => {
    clearTimeout(timer.current);
    opener.current = document.activeElement as HTMLElement;
    setClosing(false);
    setOpen(true);
    setSelected(0);
    setFilter("");
    setAnswer(null);
  }, []);
  const closePalette = useCallback(() => {
    setClosing(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => {
        setOpen(false);
        setClosing(false);
        opener.current?.focus();
      },
      reducedMotion() ? 0 : 160,
    );
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return;
    const r = ask.current?.getBoundingClientRect();
    if (r) {
      palette.current?.style.setProperty(
        "--ox",
        r.left +
          r.width / 2 -
          (window.innerWidth - Math.min(640, window.innerWidth - 32)) / 2 +
          "px",
      );
      palette.current?.style.setProperty("--oy", "-40px");
    }
    input.current?.focus();
  }, [open]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) closePalette();
        else showPalette();
        return;
      }
      if (!open) return;
      if (e.key === "Escape") closePalette();
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (items.length)
          setSelected(
            (k) =>
              (k + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
              items.length,
          );
      }
      if (e.key === "Enter" && items[selected]) {
        e.preventDefault();
        setAnswer(items[selected]);
      }
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open, items, selected, showPalette, closePalette]);
  return (
    <div className="rc-site" data-mode={work ? "work" : undefined}>
      <header className="nav">
        <div className="wrap">
          <Link className="brand" to="/">
            <img src="site/randy.webp" alt="" />
            <span>Randy Chan</span>
          </Link>
          <nav className="links" aria-label="Pages">
            {[
              ["/work", "Work"],
              ["/fit", "Role fit"],
              ["/about", "About"],
              ["/resume", "Résumé"],
            ].map(([path, label]) => (
              <Link
                key={path}
                to={path}
                aria-current={
                  (path === "/work" ? work : location.pathname === path)
                    ? "page"
                    : undefined
                }
              >
                {label}
              </Link>
            ))}
          </nav>
          <button
            className="btn"
            id="askBtn"
            ref={ask}
            type="button"
            aria-haspopup="dialog"
            onClick={showPalette}
          >
            <span className="ask-label">Ask about Randy</span>
            <span className="ask-short" style={{ display: "none" }}>
              Ask
            </span>
            <span className="kbd">⌘K</span>
          </button>
          <button
            className="btn icon-btn"
            id="themeBtn"
            type="button"
            aria-label="Switch theme"
            onClick={toggleTheme}
          >
            ◐
          </button>
        </div>
      </header>
      {work && (
        <div className="crumbs" id="crumbs">
          <div className="wrap" id="crumbsIn">
            <Link to="/">Randy Chan</Link>
            <span className="sep">/</span>
            {project ? (
              <>
                <Link to="/work">Work</Link>
                <span className="sep">/</span>
                <Link to={"/work?theme=" + theme?.id}>{theme?.name}</Link>
                <span className="sep">/</span>
                <b>{project.title.split(",")[0]}</b>
                <span className="count">
                  Case {String(ORDER.indexOf(project) + 1).padStart(2, "0")} of{" "}
                  {ORDER.length}
                </span>
              </>
            ) : (
              <>
                {theme ? (
                  <>
                    <Link to="/work">Work</Link>
                    <span className="sep">/</span>
                    <b>{theme.name}</b>
                  </>
                ) : (
                  <b>Work</b>
                )}
                <span className="count">
                  {P.length} case studies · {THEMES.length} themes
                </span>
              </>
            )}
          </div>
        </div>
      )}
      <main>
        <Outlet />
      </main>
      <ContactBand />
      <div
        className={"scrim" + (closing ? " closing" : "")}
        id="scrim"
        hidden={!open}
        onClick={(e) => {
          if (e.target === e.currentTarget) closePalette();
        }}
      >
        <div
          className="palette"
          ref={palette}
          role="dialog"
          aria-modal="true"
          aria-labelledby="palTitle"
        >
          <div className="pal-in">
            <span
              className="mono"
              style={{ color: "var(--accent)" }}
              id="palTitle"
            >
              Ask
            </span>
            <label
              htmlFor="palInput"
              style={{
                position: "absolute",
                width: "1px",
                height: "1px",
                overflow: "hidden",
                clip: "rect(0 0 0 0)",
              }}
            >
              Ask about Randy
            </label>
            <input
              id="palInput"
              ref={input}
              type="text"
              maxLength={200}
              placeholder="Ask about Randy's work…"
              autoComplete="off"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setSelected(0);
              }}
            />
            <span className="kbd">esc</span>
          </div>
          <div
            className="pal-list"
            id="palList"
            role="listbox"
            aria-label="Questions"
          >
            {items.map((x, k) => (
              <button
                type="button"
                className="qa"
                role="option"
                aria-selected={k === selected}
                key={x.q}
                onClick={() => setAnswer(x)}
              >
                <span>{x.q}</span>
                <span className="mono">{x.tag}</span>
              </button>
            ))}
            {!items.length && (
              <p className="note" style={{ padding: "13px" }}>
                Live answers to your own questions arrive when the site
                launches. For now, pick a question.
              </p>
            )}
          </div>
          <div className="answer" id="palAnswer" hidden={!answer}>
            {answer && (
              <>
                <div className="trace">
                  {answer.trace.map((t) => (
                    <div key={t}>
                      <span>→</span> {t}
                    </div>
                  ))}
                  <div>
                    <span>✓</span> answer · cited
                  </div>
                </div>
                <p>{answer.a}</p>
                <span className="note">Source: {answer.src}</span>
              </>
            )}
          </div>
          <div className="pal-foot">
            <span>Answers come only from Randy's CV, with sources.</span>
            <span>Preview: curated answers</span>
          </div>
        </div>
      </div>
    </div>
  );
}
