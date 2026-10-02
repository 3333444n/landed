import { z } from "zod";

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/**
 * Providers the adapter factory knows (ADR 006). `openrouter` is the OpenAI-compatible path with
 * its base URL filled in, so a user types three lines instead of four. `fake` answers from
 * fixtures and needs no key.
 */
export const modelProviders = [
  "anthropic",
  "openai",
  "openrouter",
  "gateway",
  "openai_compatible",
  "fake",
] as const;
export type ModelProvider = (typeof modelProviders)[number];

export const openRouterBaseUrl = "https://openrouter.ai/api/v1";

const envSchema = z.object({
  LANDED_DATABASE_PATH: z.preprocess(blank, z.string().trim().default("./data/landed.db")),
  LANDED_MODEL_PROVIDER: z.preprocess(
    blank,
    z
      .enum(modelProviders, {
        error: `LANDED_MODEL_PROVIDER must be one of ${modelProviders.join(", ")}`,
      })
      .optional(),
  ),
  LANDED_MODEL: z.preprocess(blank, z.string().trim().max(200).optional()),
  LANDED_MODEL_API_KEY: z.preprocess(blank, z.string().trim().max(4000).optional()),
  LANDED_MODEL_BASE_URL: z.preprocess(
    blank,
    z
      .url({ protocol: /^https?$/, error: "LANDED_MODEL_BASE_URL must be an http(s) URL" })
      .optional(),
  ),
  LANDED_ARTIFACT_DIR: z.preprocess(blank, z.string().trim().default("./artifacts")),
  /** Extra hostnames the host guard accepts besides localhost, for a later remote design. */
  LANDED_ALLOWED_HOSTS: z.preprocess(blank, z.string().trim().max(2000).optional()),
});

export type Config = z.infer<typeof envSchema>;

/** Reads and validates process configuration. Throws a readable error on a missing or malformed value. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid configuration: ${issues}`);
  }
  return parsed.data;
}

/**
 * The model configuration as the adapter factory needs it. `configured` is the only variant that
 * carries the key; everything shown to a person goes through `describeModelConfig`.
 */
export type ModelConfig =
  | { kind: "unconfigured" }
  | { kind: "invalid"; problems: string[] }
  | { kind: "fake" }
  | {
      kind: "configured";
      provider: Exclude<ModelProvider, "fake">;
      model: string;
      apiKey: string | null;
      baseUrl: string | null;
    };

export function modelConfig(config: Config): ModelConfig {
  const provider = config.LANDED_MODEL_PROVIDER;
  if (!provider) return { kind: "unconfigured" };
  if (provider === "fake") return { kind: "fake" };
  const problems: string[] = [];
  if (!config.LANDED_MODEL) problems.push("LANDED_MODEL is empty");
  if (provider !== "openai_compatible" && !config.LANDED_MODEL_API_KEY) {
    problems.push("LANDED_MODEL_API_KEY is empty");
  }
  if (provider === "openai_compatible" && !config.LANDED_MODEL_BASE_URL) {
    problems.push("LANDED_MODEL_BASE_URL is required for openai_compatible");
  }
  if (problems.length > 0) return { kind: "invalid", problems };
  const baseUrl =
    provider === "openrouter"
      ? (config.LANDED_MODEL_BASE_URL ?? openRouterBaseUrl)
      : (config.LANDED_MODEL_BASE_URL ?? null);
  return {
    kind: "configured",
    provider,
    model: config.LANDED_MODEL!,
    apiKey: config.LANDED_MODEL_API_KEY ?? null,
    baseUrl,
  };
}

/** What the Model setup column may show: never the key, at most its last characters. */
export type ModelStatus =
  | { kind: "unconfigured" }
  | { kind: "invalid"; problems: string[] }
  | { kind: "fake" }
  | {
      kind: "configured";
      provider: Exclude<ModelProvider, "fake">;
      model: string;
      keyHint: string | null;
      baseUrl: string | null;
    };

export function describeModelConfig(config: ModelConfig): ModelStatus {
  if (config.kind !== "configured") return config;
  return {
    kind: "configured",
    provider: config.provider,
    model: config.model,
    keyHint: config.apiKey ? config.apiKey.slice(-4) : null,
    baseUrl: config.baseUrl,
  };
}

/** The comma-separated hostname list as an array; blank entries dropped. */
export function allowedHosts(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
}
