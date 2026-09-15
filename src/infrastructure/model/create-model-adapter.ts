/*
 * Builds the adapter the environment asks for (ADR 006). The key enters here and goes straight
 * into the provider client; nothing else reads it.
 */
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
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
    case "openai_compatible": {
      const compatible = createOpenAICompatible({
        name: "openai-compatible",
        baseURL: baseUrl!,
        apiKey: apiKey ?? "none",
        supportsStructuredOutputs: true,
        includeUsage: true,
      });
      return new AiSdkModelAdapter(provider, model, compatible(model), async (metadata) => {
        // OpenRouter reports cost in its usage block when asked; other endpoints report nothing.
        const usage = (
          metadata?.["openai-compatible"] as { usage?: { cost?: unknown } } | undefined
        )?.usage;
        return typeof usage?.cost === "number" ? usage.cost : null;
      });
    }
  }
}
