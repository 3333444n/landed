import { describe, expect, it } from "vitest";
import { buildSnapshot, type SnapshotSources } from "./snapshot";

const profileId = "10000000-0000-4000-8000-000000000001";
const at = new Date("2026-09-14T12:00:00Z");
const stamps = { createdAt: at, updatedAt: at };

const sources = (): SnapshotSources => ({
  profile: {
    id: profileId,
    displayName: "Alex Rivera",
    headline: "Software developer",
    summary: null,
    email: "alex@example.com",
    phone: null,
    location: "Mexico City",
    preferences: {},
    links: [{ label: "GitHub", url: "https://github.com/example" }],
    ...stamps,
  },
  employment: [
    {
      id: "20000000-0000-4000-8000-000000000001",
      profileId,
      employerName: "Example Workshop",
      role: "Software developer",
      startYear: 2023,
      startMonth: 4,
      endYear: 2025,
      endMonth: 6,
      isCurrent: false,
      description: null,
      ...stamps,
    },
  ],
  education: [
    {
      id: "30000000-0000-4000-8000-000000000001",
      profileId,
      institution: "Example Learning Institute",
      qualification: null,
      subject: null,
      startYear: null,
      startMonth: null,
      endYear: null,
      endMonth: null,
      status: "completed",
      description: null,
      ...stamps,
    },
  ],
  projects: [
    {
      id: "40000000-0000-4000-8000-000000000001",
      profileId,
      employmentId: null,
      name: "Community Tool Library",
      description: null,
      url: null,
      startYear: null,
      startMonth: null,
      endYear: null,
      endMonth: null,
      ...stamps,
    },
  ],
  skills: [
    {
      id: "60000000-0000-4000-8000-000000000001",
      profileId,
      displayName: "PostgreSQL",
      normalizedName: "postgresql",
      category: null,
      ...stamps,
    },
  ],
  achievements: [
    {
      id: "50000000-0000-4000-8000-000000000001",
      profileId,
      employmentId: "20000000-0000-4000-8000-000000000001",
      projectId: null,
      statement: "Reduced weekly report preparation from four hours to one.",
      problem: null,
      action: null,
      result: null,
      metric: "4 hours to 1 hour per week",
      sourceNote: null,
      sourceUrl: null,
      reviewed: true,
      skillIds: ["60000000-0000-4000-8000-000000000002", "60000000-0000-4000-8000-000000000001"],
      ...stamps,
    },
  ],
  job: {
    id: "70000000-0000-4000-8000-000000000001",
    profileId,
    title: "Full-stack developer",
    companyName: "Example Analytics",
    location: "Remote",
    source: "pasted",
    sourceUrl: null,
    rawDescription: "Build internal reporting tools.",
    availability: "active",
    ...stamps,
  },
  capturedAt: at,
});

describe("buildSnapshot", () => {
  it("is deterministic for the same sources", () => {
    expect(JSON.stringify(buildSnapshot(sources()))).toBe(JSON.stringify(buildSnapshot(sources())));
    expect(buildSnapshot(sources()).capturedAt).toBe("2026-09-14T12:00:00.000Z");
  });
  it("carries every record id and the job", () => {
    const s = buildSnapshot(sources());
    expect(s.profile.id).toBe(profileId);
    expect(s.employment.map((e) => e.id)).toEqual(["20000000-0000-4000-8000-000000000001"]);
    expect(s.education.map((e) => e.id)).toEqual(["30000000-0000-4000-8000-000000000001"]);
    expect(s.projects.map((p) => p.id)).toEqual(["40000000-0000-4000-8000-000000000001"]);
    expect(s.skills.map((k) => k.id)).toEqual(["60000000-0000-4000-8000-000000000001"]);
    expect(s.achievements.map((a) => a.id)).toEqual(["50000000-0000-4000-8000-000000000001"]);
    expect(s.job).toEqual({
      id: "70000000-0000-4000-8000-000000000001",
      title: "Full-stack developer",
      companyName: "Example Analytics",
      location: "Remote",
      rawDescription: "Build internal reporting tools.",
    });
  });
  it("sorts achievement skill ids and copies profile links", () => {
    const s = buildSnapshot(sources());
    expect(s.achievements[0]?.skillIds).toEqual([
      "60000000-0000-4000-8000-000000000001",
      "60000000-0000-4000-8000-000000000002",
    ]);
    expect(s.profile.links).toEqual([{ label: "GitHub", url: "https://github.com/example" }]);
  });
  it("leaves out timestamps, preferences and the reviewed flag", () => {
    const text = JSON.stringify(buildSnapshot(sources()));
    expect(text).not.toContain("updatedAt");
    expect(text).not.toContain("preferences");
    expect(text).not.toContain("reviewed");
  });
});
