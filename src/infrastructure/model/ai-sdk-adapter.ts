/*
 * The Vercel AI SDK implementation: a class because it holds a live client (the provider's
 * language model), an optional cost lookup and optional provider options sent with every request
 * (OpenRouter's usage accounting, for example). One call per generate; no tools, no loop.
 */
import { generateText, NoObjectGeneratedError, Output, type LanguageModel } from "ai";
import type { GenerateOutcome, GenerateRequest, GenerateUsage, ModelAdapter } from "./adapter";
import { portableSchema } from "./portable-schema";

/** The SDK does not export this type; it is whatever `generateText` accepts as `providerOptions`. */
export type ProviderOptions = NonNullable<Parameters<typeof generateText>[0]["providerOptions"]>;

export type CostLookup = (
  providerMetadata: Record<string, unknown> | undefined,
) => Promise<number | null>;

export class AiSdkModelAdapter implements ModelAdapter {
  constructor(
    readonly provider: string,
    readonly model: string,
    private readonly languageModel: LanguageModel,
    private readonly lookupCost: CostLookup = async () => null,
    private readonly providerOptions: ProviderOptions | undefined = undefined,
  ) {}

  async generate<T>(request: GenerateRequest<T>): Promise<GenerateOutcome<T>> {
    const started = Date.now();
    try {
      const result = await generateText({
        model: this.languageModel,
        instructions: request.instructions,
        prompt: request.input,
        output: Output.object({ schema: portableSchema(request.schema) }),
        maxRetries: 1,
        providerOptions: this.providerOptions,
      });
      const latencyMs = Date.now() - started;
      const costUsd = await this.lookupCost(
        result.providerMetadata as Record<string, unknown> | undefined,
      ).catch(() => null);
      return {
        ok: true,
        value: result.output,
        usage: {
          inputTokens: result.usage.inputTokens ?? null,
          outputTokens: result.usage.outputTokens ?? null,
          costUsd,
          latencyMs,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - started;
      if (NoObjectGeneratedError.isInstance(error)) {
        const usage: GenerateUsage = {
          inputTokens: error.usage?.inputTokens ?? null,
          outputTokens: error.usage?.outputTokens ?? null,
          costUsd: null,
          latencyMs,
        };
        return {
          ok: false,
          kind: "validation",
          message: "The answer did not match the document schema",
          usage,
          rawText: error.text ?? null,
        };
      }
      return {
        ok: false,
        kind: "provider",
        message: describeError(error),
        usage: { inputTokens: null, outputTokens: null, costUsd: null, latencyMs },
        rawText: null,
      };
    }
  }
}

/** A short, content-free description: the error class and a status code when there is one. */
function describeError(error: unknown): string {
  if (error instanceof Error) {
    const status = (error as { statusCode?: unknown }).statusCode;
    return typeof status === "number" ? `${error.name} (HTTP ${status})` : error.name;
  }
  return "Unknown error";
}
