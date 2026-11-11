// Builds worker/corpus/corpus.json from the site's own public data and the
// public CV. Nothing else goes in: the corpus is exactly what a visitor could
// already read on the site, chunked for retrieval and citation.
//
//   node corpus/build.ts            build from data.ts and the checked-in cv.txt
//   node corpus/build.ts --cv       re-extract cv.txt from public/Resume.pdf first (needs pdftotext)

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ARCHIVE, CAREER, P, PILLARS, TAP, THEMES } from "../../src/site/data.ts";
import type { Chunk, Corpus } from "../src/types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cvPath = join(here, "cv.txt");

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function projectChunks(): Chunk[] {
  const out: Chunk[] = [];
  for (const p of P) {
    const theme = THEMES.find((t) => t.id === p.theme)?.name ?? p.theme;
    const name = p.title.split(",")[0];
    const add = (section: string, label: string, text: string) => {
      if (clean(text))
        out.push({
          id: `project:${p.id}:${section}`,
          source: "project",
          title: `${name} · ${label}`,
          url: `#/work/${p.id}`,
          text: clean(text),
        });
    };
    add(
      "overview",
      "Overview",
      `${p.title}. ${p.lede} ${p.card} Organisation: ${p.org}. Year: ${p.year}. Status: ${p.status}. Theme: ${theme}. Stack: ${p.tags.join(", ")}.`,
    );
    add("role", "My role", `${p.role} The problem: ${p.problem}`);
    add("how", "How it works", p.flow.map(([k, v]) => `${k}: ${v}.`).join(" "));
    add("built", "What I built", p.system.map((s) => s + ".").join(" "));
    add("decisions", "Key decisions", p.decisions.map((s) => s + ".").join(" "));
    add("results", "Results", p.results.map(([n, what]) => `${n} ${what}.`).join(" "));
  }
  return out;
}

export function siteChunks(): Chunk[] {
  const out: Chunk[] = [];
  CAREER.forEach(([years, org, role, what]) =>
    out.push({
      id: `career:${slug(org)}:${slug(years)}`,
      source: "career",
      title: `${org} · ${role}`,
      url: "#/about",
      text: clean(`${org}, ${role}, ${years}. ${what}`),
    }),
  );
  out.push({
    id: "career:the-assembly-place:current-work",
    source: "career",
    title: `${TAP.org} · current work`,
    url: "#/work",
    text: clean(`${TAP.org}, ${TAP.year}: ${TAP.title}. ${TAP.thumb.join(", ")}.`),
  });
  PILLARS.forEach(([n, name, what]) =>
    out.push({
      id: `site:pillar:${n}`,
      source: "site",
      title: `Focus area · ${name}`,
      url: "#/",
      text: clean(`${name}. ${what}`),
    }),
  );
  ARCHIVE.forEach(([tag, name, what]) =>
    out.push({
      id: `site:archive:${slug(tag)}`,
      source: "site",
      title: `Earlier work · ${clean(name).replace(/\.$/, "")}`,
      url: "#/work",
      text: clean(`${name} ${what}`),
    }),
  );
  return out;
}

const SECTION = /^[A-Z][A-Z &/]{3,}$/;
const BULLET = /^\s*[–•-]\s+/;

// One chunk per CV bullet, prefixed with the role it sits under, so a citation
// points at a single claim and still says where it was.
export function cvChunks(text: string): Chunk[] {
  const out: Chunk[] = [];
  // The first lines are the name and contact header: not evidence, and the
  // contact details stay out of the model's context.
  const lines = text.split("\n").slice(3);
  let section = "";
  let heading = "";
  let buf: string[] = [];
  let bufIsBullet = false;
  const counts = new Map<string, number>();

  const flush = () => {
    const body = clean(buf.join(" "));
    buf = [];
    if (!body) return;
    const where = heading || section;
    const key = slug(where.split(/[,(]/)[0]) || "cv";
    const n = (counts.get(key) ?? 0) + 1;
    counts.set(key, n);
    out.push({
      id: `cv:${key}:${n}`,
      source: "cv",
      title: `CV · ${where || "Résumé"}`,
      url: "Resume.pdf",
      text: bufIsBullet && heading ? `${heading}: ${body}` : body,
    });
  };

  for (const raw of lines) {
    const line = raw.replace(/\f/g, "");
    const t = line.trim();
    if (!t) continue;
    if (SECTION.test(t)) {
      flush();
      section = t.charAt(0) + t.slice(1).toLowerCase();
      heading = "";
      bufIsBullet = false;
      continue;
    }
    if (BULLET.test(line)) {
      flush();
      bufIsBullet = true;
      buf.push(t.replace(BULLET, ""));
      continue;
    }
    // A line ending in a date range is a role or project heading.
    const dated = /(\b(19|20)\d{2}\b|Present)\s*$/.test(t);
    const indent = line.length - line.trimStart().length;
    if (dated && section !== "Summary") {
      flush();
      // "Company    dates" then "Role    place" on the next line: keep the company.
      heading = clean(t.replace(/\s{2,}.*$/, "").replace(/,\s*$/, ""));
      bufIsBullet = false;
      continue;
    }
    if (bufIsBullet && indent >= 4) {
      buf.push(t); // continuation of the bullet
      continue;
    }
    if (bufIsBullet) {
      flush();
      bufIsBullet = false;
    }
    // In Projects each unbulleted line names a project; in Skills each line is its own group.
    if (section === "Projects" || section === "Skills") {
      flush();
      // A wrapped skills line has no "Label:" prefix: it belongs to the group above.
      const last = out[out.length - 1];
      if (section === "Skills" && last?.id.startsWith("cv:skills:") && !/^[A-Z][A-Za-z -]{2,30}:/.test(t)) {
        last.text = clean(last.text + " " + t);
        continue;
      }
      if (section === "Projects") heading = clean(t.split(",")[0]);
      buf.push(t);
      flush();
      continue;
    }
    // Role/location line directly under a company heading adds nothing to retrieve.
    if (heading && buf.length === 0 && /\s{2,}/.test(t) && !/[.;:]$/.test(t)) continue;
    buf.push(t);
  }
  flush();
  return out;
}

// Where every word of the CV sits on its page, as fractions of the page, so the site can
// highlight a quoted passage on the picture of the page. `xml` is `pdftotext -bbox` output.
// The name and contact header (everything above `firstSection`) is left out, as it is
// from the corpus.
export function cvWords(xml: string, firstSection: string): { pages: { words: [string, number, number, number, number][] }[] } {
  const frac = (n: number, of: number) => Math.round((n / of) * 10000) / 10000;
  const unescape = (t: string) => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, "&");
  let started = false;
  const pages = [...xml.matchAll(/<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g)].map(([, w, h, body]) => {
    const words: [string, number, number, number, number][] = [];
    for (const [, x0, y0, x1, y1, raw] of body.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)) {
      const text = unescape(raw);
      started ||= text === firstSection;
      if (started) words.push([text, frac(+x0, +w), frac(+y0, +h), frac(+x1 - +x0, +w), frac(+y1 - +y0, +h)]);
    }
    return { words };
  });
  return { pages };
}

export function buildCorpus(cvText: string): Corpus {
  const chunks = [...projectChunks(), ...siteChunks(), ...cvChunks(cvText)];
  const ids = new Set<string>();
  for (const c of chunks) {
    if (ids.has(c.id)) throw new Error(`duplicate chunk id: ${c.id}`);
    ids.add(c.id);
  }
  const hash = createHash("sha256").update(JSON.stringify(chunks)).digest("hex");
  return { hash, chunks };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--cv")) {
    const pdf = join(root, "public", "Resume.pdf");
    const layout = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8" });
    writeFileSync(cvPath, layout);
    const firstSection = layout.split("\n").slice(3).map((l) => l.trim()).find((l) => SECTION.test(l)) ?? "";
    writeFileSync(join(root, "public", "site", "cv-words.json"), JSON.stringify(cvWords(execFileSync("pdftotext", ["-bbox", pdf, "-"], { encoding: "utf8" }), firstSection)));
  }
  if (!existsSync(cvPath)) throw new Error("corpus/cv.txt is missing: run `node corpus/build.ts --cv`");
  const corpus = buildCorpus(readFileSync(cvPath, "utf8"));
  writeFileSync(join(here, "corpus.json"), JSON.stringify(corpus, null, 1) + "\n");
  const by = (s: string) => corpus.chunks.filter((c) => c.source === s).length;
  console.log(
    `corpus: ${corpus.chunks.length} chunks (project ${by("project")}, career ${by("career")}, site ${by("site")}, cv ${by("cv")}), ${JSON.stringify(corpus).length} bytes, hash ${corpus.hash.slice(0, 12)}`,
  );
}
