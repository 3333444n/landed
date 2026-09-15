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
  companyName: requiredText("Enter the company"),
  location: optionalText(200),
  salary: optionalText(200),
  sourceUrl: optionalUrl,
  rawDescription: requiredText("Paste the job description", 50_000),
  availability: z.enum(jobAvailabilities).default("active"),
});
export type JobInput = z.infer<typeof jobInput>;
