/*
 * The schema a provider sees versus the schema the app enforces. Providers compile the JSON
 * schema into a decoding grammar and each has its own dialect: OpenAI's strict mode rejects
 * length keywords outright, and Google rejects a schema whose nested `maxItems` multiply past
 * a complexity limit (the resume's sections × entries × bullets × evidence ids did). The budgets
 * are already stated in the prompt and are enforced by Zod on the answer, so the provider gets
 * the same shape without them. Everything else (types, enums, nullability, descriptions) stays.
 */
import { jsonSchema, type Schema } from "ai";
import { z } from "zod";

const lengthKeywords = new Set(["minItems", "maxItems", "minLength", "maxLength"]);

type JsonSchemaArgument = Parameters<typeof jsonSchema>[0];

/** A JSON schema without length keywords, validated by the original Zod schema. */
export function portableSchema<T>(schema: z.ZodType<T>): Schema<T> {
  const json = withoutLengthKeywords(
    z.toJSONSchema(schema, { target: "draft-7", io: "output", reused: "inline" }),
  ) as Exclude<JsonSchemaArgument, PromiseLike<unknown> | (() => unknown)>;
  return jsonSchema<T>(json, {
    validate: (value) => {
      const result = schema.safeParse(value);
      return result.success
        ? { success: true, value: result.data }
        : { success: false, error: result.error };
    },
  });
}

/** Keys whose values are maps from a name to a schema; the names themselves are never keywords. */
const schemaMaps = new Set(["properties", "$defs", "definitions", "patternProperties"]);

/** Removes the length keywords from every schema node at every depth. */
export function withoutLengthKeywords(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(withoutLengthKeywords);
  if (node === null || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (lengthKeywords.has(key)) continue;
    out[key] =
      schemaMaps.has(key) && value !== null && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(
            Object.entries(value).map(([name, child]) => [name, withoutLengthKeywords(child)]),
          )
        : withoutLengthKeywords(value);
  }
  return out;
}
