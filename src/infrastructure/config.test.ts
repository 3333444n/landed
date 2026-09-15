import { describe, expect, it } from "vitest";
import { describeModelConfig, loadConfig, modelConfig } from "./config";

// Cast: Next's ambient types make NODE_ENV a required property of ProcessEnv.
const env = (extra: Record<string, string> = {}) =>
  ({
    DATABASE_URL: "postgres://landed:landed@localhost:5432/landed_test",
    ...extra,
  }) as unknown as NodeJS.ProcessEnv;

describe("modelConfig", () => {
  it("is unconfigured when the provider is empty", () => {
    expect(modelConfig(loadConfig(env()))).toEqual({ kind: "unconfigured" });
    expect(modelConfig(loadConfig(env({ LANDED_MODEL_PROVIDER: "  " })))).toEqual({
      kind: "unconfigured",
    });
  });
  it("is fake without any other value", () => {
    expect(modelConfig(loadConfig(env({ LANDED_MODEL_PROVIDER: "fake" })))).toEqual({
      kind: "fake",
    });
  });
  it("reports what is missing", () => {
    expect(modelConfig(loadConfig(env({ LANDED_MODEL_PROVIDER: "anthropic" })))).toEqual({
      kind: "invalid",
      problems: ["LANDED_MODEL is empty", "LANDED_MODEL_API_KEY is empty"],
    });
    expect(
      modelConfig(
        loadConfig(env({ LANDED_MODEL_PROVIDER: "anthropic", LANDED_MODEL: "claude-opus-5" })),
      ),
    ).toEqual({ kind: "invalid", problems: ["LANDED_MODEL_API_KEY is empty"] });
    expect(
      modelConfig(
        loadConfig(env({ LANDED_MODEL_PROVIDER: "openai_compatible", LANDED_MODEL: "llama3.1" })),
      ),
    ).toEqual({
      kind: "invalid",
      problems: ["LANDED_MODEL_BASE_URL is required for openai_compatible"],
    });
  });
  it("is configured with a key, and without one for an OpenAI-compatible endpoint", () => {
    expect(
      modelConfig(
        loadConfig(
          env({
            LANDED_MODEL_PROVIDER: "gateway",
            LANDED_MODEL: "anthropic/claude-opus-5",
            LANDED_MODEL_API_KEY: "vck_abcd1234",
          }),
        ),
      ),
    ).toEqual({
      kind: "configured",
      provider: "gateway",
      model: "anthropic/claude-opus-5",
      apiKey: "vck_abcd1234",
      baseUrl: null,
    });
    expect(
      modelConfig(
        loadConfig(
          env({
            LANDED_MODEL_PROVIDER: "openai_compatible",
            LANDED_MODEL: "llama3.1",
            LANDED_MODEL_BASE_URL: "http://localhost:11434/v1",
          }),
        ),
      ),
    ).toEqual({
      kind: "configured",
      provider: "openai_compatible",
      model: "llama3.1",
      apiKey: null,
      baseUrl: "http://localhost:11434/v1",
    });
  });
  it("fills in the OpenRouter base URL and lets the environment override it", () => {
    const base = {
      LANDED_MODEL_PROVIDER: "openrouter",
      LANDED_MODEL: "google/gemini-3.1-flash-lite",
    };
    expect(modelConfig(loadConfig(env(base)))).toEqual({
      kind: "invalid",
      problems: ["LANDED_MODEL_API_KEY is empty"],
    });
    expect(modelConfig(loadConfig(env({ ...base, LANDED_MODEL_API_KEY: "sk-or-1234" })))).toEqual({
      kind: "configured",
      provider: "openrouter",
      model: "google/gemini-3.1-flash-lite",
      apiKey: "sk-or-1234",
      baseUrl: "https://openrouter.ai/api/v1",
    });
    expect(
      modelConfig(
        loadConfig(
          env({
            ...base,
            LANDED_MODEL_API_KEY: "sk-or-1234",
            LANDED_MODEL_BASE_URL: "https://proxy.example.com/v1",
          }),
        ),
      ),
    ).toMatchObject({ baseUrl: "https://proxy.example.com/v1" });
  });
  it("rejects an unknown provider and a bad base URL", () => {
    expect(() => loadConfig(env({ LANDED_MODEL_PROVIDER: "bedrock" }))).toThrow(
      /LANDED_MODEL_PROVIDER must be one of/,
    );
    expect(() => loadConfig(env({ LANDED_MODEL_BASE_URL: "ftp://x" }))).toThrow(
      /LANDED_MODEL_BASE_URL/,
    );
  });
  it("defaults the artifact directory", () => {
    expect(loadConfig(env()).LANDED_ARTIFACT_DIR).toBe("./artifacts");
    expect(loadConfig(env({ LANDED_ARTIFACT_DIR: "/data/pdfs" })).LANDED_ARTIFACT_DIR).toBe(
      "/data/pdfs",
    );
  });
});

describe("describeModelConfig", () => {
  it("never exposes the key, only its last four characters", () => {
    const status = describeModelConfig({
      kind: "configured",
      provider: "anthropic",
      model: "claude-opus-5",
      apiKey: "sk-ant-verysecret-9876",
      baseUrl: null,
    });
    expect(status).toEqual({
      kind: "configured",
      provider: "anthropic",
      model: "claude-opus-5",
      keyHint: "9876",
      baseUrl: null,
    });
    expect(JSON.stringify(status)).not.toContain("verysecret");
    expect(
      describeModelConfig({
        kind: "configured",
        provider: "openai_compatible",
        model: "m",
        apiKey: null,
        baseUrl: "http://localhost:11434/v1",
      }),
    ).toMatchObject({ keyHint: null });
    expect(describeModelConfig({ kind: "fake" })).toEqual({ kind: "fake" });
  });
});
