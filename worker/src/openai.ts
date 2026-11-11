import OpenAI from "openai";
import { TransientError } from "./model.ts";
import type { Model, ModelRequest, ModelResponse } from "./model.ts";

type Effort = "none" | "minimal" | "low" | "medium" | "high";

// OpenAI Responses API with strict structured output and function calling. One request
// per call and no retries here: the caller retries, and only a request the provider turned
// away before producing anything (reported as TransientError), which was never billed.
// A step normally answers in 1 to 6 seconds. One that has said nothing for this long is treated as hung.
const TIMEOUT_MS = 20_000;

export class OpenAIModel implements Model {
  private client: OpenAI;
  private model: string;
  private effort: Effort | undefined;

  constructor(apiKey: string, model: string, effort?: string) {
    this.client = new OpenAI({ apiKey, maxRetries: 0, timeout: TIMEOUT_MS });
    this.model = model;
    this.effort = effort ? (effort as Effort) : undefined;
  }

  async call(req: ModelRequest, onText?: (delta: string) => void): Promise<ModelResponse> {
    const { tools } = req;
    const forced = tools !== undefined && req.toolChoice === "required";
    const params = {
      model: this.model,
      instructions: req.system,
      input: req.user,
      max_output_tokens: req.maxOutputTokens,
      store: false,
      ...(this.effort ? { reasoning: { effort: this.effort } } : {}),
      ...(tools
        ? {
            tools: tools.map((t) => ({ type: "function" as const, name: t.name, description: t.description, parameters: t.parameters, strict: true })),
            // One tool it must call is named outright; with several, it must call one and chooses which.
            tool_choice: !forced ? ("auto" as const) : tools.length === 1 ? { type: "function" as const, name: tools[0].name } : ("required" as const),
            parallel_tool_calls: false,
          }
        : {}),
      ...(forced ? {} : { text: { format: { type: "json_schema" as const, name: req.schemaName, schema: req.schema, strict: true } } }),
    };
    let text = "";
    let raw: OpenAI.Responses.ResponseUsage | undefined;
    let fn: { call_id: string; name: string; arguments: string } | undefined;
    const see = (item: { type: string }) => {
      if (item.type === "function_call") fn ??= item as OpenAI.Responses.ResponseFunctionToolCall;
    };
    // Turned away at the door: nothing was generated, so nothing was billed and it is safe to try again.
    const open = async <T>(request: () => Promise<T>): Promise<T> => {
      try {
        return await request();
      } catch (e) {
        if (e instanceof OpenAI.APIConnectionTimeoutError) throw new TransientError(0, true); // it may have been generating: retried once, and paid for
        if (e instanceof OpenAI.APIConnectionError) throw new TransientError(0);
        if (e instanceof OpenAI.APIError && typeof e.status === "number" && (e.status === 429 || e.status >= 500)) throw new TransientError(e.status);
        throw e;
      }
    };
    if (onText) {
      // Same single request, read as a stream so the page can show text as it is written.
      const stream = await open(() => this.client.responses.create({ ...params, stream: true }));
      for await (const ev of stream) {
        if (ev.type === "response.output_text.delta") {
          text += ev.delta;
          onText(ev.delta);
        } else if (ev.type === "response.output_item.done") {
          see(ev.item);
        } else if (ev.type === "response.completed" || ev.type === "response.incomplete" || ev.type === "response.failed") {
          raw = ev.response.usage;
        } else if (ev.type === "error") {
          throw new Error("model stream error");
        }
      }
    } else {
      const res = await open(() => this.client.responses.create(params));
      text = res.output_text;
      raw = res.usage;
      res.output.forEach(see);
    }
    // Fail closed on billing: with no usage report the true cost is unknown, so throw
    // and let the pipeline settle this call at its worst-case reservation, never at zero.
    if (!raw) throw new Error("model response carried no usage");
    const usage = {
      input: raw.input_tokens,
      cached: raw.input_tokens_details?.cached_tokens ?? 0,
      written: (raw.input_tokens_details as { cache_write_tokens?: number } | undefined)?.cache_write_tokens ?? 0,
      output: raw.output_tokens,
    };
    const parse = (s: string): unknown => {
      try {
        return JSON.parse(s);
      } catch {
        return null; // truncated or refused: the pipeline treats a non-object as a failed step
      }
    };
    if (fn && tools?.some((t) => t.name === fn?.name)) return { json: null, toolCall: { id: fn.call_id, name: fn.name, args: parse(fn.arguments) }, usage };
    return { json: parse(text), usage };
  }
}
