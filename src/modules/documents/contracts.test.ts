import { describe, expect, it } from "vitest";
import { readFixture } from "../../../tests/helpers/demo-snapshot";
import {
  coverLetterContent,
  documentSlugs,
  documentTypeFromSlug,
  documentTypes,
  recruiterMessageContent,
  resumeContent,
  type ResumeContent,
} from "./contracts";

const resume = readFixture<ResumeContent>("resume");
const bullet = { text: "Did a thing.", evidenceIds: ["x"] };
const entry = (bullets = 1) => ({
  heading: "H",
  subheading: null,
  dateRange: null,
  location: null,
  bullets: Array.from({ length: bullets }, () => bullet),
});
const withSections = (sections: ResumeContent["sections"]): ResumeContent => ({
  header: { name: "A", headline: null, contact: [] },
  summary: null,
  sections,
});

describe("resumeContent", () => {
  it("accepts the fixture", () => {
    expect(resumeContent.safeParse(resume).success).toBe(true);
  });
  it("rejects duplicate section kinds", () => {
    const r = resumeContent.safeParse(
      withSections([
        { kind: "experience", title: "A", entries: [] },
        { kind: "experience", title: "B", entries: [] },
      ]),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe("Duplicate section");
  });
  it("rejects more than four experience entries", () => {
    const r = resumeContent.safeParse(
      withSections([
        { kind: "experience", title: "A", entries: [1, 2, 3, 4, 5].map(() => entry()) },
      ]),
    );
    expect(r.success).toBe(false);
  });
  it("rejects more than three project bullets", () => {
    const r = resumeContent.safeParse(
      withSections([{ kind: "projects", title: "P", entries: [entry(4)] }]),
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe("At most 3 bullets per projects entry");
    }
    expect(
      resumeContent.safeParse(withSections([{ kind: "projects", title: "P", entries: [entry(3)] }]))
        .success,
    ).toBe(true);
  });
  it("rejects a bullet over 180 characters", () => {
    const r = resumeContent.safeParse(
      withSections([
        {
          kind: "experience",
          title: "A",
          entries: [{ ...entry(0), bullets: [{ text: "x".repeat(181), evidenceIds: ["x"] }] }],
        },
      ]),
    );
    expect(r.success).toBe(false);
  });
});

describe("coverLetterContent and recruiterMessageContent", () => {
  const paragraph = { text: "p", evidenceIds: ["x"] };
  const letter = (n: number) => ({
    greeting: "Dear team",
    paragraphs: Array.from({ length: n }, () => paragraph),
    closing: "Kind regards",
    signature: "A",
  });
  it("needs two to four paragraphs", () => {
    expect(coverLetterContent.safeParse(letter(1)).success).toBe(false);
    expect(coverLetterContent.safeParse(letter(2)).success).toBe(true);
    expect(coverLetterContent.safeParse(letter(4)).success).toBe(true);
    expect(coverLetterContent.safeParse(letter(5)).success).toBe(false);
  });
  it("caps the message body at 900 characters", () => {
    const base = { variant: "email", subject: "S", evidenceIds: ["x"] };
    expect(recruiterMessageContent.safeParse({ ...base, body: "b".repeat(900) }).success).toBe(
      true,
    );
    expect(recruiterMessageContent.safeParse({ ...base, body: "b".repeat(901) }).success).toBe(
      false,
    );
  });
});

describe("documentTypeFromSlug", () => {
  it("round-trips every type and rejects unknown slugs", () => {
    for (const type of documentTypes) expect(documentTypeFromSlug(documentSlugs[type])).toBe(type);
    expect(documentTypeFromSlug("cover_letter")).toBeNull();
    expect(documentTypeFromSlug("")).toBeNull();
  });
});
