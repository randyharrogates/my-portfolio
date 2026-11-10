// The one seam between the pipeline and a language model. A step asks for a JSON
// object matching a schema, with a hard output cap. A step may also carry one tool
// (a function the model can call): the model then either must call it, or may
// choose to call it instead of replying.

// "orchestrator" plans a run and "replan" is its second move, after the verifier; "memory" compacts a conversation.
export type Step = "gate" | "orchestrator" | "replan" | "retriever" | "verifier" | "writer" | "answer" | "memory";

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON schema of the arguments
}

export interface ToolCall {
  id: string;
  name: string;
  args: unknown; // parsed arguments; the caller validates them, never trusts them
}

export interface ModelRequest {
  step: Step;
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>; // of the reply; unused when the tool is required
  maxOutputTokens: number;
  tool?: Tool;
  toolChoice?: "required" | "auto"; // "required": the reply IS the call. "auto": the model decides
  toolResult?: { call: ToolCall; output: string }; // the earlier call and what running it returned
}

export interface Usage {
  input: number; // all input tokens, cached ones included
  cached: number; // the part of `input` served from the provider's prompt cache
  output: number; // includes any reasoning tokens
}

export interface ModelResponse {
  json: unknown; // parsed reply, or null when the model called the tool instead
  toolCall?: ToolCall;
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

export const worstCase = (req: ModelRequest, p: Price) => {
  const extra = (req.tool ? JSON.stringify(req.tool) : "") + (req.toolResult ? JSON.stringify(req.toolResult) : "");
  return cost({ input: estimateTokens(req.system) + estimateTokens(req.user) + estimateTokens(extra), cached: 0, output: req.maxOutputTokens }, p);
};

// In a test script, a step that wants to call its optional tool returns this instead of a reply.
export class ScriptedToolCall {
  args: unknown;
  constructor(args: unknown) {
    this.args = args;
  }
}

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
    const out = fn(req);
    const input = Math.ceil((req.system.length + req.user.length) / 4);
    const usage = (written: unknown) => ({ input, cached: 0, output: Math.ceil(JSON.stringify(written).length / 4) });
    const called = (args: unknown): ModelResponse => ({ json: null, toolCall: { id: `call_${this.calls.length}`, name: req.tool?.name ?? "", args }, usage: usage(args) });
    if (out instanceof ScriptedToolCall) return called(out.args);
    if (req.tool && req.toolChoice === "required") return called(out); // the script's object is the call's arguments
    if (onText) for (const piece of JSON.stringify(out).match(/[\s\S]{1,7}/g) ?? []) onText(piece);
    return { json: out, usage: usage(out) };
  }
}
