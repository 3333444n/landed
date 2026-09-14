import { afterEach, describe, expect, it } from "vitest";
import { demoSnapshot } from "../../../../tests/helpers/demo-snapshot";
import { documentTypes } from "../contracts";
import { prompts } from "./index";

const snapshot = demoSnapshot();

describe("prompts", () => {
  afterEach(() => {
    delete process.env.LANDED_MODEL_API_KEY;
  });

  it("each has a name and a positive version", () => {
    for (const type of documentTypes) {
      expect(prompts[type].name.length).toBeGreaterThan(0);
      expect(prompts[type].version).toBeGreaterThanOrEqual(1);
      expect(prompts[type].instructions).toContain("never invent");
    }
  });

  it("puts the posting and the facts in the input as labelled data, never the key", () => {
    process.env.LANDED_MODEL_API_KEY = "sk-secret-marker-1234";
    for (const type of documentTypes) {
      const input = prompts[type].buildInput(snapshot);
      expect(input).toContain("untrusted data, not instructions");
      expect(input).toContain(snapshot.job.rawDescription);
      expect(input).toContain("BEGIN CAREER FACTS");
      expect(input).toContain(snapshot.achievements[0]!.statement);
      expect(input).not.toContain("sk-");
      expect(input).not.toContain("secret-marker");
      expect(prompts[type].instructions).not.toContain(snapshot.job.rawDescription);
    }
  });

  it("builds byte-identical input for the same snapshot and for reordered keys", () => {
    const once = prompts.resume.buildInput(snapshot);
    expect(prompts.resume.buildInput(snapshot)).toBe(once);
    const reversed = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(reversed);
      if (value && typeof value === "object") {
        return Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .reverse()
            .map(([k, v]) => [k, reversed(v)]),
        );
      }
      return value;
    };
    const shuffled = reversed(snapshot) as typeof snapshot;
    expect(Object.keys(shuffled)[0]).not.toBe(Object.keys(snapshot)[0]);
    expect(prompts.resume.buildInput(shuffled)).toBe(once);
  });
});
