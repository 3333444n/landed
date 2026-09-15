/*
 * Builds the adapter the environment asks for (ADR 006). The key enters here and goes straight
 * into the provider client; nothing else reads it.
 */
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible, type MetadataExtractor } from "@ai-sdk/openai-compatible";
import { createGateway } from "ai";
import type { ModelConfig } from "../config";
import type { ModelAdapter } from "./adapter";
import { AiSdkModelAdapter } from "./ai-sdk-adapter";
import { FakeModelAdapter } from "./fake-adapter";

/** Null when nothing is configured: the interface then offers paste-back only. */
export function createModelAdapter(config: ModelConfig): ModelAdapter | null {
  switch (config.kind) {
    case "unconfigured":
    case "invalid":
      return null;
    case "fake":
      return new FakeModelAdapter();
    case "configured":
      break;
  }
  const { provider, model, apiKey, baseUrl } = config;
  switch (provider) {
    case "anthropic":
      return new AiSdkModelAdapter(provider, model, createAnthropic({ apiKey: apiKey! })(model));
    case "openai":
      return new AiSdkModelAdapter(provider, model, createOpenAI({ apiKey: apiKey! })(model));
    case "gateway": {
      const gateway = createGateway({ apiKey: apiKey! });
      return new AiSdkModelAdapter(provider, model, gateway(model), async (metadata) => {
        const generationId = (metadata?.gateway as { generationId?: unknown } | undefined)
          ?.generationId;
        if (typeof generationId !== "string") return null;
        const info = await gateway.getGenerationInfo({ id: generationId });
        return typeof info.totalCost === "number" ? info.totalCost : null;
      });
    }
    case "openrouter": {
      // The OpenAI-compatible path with the base URL known, usage accounting switched on
      // (OpenRouter then reports the cost of each call in its usage block) and the app named in
      // the headers OpenRouter documents for attribution.
      const openrouter = createOpenAICompatible({
        name: "openrouter",
        baseURL: baseUrl!,
        apiKey: apiKey!,
        headers: { "HTTP-Referer": "https://github.com/3333444n/landed", "X-Title": "Landed" },
        supportsStructuredOutputs: true,
        includeUsage: true,
        metadataExtractor: openRouterMetadata,
      });
      return new AiSdkModelAdapter(
        provider,
        model,
        openrouter(model),
        async (metadata) => {
          const cost = (metadata?.openrouter as { cost?: unknown } | undefined)?.cost;
          return typeof cost === "number" ? cost : null;
        },
        { openrouter: { usage: { include: true } } },
      );
    }
    case "openai_compatible": {
      // Any endpoint that speaks the OpenAI chat API. Nothing here reports cost.
      const compatible = createOpenAICompatible({
        name: "openai-compatible",
        baseURL: baseUrl!,
        apiKey: apiKey ?? "none",
        supportsStructuredOutputs: true,
        includeUsage: true,
      });
      return new AiSdkModelAdapter(provider, model, compatible(model));
    }
  }
}

/** Reads `usage.cost` from an OpenRouter response body; the SDK's own extractor ignores it. */
const openRouterMetadata: MetadataExtractor = {
  extractMetadata: async ({ parsedBody }) => {
    const cost = (parsedBody as { usage?: { cost?: unknown } } | undefined)?.usage?.cost;
    return typeof cost === "number" ? { openrouter: { cost } } : undefined;
  },
  createStreamExtractor: () => ({
    processChunk: () => undefined,
    buildMetadata: () => undefined,
  }),
};
