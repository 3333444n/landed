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
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required; copy .env.example to .env")
    .refine((url) => url.startsWith("postgres://") || url.startsWith("postgresql://"), {
      message: "DATABASE_URL must be a PostgreSQL connection string",
    }),
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
