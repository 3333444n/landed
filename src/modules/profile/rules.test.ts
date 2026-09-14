import { describe, expect, it } from "vitest";
import {
  contextLinkErrors,
  isBlank,
  monthDateErrors,
  normalizeSkillName,
  reviewedAfterEdit,
} from "./rules";

const employmentId = "20000000-0000-4000-8000-000000000001";
const projectId = "40000000-0000-4000-8000-000000000001";

describe("contextLinkErrors", () => {
  it("allows no context", () => {
    expect(contextLinkErrors({})).toEqual({});
  });
  it("allows exactly one context", () => {
    expect(contextLinkErrors({ employmentId })).toEqual({});
    expect(contextLinkErrors({ projectId })).toEqual({});
  });
  it("rejects both contexts with a field error", () => {
    expect(contextLinkErrors({ employmentId, projectId })).toEqual({
      projectId: ["Link the achievement to a role or a project, not both"],
    });
  });
});

describe("monthDateErrors", () => {
  it("accepts empty dates and complete dates", () => {
    expect(monthDateErrors({})).toEqual({});
    expect(monthDateErrors({ startYear: 2023, startMonth: 4 })).toEqual({});
    expect(monthDateErrors({ startYear: 2023, startMonth: 4, endYear: 2025, endMonth: 6 })).toEqual(
      {},
    );
  });
  it("rejects a month without a year and a year without a month", () => {
    expect(monthDateErrors({ startMonth: 4 })).toHaveProperty("startMonth");
    expect(monthDateErrors({ endYear: 2024 })).toHaveProperty("endMonth");
  });
  it("rejects months and years out of range", () => {
    expect(monthDateErrors({ startYear: 2023, startMonth: 13 })).toHaveProperty("startMonth");
    expect(monthDateErrors({ startYear: 1800, startMonth: 1 })).toHaveProperty("startYear");
  });
  it("rejects an end before the start", () => {
    expect(monthDateErrors({ startYear: 2024, startMonth: 6, endYear: 2024, endMonth: 5 })).toEqual(
      { endMonth: ["The end date is before the start date"] },
    );
  });
});

describe("normalizeSkillName", () => {
  it("trims, collapses whitespace and lowercases", () => {
    expect(normalizeSkillName("  Web   Accessibility ")).toBe("web accessibility");
  });
  it("does not equate different names", () => {
    expect(normalizeSkillName("Postgres")).not.toBe(normalizeSkillName("PostgreSQL"));
  });
});

describe("reviewedAfterEdit", () => {
  it("keeps the flag when the statement is unchanged", () => {
    expect(reviewedAfterEdit({ statement: "a", reviewed: true }, { statement: "a" })).toBe(true);
  });
  it("lets the user set the flag when the statement is unchanged", () => {
    expect(
      reviewedAfterEdit({ statement: "a", reviewed: false }, { statement: "a", reviewed: true }),
    ).toBe(true);
  });
  it("clears the flag when the statement changes, even if the form says reviewed", () => {
    expect(
      reviewedAfterEdit({ statement: "a", reviewed: true }, { statement: "b", reviewed: true }),
    ).toBe(false);
  });
});

describe("isBlank", () => {
  it("treats null, undefined and whitespace as blank", () => {
    expect(isBlank(null)).toBe(true);
    expect(isBlank(undefined)).toBe(true);
    expect(isBlank("   ")).toBe(true);
    expect(isBlank("x")).toBe(false);
  });
});
