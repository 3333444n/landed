import { describe, expect, it } from "vitest";
import { demoSnapshot, readFixture } from "../../../tests/helpers/demo-snapshot";
import { contentSchemas, type CoverLetterContent, type ResumeContent } from "./contracts";
import { contentUnits, editableFields, groundingCheck, withUnitText } from "./rules";

const resume = readFixture<ResumeContent>("resume");
const letter = readFixture<CoverLetterContent>("cover-letter");

describe("document metadata editing", () => {
  const paths = [
    "header.headline",
    "sections.0.entries.0.subheading",
    "sections.1.entries.0.subheading",
    "sections.2.entries.0.heading",
    "sections.2.entries.0.subheading",
    "sections.2.entries.0.dateRange",
    "sections.2.entries.0.location",
    "sections.3.entries.0.heading",
    "sections.3.entries.0.subheading",
  ];
  it.each(paths)("edits %s immutably without altering evidence", (path) => {
    const before = structuredClone(resume);
    const edited = withUnitText("resume", resume, path, "Updated text")!;
    expect(contentSchemas.resume.safeParse(edited).success).toBe(true);
    expect(editableFields("resume", edited).find((f) => f.path === path)?.text).toBe(
      "Updated text",
    );
    expect(contentUnits("resume", edited)).toEqual(contentUnits("resume", resume));
    expect(resume).toEqual(before);
  });
  it("clears and restores every optional field, including ones initially null", () => {
    for (const field of editableFields("resume", resume).filter((f) => f.clearable)) {
      const cleared = withUnitText("resume", resume, field.path, "   ")!;
      expect(contentSchemas.resume.safeParse(cleared).success).toBe(true);
      const value = field.path
        .split(".")
        .reduce<unknown>((v, key) => (v as Record<string, unknown>)[key], cleared);
      expect(value).toBeNull();
      const restored = withUnitText("resume", cleared, field.path, "Restored")!;
      expect(editableFields("resume", restored).find((f) => f.path === field.path)?.text).toBe(
        "Restored",
      );
    }
  });
  it.each([
    "header.name",
    "header.contact.0",
    "sections.0.entries.0.heading",
    "sections.0.entries.0.location",
    "sections.1.entries.0.dateRange",
    "sections.3.entries.0.dateRange",
    "sections.2.title",
    "sections.9.entries.0.subheading",
    "sections.0.entries.99.subheading",
    "sections.-1.entries.0.subheading",
    "__proto__.polluted",
    "sections.00.entries.0.subheading",
  ])("refuses %s", (path) => {
    expect(withUnitText("resume", resume, path, "x")).toBeNull();
  });
  it("uses section kind rather than position", () => {
    const reordered = structuredClone(resume);
    reordered.sections.reverse();
    expect(
      withUnitText("resume", reordered, "sections.0.entries.0.heading", "Backend"),
    ).not.toBeNull();
    expect(
      withUnitText("resume", reordered, "sections.3.entries.0.heading", "Other employer"),
    ).toBeNull();
  });
  it("validates required text and existing field budgets", () => {
    for (const [type, content] of [
      ["resume", resume],
      ["cover_letter", letter],
    ] as const) {
      for (const field of editableFields(type, content).filter((f) => !f.clearable)) {
        expect(
          contentSchemas[type].safeParse(withUnitText(type, content, field.path, "")).success,
        ).toBe(false);
      }
    }
    expect(
      contentSchemas.resume.safeParse(
        withUnitText("resume", resume, "header.headline", "x".repeat(121)),
      ).success,
    ).toBe(false);
  });
  it("retains education heading warnings", () => {
    const edited = withUnitText(
      "resume",
      resume,
      "sections.2.entries.0.heading",
      "Different institution",
    )!;
    expect(groundingCheck("resume", edited, demoSnapshot())).toContainEqual(
      expect.objectContaining({
        kind: "unknown_heading",
        path: "sections.2.entries.0",
      }),
    );
  });
});
