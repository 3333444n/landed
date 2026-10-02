import { describe, expect, it, vi } from "vitest";
import { modelEnv, modelInput, modelProblem } from "./model-settings";

vi.mock("electron", () => ({ safeStorage: {} }));

const settings = {
  provider: "openrouter",
  model: "vendor/model-a",
  baseUrl: "",
  key: "sk-test-1234",
};

describe("model settings", () => {
  it("accepts only the form's four string fields and a known provider", () => {
    expect(modelInput.safeParse(settings).success).toBe(true);
    expect(modelInput.safeParse({ ...settings, provider: "other" }).success).toBe(false);
    expect(modelInput.safeParse({ ...settings, extra: "x" }).success).toBe(false);
    expect(modelInput.safeParse({ ...settings, key: undefined }).success).toBe(false);
  });

  it("maps the settings to the server's variables", () => {
    expect(modelEnv(settings)).toEqual({
      LANDED_MODEL_PROVIDER: "openrouter",
      LANDED_MODEL: "vendor/model-a",
      LANDED_MODEL_BASE_URL: "",
      LANDED_MODEL_API_KEY: "sk-test-1234",
    });
  });

  it("reports what the server would reject", () => {
    expect(modelProblem(modelEnv(settings))).toBeNull();
    expect(
      modelProblem(modelEnv({ ...settings, provider: "fake", model: "", key: "" })),
    ).toBeNull();
    expect(modelProblem(modelEnv({ ...settings, key: "" }))).toBe("LANDED_MODEL_API_KEY is empty");
    expect(
      modelProblem(modelEnv({ ...settings, provider: "openai_compatible", baseUrl: "ftp://x" })),
    ).toMatch(/LANDED_MODEL_BASE_URL must be an http\(s\) URL/);
  });
});
