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

  async call(req: ModelRequest): Promise<ModelResponse> {
    const res = await this.client.responses.create({
      model: this.model,
      instructions: req.system,
      input: req.user,
      max_output_tokens: req.maxOutputTokens,
      store: false,
      ...(this.effort ? { reasoning: { effort: this.effort } } : {}),
      text: { format: { type: "json_schema", name: req.schemaName, schema: req.schema, strict: true } },
    });
    const usage = {
      input: res.usage?.input_tokens ?? 0,
      cached: res.usage?.input_tokens_details?.cached_tokens ?? 0,
      output: res.usage?.output_tokens ?? 0,
    };
    let json: unknown = null;
    try {
      json = JSON.parse(res.output_text);
    } catch {
      // truncated or refused: the pipeline treats a non-object as a failed step
    }
    return { json, usage };
  }
}
