// The one seam between the pipeline and a language model. The pipeline only ever
// asks for a JSON object matching a schema, with a hard output cap.

// "orchestrator" plans a run and "replan" is its second move, after the verifier; "memory" compacts a conversation.
export type Step = "gate" | "orchestrator" | "replan" | "retriever" | "verifier" | "writer" | "answer" | "memory";

export interface ModelRequest {
  step: Step;
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
}

export interface Usage {
  input: number; // all input tokens, cached ones included
  cached: number; // the part of `input` served from the provider's prompt cache
  output: number; // includes any reasoning tokens
}

export interface ModelResponse {
  json: unknown; // parsed output; the pipeline validates it, never trusts it
  usage: Usage;
}

export interface Model {
  // `onText` receives the raw output text as it is generated, when the caller wants to stream it.
  call(req: ModelRequest, onText?: (delta: string) => void): Promise<ModelResponse>;
}

export interface Price {
  inputPerM: number; // USD per million tokens
  cachedPerM: number;
  outputPerM: number;
}

// Cost in micro-dollars. USD-per-million equals micro-dollars-per-token.
export const cost = (u: Usage, p: Price) =>
  Math.ceil((u.input - u.cached) * p.inputPerM + u.cached * p.cachedPerM + u.output * p.outputPerM);

// Deliberately pessimistic: used only to size a reservation before the call.
export const estimateTokens = (text: string) => Math.ceil(text.length / 3) + 64;

export const worstCase = (req: ModelRequest, p: Price) =>
  cost({ input: estimateTokens(req.system) + estimateTokens(req.user), cached: 0, output: req.maxOutputTokens }, p);

// Test double: answers each step from a script and reports plausible usage.
export class ScriptedModel implements Model {
  calls: ModelRequest[] = [];
  private script: Partial<Record<Step, (req: ModelRequest) => unknown>>;
  constructor(script: Partial<Record<Step, (req: ModelRequest) => unknown>>) {
    this.script = script;
  }
  async call(req: ModelRequest, onText?: (delta: string) => void): Promise<ModelResponse> {
    this.calls.push(req);
    const fn = this.script[req.step];
    if (!fn) throw new Error(`no script for step ${req.step}`);
    const json = fn(req);
    if (onText) for (const piece of JSON.stringify(json).match(/[\s\S]{1,7}/g) ?? []) onText(piece);
    const input = Math.ceil((req.system.length + req.user.length) / 4);
    return { json, usage: { input, cached: 0, output: Math.ceil(JSON.stringify(json).length / 4) } };
  }
}
