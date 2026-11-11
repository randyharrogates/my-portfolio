// The one seam between the pipeline and a language model. A step asks for a JSON
// object matching a schema, with a hard output cap. A step may also carry tools
// (functions the model can call): the model then either must call one of them, or
// may choose to call one instead of replying.

// "orchestrator" plans a run and "replan" is its second move, after the verifier. "lead" is the
// chat's orchestrator: it is called once per turn and picks the next move. "memory" compacts a conversation.
export type Step = "gate" | "orchestrator" | "replan" | "retriever" | "verifier" | "writer" | "lead" | "answer" | "memory";

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
  tools?: Tool[];
  toolChoice?: "required" | "auto"; // "required": the reply IS a call to one of them. "auto": the model decides
}

export interface Usage {
  input: number; // all input tokens, cached ones included
  cached: number; // the part of `input` served from the provider's prompt cache
  written?: number; // the part of `input` newly written to that cache, billed at its own rate
  output: number; // includes any reasoning tokens
}

export interface ModelResponse {
  json: unknown; // parsed reply, or null when the model called the tool instead
  toolCall?: ToolCall;
  usage: Usage;
}

// A failure that happened before the provider produced anything, and so before anything
// was billed: rate limiting, a server error, a dropped connection. Only these are retried.
// A timeout is retried too, but it is the one kind that may have been billed: the
// provider could have been generating when we stopped waiting.
export class TransientError extends Error {
  status: number; // the HTTP status, or 0 for a connection that never completed
  maybeBilled: boolean;
  constructor(status: number, maybeBilled = false) {
    super(maybeBilled ? "transient model error (timed out)" : `transient model error (${status || "connection"})`);
    this.status = status;
    this.maybeBilled = maybeBilled;
  }
}

export interface Model {
  // `onText` receives the raw output text as it is generated, when the caller wants to stream it.
  call(req: ModelRequest, onText?: (delta: string) => void): Promise<ModelResponse>;
}

export interface Price {
  inputPerM: number; // USD per million tokens
  cachedPerM: number;
  writePerM: number; // input tokens written to the prompt cache
  outputPerM: number;
}

// Cost in micro-dollars. USD-per-million equals micro-dollars-per-token.
// Every input token is billed at exactly one of three rates: read from the cache, written to it, or neither.
export const cost = (u: Usage, p: Price) => {
  const written = u.written ?? 0;
  return Math.ceil((u.input - u.cached - written) * p.inputPerM + u.cached * p.cachedPerM + written * p.writePerM + u.output * p.outputPerM);
};

// Deliberately pessimistic: used only to size a reservation before the call.
export const estimateTokens = (text: string) => Math.ceil(text.length / 3) + 64;

export const worstCase = (req: ModelRequest, p: Price) => {
  const extra = req.tools ? JSON.stringify(req.tools) : "";
  const input = estimateTokens(req.system) + estimateTokens(req.user) + estimateTokens(extra);
  return cost({ input, cached: 0, written: input, output: req.maxOutputTokens }, p); // as if all of it were written to the cache, the dearest input rate
};

// In a test script, a step that calls a tool returns this: which tool (the step's only
// one when no name is given) and with what arguments.
export class ScriptedToolCall {
  args: unknown;
  name: string | undefined;
  constructor(args: unknown, name?: string) {
    this.args = args;
    this.name = name;
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
    const called = (args: unknown, name = req.tools?.[0]?.name ?? ""): ModelResponse => ({ json: null, toolCall: { id: `call_${this.calls.length}`, name, args }, usage: usage(args) });
    if (out instanceof ScriptedToolCall) return called(out.args, out.name);
    if (req.tools && req.toolChoice === "required") return called(out); // the script's object is the call's arguments
    if (onText) for (const piece of JSON.stringify(out).match(/[\s\S]{1,7}/g) ?? []) onText(piece);
    return { json: out, usage: usage(out) };
  }
}
