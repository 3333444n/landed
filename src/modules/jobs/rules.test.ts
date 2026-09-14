import { describe, expect, it } from "vitest";
import { jobSummary } from "./rules";

describe("jobSummary", () => {
  it("takes the first non-empty line, trimmed", () => {
    expect(jobSummary("\n\n  We are hiring a developer.  \nMore text")).toBe(
      "We are hiring a developer.",
    );
  });
  it("is empty for blank text", () => {
    expect(jobSummary("  \n \n")).toBe("");
  });
  it("shortens a long line with an ellipsis", () => {
    const summary = jobSummary("a".repeat(200));
    expect(summary).toHaveLength(140);
    expect(summary.endsWith("…")).toBe(true);
  });
});
