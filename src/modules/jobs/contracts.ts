/*
 * Input contracts for the Jobs module. Browser-safe: no database imports.
 */
import { z } from "zod";
import {
  expectedUpdatedAt,
  optionalText,
  optionalUrl,
  optionalUuid,
  requiredText,
} from "@/modules/shared/contracts";

/** Where a job came from. Phase 2 adds URL import; Phase 3 adds discovery providers. */
export const jobSources = ["pasted"] as const;
export type JobSource = (typeof jobSources)[number];

/** The posting's own lifecycle, independent of any application (docs/05). */
export const jobAvailabilities = ["active", "expired", "unknown"] as const;
export type JobAvailability = (typeof jobAvailabilities)[number];

export const availabilityLabels: Record<JobAvailability, string> = {
  active: "Active",
  expired: "Expired",
  unknown: "Unknown",
};

export const jobInput = z.object({
  /** Supplied by the client so a retried submission after a lost response does not duplicate. */
  id: optionalUuid,
  expectedUpdatedAt,
  title: requiredText("Enter the job title"),
  companyId: z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable().optional()),
  location: optionalText(200),
  salary: optionalText(200),
  sourceUrl: optionalUrl,
  jobSourceId: optionalUuid,
  rawDescription: requiredText("Paste the job description", 50_000),
  availability: z.enum(jobAvailabilities).default("active"),
});
export type JobInput = z.infer<typeof jobInput>;

export const createJobSourceInput = z.object({
  id: z.uuid(),
  name: requiredText("Enter a source name"),
});
export const updateJobSourceInput = z.object({
  expectedUpdatedAt: z.iso.datetime(),
  name: requiredText("Enter a source name").optional(),
  archived: z.boolean().optional(),
});
export const updateJobSourceLinkInput = z.object({
  expectedUpdatedAt: z.iso.datetime(),
  jobSourceId: z.uuid().nullable(),
});
export const jobCompanyInput = z.object({
  companyId: z.uuid().nullable(),
  expectedUpdatedAt: z.iso.datetime(),
});
export const findingSelectionInput = z.object({
  findingIds: z
    .array(z.uuid())
    .max(5)
    .refine((ids) => new Set(ids).size === ids.length, "Choose each finding only once"),
  expectedUpdatedAt: z.iso.datetime(),
});
