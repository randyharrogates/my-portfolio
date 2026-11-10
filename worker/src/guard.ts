// Guardrails that do not depend on a model behaving. Input is cleaned and
// screened before it reaches a prompt; model prose is screened before it
// reaches a visitor. Quotes are checked separately, against their source.

// Characters with no business in a job description or a question: control
// codes, zero-width and bidirectional overrides, and Unicode "tag" characters,
// all of which are used to hide instructions from a human reader.
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F­​-‏‪-‮⁠-⁯﻿]|\uDB40[\uDC00-\uDC7F]/g;

export const cleanInput = (s: string) =>
  s.normalize("NFKC").replace(INVISIBLE, "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

// Text that came from a visitor, or that a model wrote from a visitor's text, is
// flattened to one plain line wherever it is shown or put back into a prompt, so
// it cannot open or close a block or carry markup.
export const oneLine = (s: string, max: number) => s.replace(/[<>`\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

// Phrases that address the model rather than describe a job or ask about work.
// Deliberately narrow: an AI-engineering advert may say "system prompts" or
// "act as a technical lead", and those must pass.
const INJECTION = [
  /\b(ignore|disregard|forget|override)\b.{0,30}\b(previous|prior|above|earlier|all|your|the)\b.{0,20}\b(instructions?|rules?|prompts?|guidelines?)\b/i,
  /\b(reveal|print|show|repeat|output|leak|tell me)\b.{0,40}\b(system prompt|your (instructions|prompt|rules|guidelines)|the prompt)\b/i,
  /\byou are (now|no longer)\b/i,
  /\b(new|updated) (instructions|rules|system prompt)\s*:/i,
  /\b(developer|dan|jailbreak|god) mode\b|\bjailbreak\b|\bdo anything now\b/i,
  /\bpretend (to be|you are|that you)\b|\brole-?play as\b/i,
  /<\/?\s*(system|assistant|developer|instructions?|im_start|im_end)\b|\[\/?(INST|SYSTEM)\]|^\s*(system|assistant)\s*:/im,
];

export const looksLikeInjection = (s: string) => INJECTION.some((re) => re.test(s));

// Claims the site must never make, whatever a model writes.
const FORBIDDEN = [/10,?000\+?\s*users/i, /\bvllm\b/i, /\bllama\b/i, /\b[89]\d{3}[ -]?\d{4}\b/, /@\w+\.(com|sg)\b/i];

// Applies to everything shown, quotes included.
export const isClean = (text: string) => !FORBIDDEN.some((re) => re.test(text));

// Applies to prose a model wrote in Randy's voice. On top of `isClean`:
// no links or markup (nothing to click or render), nothing that looks like the
// prompt leaking, and no commitments made on his behalf.
const UNSAFE_PROSE = [
  /https?:\/\/|\bwww\.|[<>]|\]\(|`/i,
  /\bstep:\s|excerpt[_ ]id|in_scope|json schema|system prompt|\bmy (instructions|rules|guidelines)\b|as an ai\b|language model/i,
  /\b(salary|salaries|remuneration|notice period|day rate|available to start|start date)\b|[$€£]\s?\d|\b(sgd|usd)\s?\d/i,
  /\bi (accept|agree to|promise|guarantee|commit to|will join|can start)\b/i,
];

export const isSafeProse = (text: string) => isClean(text) && !UNSAFE_PROSE.some((re) => re.test(text));
