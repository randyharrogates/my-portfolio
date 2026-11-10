// Helpers for streaming the writer's summary to the page while it is generated.
// The model emits JSON ({"summary": "..."}); these pull the string out as it
// arrives and hold text back until it has passed the same screen as the final copy.

// Decodes the value of one string property from JSON text that arrives in pieces.
export class JsonStringStream {
  private raw = "";
  private pos = -1; // index in `raw` of the next undecoded character, once the value has started
  private finished = false;
  private start: RegExp;

  constructor(key: string) {
    this.start = new RegExp(`"${key}"\\s*:\\s*"`);
  }

  // Returns the newly decoded characters, possibly none.
  push(delta: string): string {
    if (this.finished) return "";
    this.raw += delta;
    if (this.pos < 0) {
      const m = this.start.exec(this.raw);
      if (!m) return "";
      this.pos = m.index + m[0].length;
    }
    let out = "";
    while (this.pos < this.raw.length) {
      const c = this.raw[this.pos];
      if (c === '"') {
        this.finished = true;
        break;
      }
      if (c !== "\\") {
        out += c;
        this.pos++;
        continue;
      }
      const next = this.raw[this.pos + 1];
      if (next === undefined) break; // escape split across deltas: wait for the rest
      if (next === "u") {
        const hex = this.raw.slice(this.pos + 2, this.pos + 6);
        if (hex.length < 4) break;
        out += /^[0-9a-fA-F]{4}$/.test(hex) ? String.fromCharCode(parseInt(hex, 16)) : "";
        this.pos += 6;
        continue;
      }
      out += next === "n" || next === "r" || next === "t" ? " " : next === "b" || next === "f" ? "" : next;
      this.pos += 2;
    }
    return out;
  }
}

// Releases text a few words behind what has arrived, and stops for good the
// moment the text so far fails the screen. A forbidden phrase is at most a few
// words long, so it is always seen whole before its first word could be released.
export class ScreenedText {
  sent = "";
  private seen = "";
  private blocked = false;
  private isClean: (text: string) => boolean;
  private emit: (text: string) => void;
  private hold: number;

  constructor(isClean: (text: string) => boolean, emit: (text: string) => void, holdWords = 4) {
    this.isClean = isClean;
    this.emit = emit;
    this.hold = holdWords;
  }

  push(chunk: string): void {
    if (this.blocked || !chunk) return;
    this.seen += chunk;
    if (!this.isClean(this.seen)) {
      this.blocked = true;
      return;
    }
    const words = [...this.seen.matchAll(/\S+/g)];
    if (words.length <= this.hold) return;
    this.release(words[words.length - this.hold].index);
  }

  // Call once the complete text has been accepted: releases whatever was held.
  flush(final: string): void {
    if (this.blocked || !final.startsWith(this.sent)) return;
    this.seen = final;
    this.release(final.length);
  }

  private release(upTo: number): void {
    if (upTo <= this.sent.length) return;
    const piece = this.seen.slice(this.sent.length, upTo);
    this.sent += piece;
    this.emit(piece);
  }
}
