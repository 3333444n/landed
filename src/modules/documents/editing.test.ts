import { describe, expect, it } from "vitest";
import { demoSnapshot, readFixture } from "../../../tests/helpers/demo-snapshot";
import { contentSchemas, type CoverLetterContent, type ResumeContent } from "./contracts";
import { contentUnits, editableFields, groundingCheck, withUnitText } from "./rules";
import { letterHeaderFrom, letterSalutation, letterLink, splitLetterName } from "./presentation";

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
  it.each(["greeting", "closing", "signature"])(
    "edits letter %s while preserving both citation namespaces",
    (path) => {
      const original = structuredClone(letter);
      original.paragraphs[0]!.contextIds = ["company-context"];
      const edited = withUnitText("cover_letter", original, path, "Updated") as CoverLetterContent;
      expect(edited.paragraphs).toEqual(original.paragraphs);
      expect(editableFields("cover_letter", edited).find((f) => f.path === path)?.text).toBe(
        "Updated",
      );
      expect(contentUnits("cover_letter", edited)).toEqual(contentUnits("cover_letter", original));
    },
  );
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

describe("letter presentation", () => {
  it.each(["Dear team", "Dear team,", "Dear team,,", "Dear team, ,  "])(
    "punctuates %s exactly once",
    (text) => {
      expect(letterSalutation(text)).toBe("Dear team,");
    },
  );
  it("projects saved identity, recipient and date with a stable timezone", () => {
    const snapshot = demoSnapshot();
    snapshot.capturedAt = "2026-09-14T00:00:00Z";
    const header = letterHeaderFrom(snapshot, new Date("2030-01-01"));
    expect(header).toMatchObject({
      name: snapshot.profile.displayName,
      company: snapshot.job.companyName,
      role: snapshot.job.title,
      date: "September 14, 2026",
    });
    expect(header.topContact.map((item) => item.text)).toContain(snapshot.profile.email);
    expect(letterHeaderFrom(snapshot, new Date("2040-01-01"))).toEqual(header);
  });
  it("omits missing context without consulting current records", () => {
    expect(letterHeaderFrom(null, new Date("2026-09-14"), "Alex Rivera")).toEqual({
      name: "Alex Rivera",
      nameLines: ["Alex", "Rivera"],
      title: null,
      topContact: [],
      footerLinks: [],
      locationLines: [],
      date: "September 14, 2026",
      company: null,
      role: null,
    });
    const snapshot = demoSnapshot();
    snapshot.job.companyName = "";
    expect(letterHeaderFrom(snapshot, new Date()).company).toBeNull();
  });
});

it("splits display names and preserves clickable destinations without www labels", () => {
  expect(splitLetterName("Alex Rivera Morgan")).toEqual(["Alex", "Rivera Morgan"]);
  expect(splitLetterName("Alex")).toEqual(["Alex"]);
  expect(letterLink("https://www.example.com/profile/")).toEqual({
    text: "example.com/profile",
    href: "https://www.example.com/profile/",
  });
  expect(letterLink("example.com")).toEqual({ text: "example.com", href: "https://example.com/" });
  expect(letterLink("javascript:alert(1)").href).toBeNull();
  const snapshot = demoSnapshot();
  snapshot.profile.links = [{ label: "Website", url: "https://www.example.com/" }];
  const header = letterHeaderFrom(snapshot, new Date());
  expect(header.topContact.map((item) => item.text)).not.toContain("example.com");
  expect(header.footerLinks).toEqual([{ text: "example.com", href: "https://www.example.com/" }]);
});

it("edits and clears the professional title without changing prose", () => {
  const edited = withUnitText(
    "cover_letter",
    letter,
    "title",
    "Software developer",
  ) as CoverLetterContent;
  expect(edited.title).toBe("Software developer");
  expect(edited.paragraphs).toEqual(letter.paragraphs);
  expect(
    (withUnitText("cover_letter", edited, "title", "") as CoverLetterContent).title,
  ).toBeNull();
  expect(
    contentSchemas.cover_letter.safeParse(
      withUnitText("cover_letter", letter, "title", "x".repeat(121)),
    ).success,
  ).toBe(false);
});
it("groups header contacts and footer details", () => {
  const snapshot = demoSnapshot();
  snapshot.profile.location = "Example City, Example Country";
  snapshot.profile.phone = "+1 555 0100";
  snapshot.profile.links = [
    { label: "Website", url: "https://www.example.com/" },
    { label: "GitHub", url: "https://github.com/example" },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/example" },
  ];
  const header = letterHeaderFrom(snapshot, new Date());
  expect(header.topContact.find((line) => line.text === snapshot.profile.phone)?.href).toBe(
    "https://wa.me/15550100",
  );
  expect(header.topContact.map((line) => line.text)).toEqual([
    "linkedin.com/in/example",
    "alex@example.com",
    "+1 555 0100",
  ]);
  expect(header.footerLinks.map((line) => line.text)).toEqual([
    "github.com/example",
    "example.com",
  ]);
  expect(header.locationLines).toEqual(["Example City", "Example Country"]);
});
