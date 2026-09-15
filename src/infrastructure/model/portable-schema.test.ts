import { describe, expect, it } from "vitest";
import { z } from "zod";
import { resumeContent } from "@/modules/documents/contracts";
import { portableSchema, withoutLengthKeywords } from "./portable-schema";

describe("portableSchema", () => {
  it("drops length keywords at every depth and keeps the rest", async () => {
    const schema = portableSchema(resumeContent);
    const json = JSON.stringify(await schema.jsonSchema);
    for (const keyword of ["minItems", "maxItems", "minLength", "maxLength"]) {
      expect(json).not.toContain(`"${keyword}"`);
    }
    expect(json).toContain('"enum":["experience","projects","education","skills"]');
    expect(json).toContain('"description":"Ids of snapshot records that support this text"');
    expect(json).toContain('"required":["header","summary","sections"]');
    expect(json).toContain('"additionalProperties":false');
  });
  it("still validates the answer against the full Zod schema", async () => {
    const schema = portableSchema(
      z.object({ items: z.array(z.string().max(3)).max(2), label: z.string().trim() }),
    );
    const ok = await schema.validate!({ items: ["a", "b"], label: "  x " });
    expect(ok).toEqual({ success: true, value: { items: ["a", "b"], label: "x" } });
    const tooMany = await schema.validate!({ items: ["a", "b", "c"], label: "x" });
    expect(tooMany.success).toBe(false);
    const tooLong = await schema.validate!({ items: ["abcd"], label: "x" });
    expect(tooLong.success).toBe(false);
  });
  it("does not confuse a property named like a keyword with the keyword", () => {
    const stripped = withoutLengthKeywords({
      type: "object",
      properties: { maxItems: { type: "number", maxLength: 3 } },
      maxItems: 4,
    });
    expect(stripped).toEqual({
      type: "object",
      properties: { maxItems: { type: "number" } },
    });
  });
});
