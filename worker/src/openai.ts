import OpenAI from "openai";
import type { Model, ModelRequest, ModelResponse } from "./model.ts";

type Effort = "none" | "minimal" | "low" | "medium" | "high";

// OpenAI Responses API with strict structured output and function calling. One request
// per call, no retries here: a retry would be a second billed call outside the reservation.
export class OpenAIModel implements Model {
  private client: OpenAI;
  private model: string;
  private effort: Effort | undefined;

  constructor(apiKey: string, model: string, effort?: string) {
    this.client = new OpenAI({ apiKey, maxRetries: 0, timeout: 30_000 });
    this.model = model;
    this.effort = effort ? (effort as Effort) : undefined;
  }

  async call(req: ModelRequest, onText?: (delta: string) => void): Promise<ModelResponse> {
    const { tool, toolResult: done } = req;
    const forced = tool !== undefined && req.toolChoice === "required";
    const params = {
      model: this.model,
      instructions: req.system,
      // After a tool call, the model is shown its own call and what running it returned.
      input: done
        ? [
            { role: "user" as const, content: req.user },
            { type: "function_call" as const, call_id: done.call.id, name: done.call.name, arguments: JSON.stringify(done.call.args) },
            { type: "function_call_output" as const, call_id: done.call.id, output: done.output },
          ]
        : req.user,
      max_output_tokens: req.maxOutputTokens,
      store: false,
      ...(this.effort ? { reasoning: { effort: this.effort } } : {}),
      ...(tool
        ? {
            tools: [{ type: "function" as const, name: tool.name, description: tool.description, parameters: tool.parameters, strict: true }],
            tool_choice: forced ? { type: "function" as const, name: tool.name } : ("auto" as const),
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
    if (onText) {
      // Same single request, read as a stream so the page can show text as it is written.
      const stream = await this.client.responses.create({ ...params, stream: true });
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
      const res = await this.client.responses.create(params);
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
      output: raw.output_tokens,
    };
    const parse = (s: string): unknown => {
      try {
        return JSON.parse(s);
      } catch {
        return null; // truncated or refused: the pipeline treats a non-object as a failed step
      }
    };
    if (fn && tool && fn.name === tool.name) return { json: null, toolCall: { id: fn.call_id, name: fn.name, args: parse(fn.arguments) }, usage };
    return { json: parse(text), usage };
  }
}
