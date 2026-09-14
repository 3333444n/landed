import { describe, expect, it } from "vitest";
import {
  deriveJobStatus,
  isTerminal,
  matchesFilter,
  sortJobs,
  submittedAtAfter,
  type JobStatusFacts,
} from "./rules";

const facts = (overrides: Partial<JobStatusFacts> = {}): JobStatusFacts => ({
  availability: "active",
  applicationStatus: null,
  latestRunState: null,
  hasUnreviewedDrafts: false,
  hasMatchAssessment: false,
  ...overrides,
});

describe("deriveJobStatus (docs/05 table, one case per row)", () => {
  it("shows a success chip for ready, applied, interviewing, offer and accepted", () => {
    for (const status of ["ready", "applied", "interviewing", "offer", "accepted"] as const) {
      expect(deriveJobStatus(facts({ applicationStatus: status })).chip.tone).toBe("success");
    }
    expect(deriveJobStatus(facts({ applicationStatus: "applied" })).chip.label).toBe("Applied");
  });
  it("shows rejected and withdrawn as neutral, never red", () => {
    expect(deriveJobStatus(facts({ applicationStatus: "rejected" })).chip).toEqual({
      label: "Rejected",
      tone: "neutral",
    });
    expect(deriveJobStatus(facts({ applicationStatus: "withdrawn" })).chip.tone).toBe("neutral");
  });
  it("shows Crafting documents while a run is queued or running for a preparing application", () => {
    expect(
      deriveJobStatus(facts({ applicationStatus: "preparing", latestRunState: "queued" })).chip,
    ).toEqual({ label: "Crafting documents", tone: "accent" });
    expect(
      deriveJobStatus(facts({ applicationStatus: "preparing", latestRunState: "running" })).chip
        .label,
    ).toBe("Crafting documents");
  });
  it("shows Needs review when unreviewed drafts exist", () => {
    expect(
      deriveJobStatus(facts({ applicationStatus: "preparing", hasUnreviewedDrafts: true })).chip,
    ).toEqual({ label: "Needs review", tone: "warning" });
  });
  it("shows Preparing otherwise", () => {
    expect(deriveJobStatus(facts({ applicationStatus: "preparing" })).chip).toEqual({
      label: "Preparing",
      tone: "neutral",
    });
  });
  it("shows Evaluating while a matching run is queued or running without an application", () => {
    expect(deriveJobStatus(facts({ latestRunState: "running" })).chip).toEqual({
      label: "Evaluating",
      tone: "accent",
    });
  });
  it("shows Assessed when an assessment exists without an application", () => {
    expect(deriveJobStatus(facts({ hasMatchAssessment: true })).chip).toEqual({
      label: "Assessed",
      tone: "neutral",
    });
  });
  it("shows New with no application and no run", () => {
    expect(deriveJobStatus(facts()).chip).toEqual({ label: "New", tone: "accent" });
  });
  it("adds Posting expired only while the application is active", () => {
    expect(
      deriveJobStatus(facts({ availability: "expired", applicationStatus: "interviewing" })),
    ).toEqual({
      chip: { label: "Interviewing", tone: "success" },
      modifier: { label: "Posting expired", tone: "warning" },
    });
    expect(
      deriveJobStatus(facts({ availability: "expired", applicationStatus: "rejected" })).modifier,
    ).toBeUndefined();
    expect(deriveJobStatus(facts({ availability: "expired" })).modifier).toBeUndefined();
  });
  it("adds Generation failed when the latest run failed", () => {
    expect(
      deriveJobStatus(facts({ applicationStatus: "preparing", latestRunState: "failed" })),
    ).toEqual({
      chip: { label: "Preparing", tone: "neutral" },
      modifier: { label: "Generation failed", tone: "warning" },
    });
  });
  it("keeps job availability from moving the application", () => {
    const derived = deriveJobStatus(
      facts({ availability: "expired", applicationStatus: "interviewing" }),
    );
    expect(derived.chip.label).toBe("Interviewing");
  });
});

describe("matchesFilter", () => {
  const check = (filter: Parameters<typeof matchesFilter>[0], f: JobStatusFacts) =>
    matchesFilter(filter, f, deriveJobStatus(f));

  it("needs attention includes New, Preparing, Needs review and the modifiers", () => {
    expect(check("needs_attention", facts())).toBe(true);
    expect(check("needs_attention", facts({ applicationStatus: "preparing" }))).toBe(true);
    expect(
      check(
        "needs_attention",
        facts({ applicationStatus: "preparing", hasUnreviewedDrafts: true }),
      ),
    ).toBe(true);
    expect(
      check("needs_attention", facts({ applicationStatus: "preparing", latestRunState: "failed" })),
    ).toBe(true);
    expect(
      check("needs_attention", facts({ applicationStatus: "applied", availability: "expired" })),
    ).toBe(true);
  });
  it("needs attention excludes applied jobs and expired jobs without an application", () => {
    expect(check("needs_attention", facts({ applicationStatus: "applied" }))).toBe(false);
    expect(check("needs_attention", facts({ availability: "expired" }))).toBe(false);
  });
  it("active is every non-terminal pursuit; closed is the rest", () => {
    expect(check("active", facts({ applicationStatus: "interviewing" }))).toBe(true);
    expect(check("active", facts({ applicationStatus: "accepted" }))).toBe(false);
    expect(check("active", facts({ availability: "expired" }))).toBe(false);
    expect(check("closed", facts({ applicationStatus: "withdrawn" }))).toBe(true);
    expect(check("closed", facts({ availability: "expired" }))).toBe(true);
    expect(check("closed", facts({ applicationStatus: "preparing" }))).toBe(false);
  });
  it("all shows everything", () => {
    expect(check("all", facts({ availability: "expired" }))).toBe(true);
  });
});

describe("sortJobs", () => {
  const rows = [
    { id: "a", createdAt: new Date(1), updatedAt: new Date(30) },
    { id: "b", createdAt: new Date(2), updatedAt: new Date(20) },
    { id: "c", createdAt: new Date(3), updatedAt: new Date(10) },
  ];
  it("orders by updated, newest first", () => {
    expect(sortJobs(rows, "updated").map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
  it("orders by added, newest first", () => {
    expect(sortJobs(rows, "added").map((r) => r.id)).toEqual(["c", "b", "a"]);
  });
});

describe("submittedAtAfter and isTerminal", () => {
  const now = new Date("2026-09-14T12:00:00Z");
  it("records the first entry to applied", () => {
    expect(submittedAtAfter({ status: "preparing", submittedAt: null }, "applied", now)).toBe(now);
  });
  it("keeps an earlier submission time on later changes", () => {
    const earlier = new Date("2026-09-01T00:00:00Z");
    expect(submittedAtAfter({ status: "applied", submittedAt: earlier }, "interviewing", now)).toBe(
      earlier,
    );
    expect(submittedAtAfter({ status: "applied", submittedAt: earlier }, "preparing", now)).toBe(
      earlier,
    );
  });
  it("stays empty for statuses before applied", () => {
    expect(submittedAtAfter({ status: "preparing", submittedAt: null }, "ready", now)).toBeNull();
  });
  it("names the terminal statuses", () => {
    expect(isTerminal("rejected")).toBe(true);
    expect(isTerminal("interviewing")).toBe(false);
  });
});
