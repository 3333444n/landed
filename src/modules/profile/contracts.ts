/*
 * Input and output contracts for the Profile module. Browser-safe: no database imports.
 * Forms submit strings; these schemas trim them and turn empty strings into "absent".
 */
import { z } from "zod";

const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().max(4000).optional(),
);

const optionalUuid = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.uuid().optional(),
);

const optionalUrl = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z
    .url({ protocol: /^https?$/, error: "Enter a full web address starting with http or https" })
    .optional(),
);

export const createProfileInput = z.object({
  id: optionalUuid,
  displayName: z.string({ error: "Enter your name" }).trim().min(1, "Enter your name").max(200),
});
export type CreateProfileInput = z.infer<typeof createProfileInput>;

export const createAchievementInput = z
  .object({
    /** Supplied by the client so a retried submission after a lost response does not duplicate. */
    id: optionalUuid,
    statement: z
      .string({ error: "Write the factual statement" })
      .trim()
      .min(1, "Write the factual statement")
      .max(2000, "Keep the statement under 2000 characters"),
    problem: optionalText,
    action: optionalText,
    result: optionalText,
    metric: optionalText,
    sourceNote: optionalText,
    sourceUrl: optionalUrl,
    employmentId: optionalUuid,
    projectId: optionalUuid,
    skillIds: z.array(z.uuid()).default([]),
  })
  .refine((v) => !(v.employmentId && v.projectId), {
    message: "Link the achievement to a job or a project, not both",
    path: ["projectId"],
  });
export type CreateAchievementInput = z.infer<typeof createAchievementInput>;

/** Field-level errors keyed by field name; "form" carries errors that belong to no single field. */
export type FieldErrors = Record<string, string[]>;

export type ProfileError =
  | { kind: "validation"; fieldErrors: FieldErrors }
  | { kind: "not_found"; message: string }
  | { kind: "conflict"; message: string };

export type Result<T> = { ok: true; value: T } | { ok: false; error: ProfileError };

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
