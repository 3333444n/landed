import { describe, expect, it } from "vitest";
import type { JobRow } from "@/app/jobs/list-jobs";
import type { DocumentView } from "@/modules/documents";
import { documentDetail, documentSummary, errorText, jobListItem } from "./serialize";

const row: JobRow = {
  id: "job-1",
  title: "Developer",
  companyName: "Example Analytics",
  location: null,
  salary: null,
  logoHref: null,
  summary: "…",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  facts: {
    availability: "active",
    applicationStatus: "preparing",
    latestRunState: "failed",
    hasUnreviewedDrafts: true,
    hasMatchAssessment: false,
  },
  derived: {
    chip: { label: "Needs review", tone: "warning" },
    modifier: { label: "Generation failed", tone: "warning" },
  },
};

const emptyView: DocumentView = { document: null, revision: null, latestRun: null, warnings: [] };

describe("jobListItem", () => {
  it("projects the derived status and the facts in snake case", () => {
    expect(jobListItem(row)).toEqual({
      id: "job-1",
      title: "Developer",
      company: "Example Analytics",
      status: "Needs review",
      modifier: "Generation failed",
      availability: "active",
      application_status: "preparing",
      latest_run_state: "failed",
      has_unreviewed_drafts: true,
      updated_at: "2026-01-02T00:00:00.000Z",
    });
  });
});

describe("documentSummary and documentDetail", () => {
  it("report nothing for a document that was never generated", () => {
    expect(documentSummary(emptyView)).toEqual({
      state: "none",
      revision_id: null,
      warnings_count: 0,
    });
    expect(documentDetail("resume", emptyView)).toEqual({
      revision_id: null,
      reviewed: false,
      units: [],
      warnings: [],
      latest_run: null,
    });
  });
  it("flatten a revision into addressable units", () => {
    const view = {
      ...emptyView,
      revision: {
        id: "rev-1",
        reviewedAt: new Date(),
        warnings: [{ kind: "no_evidence", path: "body", message: "Cites no evidence" }],
        content: {
          variant: "email",
          subject: "Hello",
          body: "Body text",
          evidenceIds: ["a"],
        },
      } as unknown as NonNullable<DocumentView["revision"]>,
      warnings: [{ kind: "no_evidence" as const, path: "body", message: "Cites no evidence" }],
    };
    expect(documentSummary(view)).toEqual({
      state: "reviewed",
      revision_id: "rev-1",
      warnings_count: 1,
    });
    const detail = documentDetail("recruiter_message", view);
    expect(detail.reviewed).toBe(true);
    expect(detail.units).toEqual([{ path: "body", text: "Body text", evidence_ids: ["a"] }]);
    expect(detail.warnings).toEqual([
      { kind: "no_evidence", path: "body", message: "Cites no evidence" },
    ]);
  });
});

describe("errorText", () => {
  it("names the kind and lists field errors one per line", () => {
    expect(errorText({ kind: "not_found", message: "Job not found" })).toBe(
      "not_found: Job not found",
    );
    expect(
      errorText({
        kind: "validation",
        fieldErrors: { json: ["not JSON"], form: ["a", "b"] },
      }),
    ).toBe("validation: json: not JSON\nform: a; b");
  });
});
