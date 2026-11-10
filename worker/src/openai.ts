import OpenAI from "openai";
import type { Model, ModelRequest, ModelResponse } from "./model.ts";

type Effort = "none" | "minimal" | "low" | "medium" | "high";

// OpenAI Responses API with strict structured output. One request per call, no
// retries here: a retry would be a second billed call outside the reservation.
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
    const params = {
      model: this.model,
      instructions: req.system,
      input: req.user,
      max_output_tokens: req.maxOutputTokens,
      store: false,
      ...(this.effort ? { reasoning: { effort: this.effort } } : {}),
      text: { format: { type: "json_schema" as const, name: req.schemaName, schema: req.schema, strict: true } },
    };
    let text = "";
    let raw: OpenAI.Responses.ResponseUsage | undefined;
    if (onText) {
      // Same single request, read as a stream so the page can show text as it is written.
      const stream = await this.client.responses.create({ ...params, stream: true });
      for await (const ev of stream) {
        if (ev.type === "response.output_text.delta") {
          text += ev.delta;
          onText(ev.delta);
        } else if (ev.type === "response.completed" || ev.type === "response.incomplete" || ev.type === "response.failed") {
          raw = ev.response.usage;
        }
      }
    } else {
      const res = await this.client.responses.create(params);
      text = res.output_text;
      raw = res.usage;
    }
    const usage = {
      input: raw?.input_tokens ?? 0,
      cached: raw?.input_tokens_details?.cached_tokens ?? 0,
      output: raw?.output_tokens ?? 0,
    };
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      // truncated or refused: the pipeline treats a non-object as a failed step
    }
    return { json, usage };
  }
}
