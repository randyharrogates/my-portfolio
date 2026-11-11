// The résumé, opened beside the report instead of in another tab, with the quoted
// passage highlighted on the page itself.
//
// The pages are pictures of the PDF. site/cv-words.json (built from the same PDF by
// worker/corpus/build.ts --cv) says where every word sits on its page, so a quote
// can be found in the word stream and drawn over the picture.

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type Word = [text: string, x: number, y: number, w: number, h: number]; // position and size as fractions of the page
interface CvWords { pages: { words: Word[] }[] }
interface Hit { page: number; x: number; y: number; w: number; h: number }

const PAGES = [
  { src: "site/cv-1.webp", width: 1241, height: 1754 },
  { src: "site/cv-2.webp", width: 1241, height: 1754 },
];
const EXIT_MS = 200;

// Letters and digits only, so line breaks, hyphenation and curly quotes cannot stop a match.
const bare = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g, "");

// Finds the quote in the CV's words and returns one rectangle per line it covers.
export function locate(cv: CvWords, quote: string): Hit[] {
  const needle = bare(quote);
  if (needle.length < 8) return [];
  let stream = "";
  const owner: { page: number; word: Word }[] = []; // which word each character of `stream` belongs to
  cv.pages.forEach((p, page) =>
    p.words.forEach((word) => {
      const letters = bare(word[0]);
      stream += letters;
      for (let i = 0; i < letters.length; i++) owner.push({ page, word });
    }),
  );
  const start = stream.indexOf(needle);
  if (start < 0) return [];
  const lines: Hit[] = [];
  let last: Word | null = null;
  for (let i = start; i < start + needle.length; i++) {
    const { page, word } = owner[i];
    if (word === last) continue;
    last = word;
    const [, x, y, w, h] = word;
    const line = lines[lines.length - 1];
    // the same line: same page, and tops within half a line of each other
    if (line && line.page === page && Math.abs(line.y - y) < h / 2) line.w = x + w - line.x;
    else lines.push({ page, x, y, w, h });
  }
  return lines;
}

type Open = (quote: string, from: HTMLElement | null) => void;
const CvContext = createContext<Open>(() => {});
export const useCv = () => useContext(CvContext);

export function CvProvider({ children }: { children: React.ReactNode }) {
  const [quote, setQuote] = useState<string | null>(null);
  const [shown, setShown] = useState<string | null>(null); // stays set while the drawer slides out
  const [cv, setCv] = useState<CvWords | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const close = useRef<HTMLButtonElement>(null);
  const firstHit = useRef<HTMLElement | null>(null);

  const open: Open = (q, from) => {
    trigger.current = from;
    setQuote(q);
    setShown(q);
  };
  const shut = () => {
    setQuote(null);
    trigger.current?.focus(); // back to the pill it came from
  };

  // The word positions are fetched the first time a CV source is opened.
  useEffect(() => {
    if (quote === null || cv) return;
    fetch("site/cv-words.json")
      .then((r) => (r.ok ? r.json() : { pages: [] }))
      .then((words: CvWords) => setCv(words))
      .catch(() => setCv({ pages: [] }));
  }, [quote, cv]);

  useEffect(() => {
    if (quote !== null) return close.current?.focus();
    const timer = window.setTimeout(() => setShown(null), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [quote]);

  useEffect(() => {
    if (quote === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") shut(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quote]);

  const hits = useMemo(() => (cv && shown ? locate(cv, shown) : []), [cv, shown]);
  const reveal = () => firstHit.current?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  useEffect(() => { reveal(); }, [hits]);

  return (
    <CvContext.Provider value={open}>
      {children}
      {shown !== null && (
        <aside className={"fit-cv" + (quote === null ? " leaving" : "")} role="dialog" aria-label="My résumé, with the quoted passage highlighted">
          <header>
            <div>
              <span className="eyebrow">My résumé · where this quote comes from</span>
              <b>{!cv ? "Opening the page…" : hits.length ? `Highlighted on page ${hits[0].page + 1} of ${PAGES.length}` : "Shown in full"}</b>
            </div>
            <div className="fit-row">
              <a className="btn" href="Resume.pdf" target="_blank" rel="noopener noreferrer">Open the PDF ↗</a>
              <button ref={close} type="button" className="btn fit-cv-close" aria-label="Close the résumé" onClick={shut}>×</button>
            </div>
          </header>
          <blockquote className="fit-cv-quote">“{shown}”{cv && hits.length === 0 && <small>I could not place this passage on the page picture, so nothing is highlighted. The wording was still checked against the résumé&rsquo;s text.</small>}</blockquote>
          <div className="fit-cv-pages">
            {PAGES.map((p, page) => (
              <div key={p.src} className="fit-cv-page" style={{ aspectRatio: `${p.width} / ${p.height}` }}>
                <img src={p.src} alt={`Résumé page ${page + 1} of ${PAGES.length}`} width={p.width} height={p.height} onLoad={reveal} />
                {hits.filter((h) => h.page === page).map((h, i) => (
                  <i
                    key={`${shown}-${i}`}
                    ref={h === hits[0] ? (el) => { firstHit.current = el; } : undefined}
                    className="fit-cv-hit"
                    aria-hidden="true"
                    style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%`, width: `${h.w * 100}%`, height: `${h.h * 100}%`, animationDelay: `${i * 30}ms` }}
                  />
                ))}
              </div>
            ))}
          </div>
        </aside>
      )}
    </CvContext.Provider>
  );
}
