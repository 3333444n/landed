/*
 * What the tools hand back: snake_case projections of module records, with nothing the harness
 * does not need (no snapshot copies, no storage keys). Pure functions, tested beside this file.
 */
import type { JobRow } from "@/app/jobs/list-jobs";
import type { ApplicationRecord } from "@/modules/applications";
import {
  contentUnits,
  editableFields,
  type DocumentType,
  type DocumentView,
  type GroundingWarning,
} from "@/modules/documents";
import type { CompanyJob } from "@/app/jobs/company-job";
import type { ModuleError } from "@/modules/shared/contracts";

export function jobListItem(row: JobRow) {
  return {
    id: row.id,
    title: row.title,
    company: row.companyName,
    status: row.derived.chip.label,
    modifier: row.derived.modifier?.label ?? null,
    availability: row.facts.availability,
    application_status: row.facts.applicationStatus,
    latest_run_state: row.facts.latestRunState,
    has_unreviewed_drafts: row.facts.hasUnreviewedDrafts,
    updated_at: row.updatedAt,
  };
}

/** Where a document stands, for the job overview: nothing yet, a draft, or a reviewed draft. */
export function documentSummary(view: DocumentView) {
  const revision = view.revision;
  return {
    state: revision === null ? "none" : revision.reviewedAt ? "reviewed" : "draft",
    revision_id: revision?.id ?? null,
    warnings_count: view.warnings.length,
  };
}

export function jobDetail(
  job: CompanyJob,
  application: ApplicationRecord | null,
  views: Record<DocumentType, DocumentView>,
) {
  return {
    id: job.id,
    title: job.title,
    company: job.companyName,
    description: job.rawDescription,
    location: job.location,
    salary: job.salary,
    source_url: job.sourceUrl,
    job_source_id: job.jobSourceId,
    updated_at: job.updatedAt.toISOString(),
    availability: job.availability,
    application: application
      ? {
          status: application.status,
          notes: application.notes,
          interest: application.interest,
          updated_at: application.updatedAt.toISOString(),
        }
      : null,
    documents: {
      resume: documentSummary(views.resume),
      cover_letter: documentSummary(views.cover_letter),
      recruiter_message: documentSummary(views.recruiter_message),
    },
  };
}

export function warning(w: GroundingWarning) {
  return { kind: w.kind, path: w.path, message: w.message };
}

/** The latest revision as editable units, so `edit_unit` can address any of them by path. */
export function documentDetail(type: DocumentType, view: DocumentView) {
  const revision = view.revision;
  const run = view.latestRun;
  return {
    revision_id: revision?.id ?? null,
    reviewed: revision ? revision.reviewedAt !== null : false,
    editable_fields: revision ? editableFields(type, revision.content) : [],
    units: revision
      ? contentUnits(type, revision.content).map((u) => ({
          path: u.path,
          text: u.text,
          evidence_ids: u.evidenceIds,
          ...(u.contextIds ? { context_ids: u.contextIds } : {}),
        }))
      : [],
    warnings: view.warnings.map(warning),
    latest_run: run
      ? { id: run.id, mode: run.mode, state: run.state, provider: run.provider, model: run.model }
      : null,
  };
}

/** One line per error, so the harness can read the reason and the field it concerns. */
export function errorText(error: ModuleError): string {
  if (error.kind === "validation") {
    const lines = Object.entries(error.fieldErrors).map(
      ([field, messages]) => `${field}: ${messages.join("; ")}`,
    );
    return `validation: ${lines.join("\n")}`;
  }
  return `${error.kind}: ${error.message}`;
}
