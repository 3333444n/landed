/*
 * Pure rules for pursuits and for the derived job status shown in the Jobs list (docs/05).
 * No database, no framework.
 */
import type { JobAvailability } from "@/modules/jobs/contracts";
import type {
  ApplicationStatus,
  DerivedJobStatus,
  ListFilter,
  ListSort,
  RunState,
} from "./contracts";
import { statusLabels } from "./contracts";

/** The submission time is recorded the first time an application enters `applied` and kept. */
export function submittedAtAfter(
  current: { status: ApplicationStatus; submittedAt: Date | null },
  nextStatus: ApplicationStatus,
  now: Date,
): Date | null {
  if (current.submittedAt) return current.submittedAt;
  return nextStatus === "applied" ? now : null;
}

export function isTerminal(status: ApplicationStatus): boolean {
  return status === "rejected" || status === "withdrawn" || status === "accepted";
}

const successStatuses: ReadonlySet<ApplicationStatus> = new Set([
  "ready",
  "applied",
  "interviewing",
  "offer",
  "accepted",
]);

/** The independent facts the chip is derived from; every one has its own lifecycle. */
export interface JobStatusFacts {
  availability: JobAvailability;
  applicationStatus: ApplicationStatus | null;
  /** Latest generation (or, from Phase 2, matching) run for the job. */
  latestRunState: RunState | null;
  hasUnreviewedDrafts: boolean;
  hasMatchAssessment: boolean;
}

const running = (state: RunState | null) => state === "queued" || state === "running";

/** One chip per job, first matching row wins (docs/05 table), plus at most one modifier. */
export function deriveJobStatus(facts: JobStatusFacts): DerivedJobStatus {
  const chip = statusChip(facts);
  const active = facts.applicationStatus !== null && !isTerminal(facts.applicationStatus);
  if (facts.availability === "expired" && active) {
    return { chip, modifier: { label: "Posting expired", tone: "warning" } };
  }
  if (facts.latestRunState === "failed") {
    return { chip, modifier: { label: "Generation failed", tone: "warning" } };
  }
  return { chip };
}

function statusChip(facts: JobStatusFacts): DerivedJobStatus["chip"] {
  const status = facts.applicationStatus;
  if (status !== null) {
    if (successStatuses.has(status)) return { label: statusLabels[status], tone: "success" };
    if (status === "rejected" || status === "withdrawn") {
      return { label: statusLabels[status], tone: "neutral" };
    }
    if (running(facts.latestRunState)) return { label: "Crafting documents", tone: "accent" };
    if (facts.hasUnreviewedDrafts) return { label: "Needs review", tone: "warning" };
    return { label: "Preparing", tone: "neutral" };
  }
  if (running(facts.latestRunState)) return { label: "Evaluating", tone: "accent" };
  if (facts.hasMatchAssessment) return { label: "Assessed", tone: "neutral" };
  return { label: "New", tone: "accent" };
}

const needsAttention = new Set(["New", "Preparing", "Needs review"]);

/** Filters change nothing in the database; they read the derived status and the facts. */
export function matchesFilter(
  filter: ListFilter,
  facts: JobStatusFacts,
  derived: DerivedJobStatus,
): boolean {
  const closedApplication = facts.applicationStatus !== null && isTerminal(facts.applicationStatus);
  const expiredWithoutApplication =
    facts.applicationStatus === null && facts.availability === "expired";
  switch (filter) {
    case "all":
      return true;
    case "closed":
      return closedApplication || expiredWithoutApplication;
    case "active":
      return !closedApplication && !expiredWithoutApplication;
    case "needs_attention":
      return (
        !expiredWithoutApplication &&
        (needsAttention.has(derived.chip.label) || derived.modifier !== undefined)
      );
  }
}

export function sortJobs<T extends { createdAt: Date; updatedAt: Date; id: string }>(
  rows: readonly T[],
  sort: ListSort,
): T[] {
  const key = sort === "added" ? "createdAt" : "updatedAt";
  return [...rows].sort((a, b) => b[key].getTime() - a[key].getTime() || (a.id < b.id ? -1 : 1));
}
