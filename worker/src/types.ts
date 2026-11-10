// A chunk is the unit of retrieval and of citation. `text` is exactly what an
// evidence quote must be a substring of.
export interface Chunk {
  id: string; // stable, e.g. "project:jarvis:decisions" or "cv:trustplus-ai:3"
  source: "project" | "career" | "site" | "cv";
  title: string; // shown next to a citation
  url: string; // hash route on the site, or "Resume.pdf"
  text: string;
}

export interface Corpus {
  hash: string; // sha-256 of the chunks, so a rebuild with no content change is a no-op
  chunks: Chunk[];
}
