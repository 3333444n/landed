/*
 * Input and output contracts for the Profile module. Browser-safe: no database imports.
 * Forms submit strings; these schemas trim them and turn empty strings into "absent".
 */
import { z } from "zod";
import {
  blankToUndefined,
  checkbox,
  commaList,
  expectedUpdatedAt,
  fieldErrorsFromZod,
  optionalInt,
  optionalText as sharedOptionalText,
  optionalUrl,
  optionalUuid,
  requiredText,
  type FieldErrors,
  type ModuleError,
  type Result,
} from "@/modules/shared/contracts";

export { fieldErrorsFromZod, type FieldErrors, type Result };

export const educationStatuses = ["in_progress", "completed", "incomplete"] as const;
export type EducationStatus = (typeof educationStatuses)[number];

const optionalText = sharedOptionalText();

const monthDates = {
  startYear: optionalInt,
  startMonth: optionalInt,
  endYear: optionalInt,
  endMonth: optionalInt,
};
export type MonthDateInput = {
  startYear?: number | undefined;
  startMonth?: number | undefined;
  endYear?: number | undefined;
  endMonth?: number | undefined;
};

export const createProfileInput = z.object({
  id: optionalUuid,
  displayName: requiredText("Enter your name"),
});
export type CreateProfileInput = z.infer<typeof createProfileInput>;

export const workArrangements = ["remote", "hybrid", "onsite"] as const;

export const updateProfileInput = z.object({
  expectedUpdatedAt,
  displayName: requiredText("Enter your name"),
  headline: optionalText,
  summary: optionalText,
  email: z.preprocess(blankToUndefined, z.email("Enter a valid email address").optional()),
  phone: optionalText,
  location: optionalText,
  desiredRoles: commaList,
  locations: commaList,
  workArrangement: z.preprocess(
    (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]),
    z.array(z.enum(workArrangements)).default([]),
  ),
  constraints: optionalText,
  /** Resume header links (Phase 1b). Each is optional; a filled one must be a web address. */
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  websiteUrl: optionalUrl,
});
export type UpdateProfileInput = z.infer<typeof updateProfileInput>;

export const profileLinkLabels = {
  linkedinUrl: "LinkedIn",
  githubUrl: "GitHub",
  websiteUrl: "Website",
} as const;

export const employmentInput = z.object({
  id: optionalUuid,
  expectedUpdatedAt,
  employerName: requiredText("Enter the employer"),
  role: requiredText("Enter your role"),
  location: optionalText,
  ...monthDates,
  isCurrent: checkbox,
  description: optionalText,
});
export type EmploymentInput = z.infer<typeof employmentInput>;

export const educationInput = z.object({
  id: optionalUuid,
  expectedUpdatedAt,
  institution: requiredText("Enter the institution"),
  qualification: optionalText,
  subject: optionalText,
  ...monthDates,
  status: z.enum(educationStatuses, { error: "Choose a status" }),
  description: optionalText,
});
export type EducationInput = z.infer<typeof educationInput>;

export const projectInput = z.object({
  id: optionalUuid,
  expectedUpdatedAt,
  name: requiredText("Enter the project name"),
  description: optionalText,
  url: optionalUrl,
  employmentId: optionalUuid,
  ...monthDates,
});
export type ProjectInput = z.infer<typeof projectInput>;

export const skillInput = z.object({
  id: optionalUuid,
  expectedUpdatedAt,
  displayName: requiredText("Enter the skill"),
  category: optionalText,
  employmentIds: z.array(z.uuid()).default([]),
  projectIds: z.array(z.uuid()).default([]),
});
export type SkillInput = z.infer<typeof skillInput>;

export const achievementInput = z.object({
  /** Supplied by the client so a retried submission after a lost response does not duplicate. */
  id: optionalUuid,
  expectedUpdatedAt,
  statement: requiredText("Write the factual statement", 2000),
  problem: optionalText,
  action: optionalText,
  result: optionalText,
  metric: optionalText,
  sourceNote: optionalText,
  sourceUrl: optionalUrl,
  employmentId: optionalUuid,
  projectId: optionalUuid,
  skillIds: z.array(z.uuid()).default([]),
  reviewed: checkbox.default(false),
});
export type AchievementInput = z.infer<typeof achievementInput>;
/** Kept for the create form, which has no update token or reviewed flag. */
export const createAchievementInput = achievementInput;
export type CreateAchievementInput = AchievementInput;

export type ProfileError = ModuleError;

/** JSON contracts for conversational edits: omission preserves; null clears optional values. */
const patchText = z.string().trim().max(4000).nullable().optional();
const patchUrl = z
  .url({ protocol: /^https?$/ })
  .nullable()
  .optional();
const patchUuid = z.uuid().nullable().optional();
const patchDates = {
  startYear: z.number().int().nullable().optional(),
  startMonth: z.number().int().nullable().optional(),
  endYear: z.number().int().nullable().optional(),
  endMonth: z.number().int().nullable().optional(),
};
const patchVersion = { expectedUpdatedAt: z.iso.datetime() };
export const profilePatchInput = z.strictObject({
  ...patchVersion,
  displayName: requiredText("Enter your name").optional(),
  headline: patchText,
  summary: patchText,
  email: z.email().nullable().optional(),
  phone: patchText,
  location: patchText,
  desiredRoles: z.array(z.string().trim().min(1).max(200)).optional(),
  locations: z.array(z.string().trim().min(1).max(200)).optional(),
  workArrangement: z.array(z.enum(workArrangements)).optional(),
  constraints: patchText,
  linkedinUrl: patchUrl,
  githubUrl: patchUrl,
  websiteUrl: patchUrl,
});
export const employmentPatchInput = z.strictObject({
  ...patchVersion,
  employerName: requiredText("Enter the employer").optional(),
  role: requiredText("Enter your role").optional(),
  location: patchText,
  ...patchDates,
  isCurrent: z.boolean().optional(),
  description: patchText,
});
export const educationPatchInput = z.strictObject({
  ...patchVersion,
  institution: requiredText("Enter the institution").optional(),
  qualification: patchText,
  subject: patchText,
  ...patchDates,
  status: z.enum(educationStatuses).optional(),
  description: patchText,
});
export const projectPatchInput = z.strictObject({
  ...patchVersion,
  name: requiredText("Enter the project name").optional(),
  description: patchText,
  url: patchUrl,
  employmentId: patchUuid,
  ...patchDates,
});
export const skillPatchInput = z.strictObject({
  ...patchVersion,
  displayName: requiredText("Enter the skill").optional(),
  category: patchText,
  employmentIds: z.array(z.uuid()).optional(),
  projectIds: z.array(z.uuid()).optional(),
});
export const achievementPatchInput = z.strictObject({
  ...patchVersion,
  statement: requiredText("Write the factual statement", 2000).optional(),
  problem: patchText,
  action: patchText,
  result: patchText,
  metric: patchText,
  sourceNote: patchText,
  sourceUrl: patchUrl,
  employmentId: patchUuid,
  projectId: patchUuid,
  skillIds: z.array(z.uuid()).optional(),
});
export type ProfilePatchInput = z.infer<typeof profilePatchInput>;
export type EmploymentPatchInput = z.infer<typeof employmentPatchInput>;
export type EducationPatchInput = z.infer<typeof educationPatchInput>;
export type ProjectPatchInput = z.infer<typeof projectPatchInput>;
export type SkillPatchInput = z.infer<typeof skillPatchInput>;
export type AchievementPatchInput = z.infer<typeof achievementPatchInput>;
