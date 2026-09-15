import { describe, expect, it } from "vitest";
import { applicationStatuses, statusLabels } from "@/modules/applications/contracts";
import { deriveJobStatus, type JobStatusFacts } from "@/modules/applications/rules";
import { statusIcon, statusIcons } from "./status-icon";

const facts = (overrides: Partial<JobStatusFacts> = {}): JobStatusFacts => ({
  availability: "active",
  applicationStatus: null,
  latestRunState: null,
  hasUnreviewedDrafts: false,
  hasMatchAssessment: false,
  ...overrides,
});

describe("statusIcon", () => {
  it("has an explicit icon for every application status label", () => {
    for (const status of applicationStatuses) {
      expect(statusIcons[statusLabels[status]]).toBeDefined();
    }
  });
  it("has an explicit icon for every chip the rule derives without a status", () => {
    const chips = [
      deriveJobStatus(facts()).chip,
      deriveJobStatus(facts({ latestRunState: "running" })).chip,
      deriveJobStatus(facts({ hasMatchAssessment: true })).chip,
      deriveJobStatus(facts({ applicationStatus: "preparing", latestRunState: "queued" })).chip,
      deriveJobStatus(facts({ applicationStatus: "preparing", hasUnreviewedDrafts: true })).chip,
    ];
    for (const chip of chips) expect(statusIcons[chip.label]).toBeDefined();
  });
  it("falls back to the tone for an unknown label", () => {
    expect(statusIcon({ label: "Something new", tone: "warning" })).toBeDefined();
    expect(statusIcon({ label: "Something new", tone: "neutral" })).not.toBe(
      statusIcon({ label: "Something new", tone: "warning" }),
    );
  });
});
