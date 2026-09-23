/*
 * Input contracts for the Jobs module. Browser-safe: no database imports.
 */
import { z } from "zod";
import {
  checkbox,
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

/** Image types accepted for a company logo, checked from the bytes, never from the file name. */
export const logoContentTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] as const;
export type LogoContentType = (typeof logoContentTypes)[number];
export const logoMaxBytes = 1_048_576;
export const logoExtensions: Record<LogoContentType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/** A stored logo as the job carries it: the file's key under the artifact directory and its type. */
export interface StoredLogo {
  storageKey: string;
  contentType: LogoContentType;
}

export const jobInput = z.object({
  /** Supplied by the client so a retried submission after a lost response does not duplicate. */
  id: optionalUuid,
  expectedUpdatedAt,
  title: requiredText("Enter the job title"),
  companyId: z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable().optional()),
  companyName: requiredText("Enter the company"),
  location: optionalText(200),
  salary: optionalText(200),
  sourceUrl: optionalUrl,
  jobSourceId: optionalUuid,
  rawDescription: requiredText("Paste the job description", 50_000),
  availability: z.enum(jobAvailabilities).default("active"),
  /**
   * The logo itself never arrives here: the composition layer stores the uploaded file or the
   * fetched address and passes the stored logo to `saveJob`. These two fields are validated with
   * the rest so a bad address is refused before anything is written.
   */
  logoUrl: optionalUrl,
  removeLogo: checkbox.default(false),
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
