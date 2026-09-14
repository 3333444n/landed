/*
 * The test double (ADR 006): answers from examples/generation/fixtures so every automated check
 * runs without a key. Markers in the input select failure variants, which lets a browser test
 * paste a posting that makes the "model" misbehave.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { GenerateOutcome, GenerateRequest, ModelAdapter } from "./adapter";

export const fakeMarkers = {
  invalid: "[[fake:invalid]]",
  providerError: "[[fake:provider-error]]",
  ungrounded: "[[fake:ungrounded]]",
} as const;

export class FakeModelAdapter implements ModelAdapter {
  readonly provider = "fake";
  readonly model = "fixtures";

  constructor(private readonly fixturesDir = path.join("examples", "generation", "fixtures")) {}

  async generate<T>(request: GenerateRequest<T>): Promise<GenerateOutcome<T>> {
    const usage = { inputTokens: 1200, outputTokens: 400, costUsd: null, latencyMs: 5 };
    if (request.input.includes(fakeMarkers.providerError)) {
      return {
        ok: false,
        kind: "provider",
        message: "FakeProviderError (HTTP 503)",
        usage: { ...usage, outputTokens: null },
        rawText: null,
      };
    }
    if (request.input.includes(fakeMarkers.invalid)) {
      return {
        ok: false,
        kind: "validation",
        message: "The answer did not match the document schema",
        usage,
        rawText: '{"unexpected": true}',
      };
    }
    const variant = request.input.includes(fakeMarkers.ungrounded) ? ".ungrounded" : "";
    const file = path.join(this.fixturesDir, `${request.promptName}${variant}.json`);
    const raw = JSON.parse(await readFile(file, "utf8"));
    const parsed = request.schema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        kind: "validation",
        message: `Fixture ${file} does not match the schema`,
        usage,
        rawText: JSON.stringify(raw),
      };
    }
    return { ok: true, value: parsed.data, usage };
  }
}
