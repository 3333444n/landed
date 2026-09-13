/*
 * Pure rules for career facts. No database, no framework: trivially unit-testable.
 * The database enforces the same invariants as constraints (see schema.ts); these produce
 * readable field errors before any write is attempted.
 */
import type { FieldErrors, MonthDateInput } from "./contracts";

/** An achievement may cite one employment record or one project, never both (docs/02). */
export function contextLinkErrors(input: {
  employmentId?: string | undefined;
  projectId?: string | undefined;
}): FieldErrors {
  if (input.employmentId && input.projectId) {
    return { projectId: ["Link the achievement to a job or a project, not both"] };
  }
  return {};
}

/** Month-only dates: year and month come together, months are 1-12, end is not before start. */
export function monthDateErrors(input: MonthDateInput): FieldErrors {
  const errors: FieldErrors = {};
  const pair = (year: number | undefined, month: number | undefined, prefix: "start" | "end") => {
    if ((year === undefined) !== (month === undefined)) {
      errors[`${prefix}Month`] = ["Enter both the year and the month, or leave both empty"];
      return;
    }
    if (month !== undefined && (month < 1 || month > 12)) {
      errors[`${prefix}Month`] = ["Enter a month from 1 to 12"];
    }
    if (year !== undefined && (year < 1900 || year > 2100)) {
      errors[`${prefix}Year`] = ["Enter a year between 1900 and 2100"];
    }
  };
  pair(input.startYear, input.startMonth, "start");
  pair(input.endYear, input.endMonth, "end");
  if (
    Object.keys(errors).length === 0 &&
    input.startYear !== undefined &&
    input.startMonth !== undefined &&
    input.endYear !== undefined &&
    input.endMonth !== undefined &&
    input.endYear * 12 + input.endMonth < input.startYear * 12 + input.startMonth
  ) {
    errors.endMonth = ["The end date is before the start date"];
  }
  return errors;
}

/** Skill names are compared trimmed, whitespace-collapsed and lowercased; nothing more (docs/04). */
export function normalizeSkillName(displayName: string): string {
  return displayName.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Editing the factual text of an achievement clears its reviewed flag (docs/04). */
export function reviewedAfterEdit(
  previous: { statement: string; reviewed: boolean },
  next: { statement: string; reviewed?: boolean | undefined },
): boolean {
  if (previous.statement !== next.statement) return false;
  return next.reviewed ?? previous.reviewed;
}

export function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === "";
}
