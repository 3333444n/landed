/*
 * Pure rules for career facts. No database, no framework: trivially unit-testable.
 * The database enforces the same invariants as constraints (see schema.ts); these produce
 * readable field errors before any write is attempted.
 */
import type { FieldErrors } from "./contracts";

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

/** Skill names are compared trimmed, whitespace-collapsed and lowercased; nothing more (docs/04). */
export function normalizeSkillName(displayName: string): string {
  return displayName.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Editing the factual text of an achievement clears its reviewed flag (docs/04). */
export function reviewedAfterEdit(
  previous: { statement: string; reviewed: boolean },
  next: { statement: string },
): boolean {
  return previous.statement === next.statement ? previous.reviewed : false;
}

export function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === "";
}
