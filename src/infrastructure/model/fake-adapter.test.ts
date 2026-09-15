import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { readFixture } from "../../../tests/helpers/demo-snapshot";
import {
  coverLetterContent,
  resumeContent,
  type DocumentContent,
} from "@/modules/documents/contracts";
import { createModelAdapter } from "./create-model-adapter";
import { FakeModelAdapter, fakeMarkers } from "./fake-adapter";

const adapter = new FakeModelAdapter();
const request = (input: string, promptName = "resume") => ({
  promptName,
  promptVersion: 1,
  instructions: "irrelevant",
  input,
  schema: (promptName === "resume"
    ? resumeContent
    : coverLetterContent) as z.ZodType<DocumentContent>,
});

describe("FakeModelAdapter", () => {
  it("returns the fixture for the prompt name, parsed by the schema, with usage", async () => {
    const outcome = await adapter.generate(request("plain posting"));
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.value).toEqual(readFixture("resume"));
      expect(outcome.usage.inputTokens).toBe(1200);
      expect(outcome.usage.costUsd).toBeNull();
    }
    const letter = await adapter.generate(request("posting", "cover-letter"));
    expect(letter.ok && letter.value).toEqual(readFixture("cover-letter"));
  });
  it("fails as the provider on the provider-error marker", async () => {
    const outcome = await adapter.generate(request(`text ${fakeMarkers.providerError}`));
    expect(outcome).toMatchObject({ ok: false, kind: "provider", rawText: null });
  });
  it("fails validation with raw text on the invalid marker", async () => {
    const outcome = await adapter.generate(request(`text ${fakeMarkers.invalid}`));
    expect(outcome).toMatchObject({ ok: false, kind: "validation" });
    if (!outcome.ok) expect(outcome.rawText).toContain("unexpected");
  });
  it("returns the ungrounded variant on its marker", async () => {
    const outcome = await adapter.generate(request(`text ${fakeMarkers.ungrounded}`));
    expect(outcome.ok && outcome.value).toEqual(readFixture("resume.ungrounded"));
  });
  it("reports a fixture that does not match the schema as a validation failure", async () => {
    const outcome = await adapter.generate({
      ...request("x", "resume"),
      schema: coverLetterContent,
    });
    expect(outcome).toMatchObject({ ok: false, kind: "validation" });
  });
});

describe("createModelAdapter", () => {
  it("returns null when nothing usable is configured", () => {
    expect(createModelAdapter({ kind: "unconfigured" })).toBeNull();
    expect(createModelAdapter({ kind: "invalid", problems: ["x"] })).toBeNull();
  });
  it("returns the fake adapter for fake", () => {
    const fake = createModelAdapter({ kind: "fake" });
    expect(fake).toBeInstanceOf(FakeModelAdapter);
    expect(fake?.provider).toBe("fake");
  });
  it("builds a real adapter for each configured provider without calling it", () => {
    for (const provider of ["anthropic", "openai", "gateway"] as const) {
      const built = createModelAdapter({
        kind: "configured",
        provider,
        model: "m",
        apiKey: "k",
        baseUrl: null,
      });
      expect(built).toMatchObject({ provider, model: "m" });
    }
    expect(
      createModelAdapter({
        kind: "configured",
        provider: "openai_compatible",
        model: "llama3.1",
        apiKey: null,
        baseUrl: "http://localhost:11434/v1",
      }),
    ).toMatchObject({ provider: "openai_compatible" });
  });
});
