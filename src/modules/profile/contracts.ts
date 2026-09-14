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
});
export type UpdateProfileInput = z.infer<typeof updateProfileInput>;

export const employmentInput = z.object({
  id: optionalUuid,
  expectedUpdatedAt,
  employerName: requiredText("Enter the employer"),
  role: requiredText("Enter your role"),
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
