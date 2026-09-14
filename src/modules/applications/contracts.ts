/*
 * Input contracts and vocabulary for the Applications module. Browser-safe: no database imports.
 */
import { z } from "zod";
import { expectedUpdatedAt, optionalText, optionalUuid } from "@/modules/shared/contracts";

/** Pursuit lifecycle (docs/05). Independent of job availability and of run state. */
export const applicationStatuses = [
  "preparing",
  "ready",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
  "accepted",
] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

/** Sentence-case words for chips and selects (DESIGN.md). */
export const statusLabels: Record<ApplicationStatus, string> = {
  preparing: "Preparing",
  ready: "Ready",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  accepted: "Accepted",
};

export const createApplicationInput = z.object({
  id: optionalUuid,
  jobId: z.uuid(),
});
export type CreateApplicationInput = z.infer<typeof createApplicationInput>;

export const updateApplicationInput = z.object({
  expectedUpdatedAt,
  status: z.enum(applicationStatuses, { error: "Choose a status" }),
  notes: optionalText(10_000),
});
export type UpdateApplicationInput = z.infer<typeof updateApplicationInput>;

/** Run states (docs/05). No run exists in Phase 1a; the type is here so the chip rule is complete. */
export const runStates = [
  "queued",
  "running",
  "succeeded",
  "partially_succeeded",
  "failed",
  "cancelled",
] as const;
export type RunState = (typeof runStates)[number];

export type ChipTone = "accent" | "neutral" | "success" | "warning";
export interface StatusChip {
  label: string;
  tone: ChipTone;
}
export interface DerivedJobStatus {
  chip: StatusChip;
  modifier?: StatusChip;
}

export const listFilters = ["needs_attention", "active", "closed", "all"] as const;
export type ListFilter = (typeof listFilters)[number];
export const filterLabels: Record<ListFilter, string> = {
  needs_attention: "Needs attention",
  active: "Active",
  closed: "Closed",
  all: "All",
};

export const listSorts = ["updated", "added"] as const;
export type ListSort = (typeof listSorts)[number];
export const sortLabels: Record<ListSort, string> = {
  updated: "Updated",
  added: "Added",
};
