/*
 * Contract pieces every module shares: the result shape, the error kinds and the Zod field
 * helpers that turn form strings into typed values. Browser-safe: no database imports.
 */
import { z } from "zod";

/** Field-level errors keyed by field name; "form" carries errors that belong to no single field. */
export type FieldErrors = Record<string, string[]>;

export type ModuleError =
  | { kind: "validation"; fieldErrors: FieldErrors }
  | { kind: "not_found"; message: string }
  | { kind: "conflict"; message: string }
  | { kind: "stale"; message: string };

export type Result<T> = { ok: true; value: T } | { ok: false; error: ModuleError };

export function fieldErrorsFromZod(error: z.ZodError): FieldErrors {
  const flat = z.flattenError(error);
  const errors: FieldErrors = {};
  for (const [field, messages] of Object.entries(
    flat.fieldErrors as Record<string, string[] | undefined>,
  )) {
    if (messages && messages.length > 0) errors[field] = messages;
  }
  if (flat.formErrors.length > 0) errors.form = flat.formErrors;
  return errors;
}

// Form field helpers. Forms submit strings; these trim them and turn empty strings into "absent".

export const blankToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

export const optionalText = (max = 4000) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());
export const optionalUuid = z.preprocess(blankToUndefined, z.uuid().optional());
export const optionalUrl = z.preprocess(
  blankToUndefined,
  z
    .url({ protocol: /^https?$/, error: "Enter a full web address starting with http or https" })
    .optional(),
);
export const optionalInt = z.preprocess(
  blankToUndefined,
  z.coerce.number({ error: "Enter a whole number" }).int("Enter a whole number").optional(),
);
/** Checkboxes submit "on" when checked and nothing when not. */
export const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
/** A comma-separated text field becomes a list of trimmed, non-empty items. */
export const commaList = z.preprocess(
  (v) =>
    typeof v === "string"
      ? v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : v,
  z.array(z.string().max(200)).default([]),
);
export const requiredText = (message: string, max = 200) =>
  z.string({ error: message }).trim().min(1, message).max(max, `Keep this under ${max} characters`);

/** The updated_at value the form was rendered with; a mismatch means another tab saved first. */
export const expectedUpdatedAt = z.preprocess(blankToUndefined, z.iso.datetime().optional());
