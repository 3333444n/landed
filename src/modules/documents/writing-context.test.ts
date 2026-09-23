import { describe, expect, it } from "vitest";
import { demoSnapshot } from "../../../tests/helpers/demo-snapshot";
import { coverLetterContent, snapshot } from "./contracts";
import { groundingCheck } from "./rules";
import { coverLetterPrompt } from "./prompts/cover-letter";
import { prompts } from "./prompts";
const companyId = "90000000-0000-4000-8000-000000000001";
const findingId = "90000000-0000-4000-8000-000000000002";
function input() {
  return {
    ...demoSnapshot(),
    writingContext: {
      aboutMe: { id: "about:example", text: "I like explaining complicated work clearly." },
      interest: null,
      company: {
        id: companyId,
        name: "Example Studio",
        website: "https://example.com",
        location: "Remote",
        about: "Builds tools for local workshops.",
      },
      findings: [
        {
          id: findingId,
          text: "Released 3 workshop tools.",
          sourceUrl: "https://example.com/news",
          retrievedAt: "2026-09-23",
          kind: "statement" as const,
        },
      ],
    },
  };
}
function letter(evidenceIds: string[], contextIds: string[] = []) {
  return {
    greeting: "Dear hiring team",
    paragraphs: [
      { text: "Your 3 workshop tools connect with my interests.", evidenceIds, contextIds },
      {
        text: "I like explaining complicated work clearly.",
        evidenceIds: [],
        contextIds: ["about:example"],
      },
    ],
    closing: "Sincerely",
    signature: "Alex Rivera",
  };
}
describe("cover letter context", () => {
  it("accepts old snapshots and letter content without added fields", () => {
    expect(snapshot.safeParse(demoSnapshot()).success).toBe(true);
    expect(
      coverLetterContent.safeParse({
        ...letter([]),
        paragraphs: [
          { text: "Hello", evidenceIds: [] },
          { text: "Thanks", evidenceIds: [] },
        ],
      }).success,
    ).toBe(true);
  });
  it("recognizes only selected context IDs and separates them from career citations", () => {
    expect(groundingCheck("cover_letter", letter([], [findingId]), input())).toEqual([
      expect.objectContaining({ kind: "context_number" }),
    ]);
    expect(groundingCheck("cover_letter", letter([findingId]), input())).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "unknown_evidence" })]),
    );
    expect(groundingCheck("cover_letter", letter([], ["missing"]), input())).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "unknown_evidence" }),
        expect.objectContaining({ kind: "unsupported_number" }),
      ]),
    );
  });
  it("does not silently accept a company number as a personal achievement", () => {
    const content = letter([], [findingId]);
    content.paragraphs[0]!.text = "I shipped 3 workshop tools.";
    expect(groundingCheck("cover_letter", content, input())).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "context_number" })]),
    );
  });
  it("checks company numbers against cited content rather than the URL or retrieval date", () => {
    const content = letter([], [companyId]);
    expect(groundingCheck("cover_letter", content, input())).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "unsupported_number" })]),
    );
  });
  it("includes all company fields in the letter input and keeps writing context out of other prompts", () => {
    const value = input();
    const prompt = coverLetterPrompt.buildInput(value);
    expect(prompt).toContain(value.writingContext.company.about);
    expect(prompt).toContain(value.writingContext.company.website);
    expect(prompt).toContain(value.writingContext.company.location);
    expect(prompt).toContain(value.writingContext.findings[0]!.sourceUrl);
    expect(prompts.resume.buildInput(value)).not.toContain(value.writingContext.aboutMe.text);
    expect(prompts.recruiter_message.buildInput(value)).not.toContain(
      value.writingContext.aboutMe.text,
    );
  });
});

it("flags long cover letters without rejecting historical content", () => {
  const content = letter([], [companyId]);
  content.paragraphs[0]!.text =
    "One connection. A second sentence. A third sentence. A fourth sentence.";
  expect(coverLetterContent.safeParse(content).success).toBe(true);
  expect(
    groundingCheck("cover_letter", content, input()).some((w) => w.kind === "letter_length"),
  ).toBe(true);
});
