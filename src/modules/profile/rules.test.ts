import { describe, expect, it } from "vitest";
import { contextLinkErrors, isBlank, normalizeSkillName, reviewedAfterEdit } from "./rules";

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
      projectId: ["Link the achievement to a job or a project, not both"],
    });
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
  it("clears the flag when the statement changes", () => {
    expect(reviewedAfterEdit({ statement: "a", reviewed: true }, { statement: "b" })).toBe(false);
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
