import { describe, expect, it } from "vitest";
import { coverLetterContent, resumeContent } from "./contracts";
import {
  formattingSegments,
  normalizeSegments,
  segmentsWidth,
  segmentsLineCount,
  withFieldFormatting,
} from "./formatting";
import { withUnitText } from "./rules";
import { textWidth } from "./helvetica";
const letter = {
  greeting: "Dear team",
  paragraphs: [
    { text: "First sentence", evidenceIds: [] },
    { text: "Second sentence", evidenceIds: [] },
  ],
  closing: "Regards",
  signature: "Alex",
};
describe("document inline formatting", () => {
  it("normalizes marks and adjacent segments without changing text", () => {
    expect(
      normalizeSegments([
        { text: "A", marks: ["italic", "bold", "bold"] },
        { text: " B", marks: ["bold", "italic"] },
      ]),
    ).toEqual([{ text: "A B", marks: ["bold", "italic"] }]);
  });
  it("accepts legacy documents and validates exact text and allowed paths", () => {
    expect(coverLetterContent.safeParse(letter).success).toBe(true);
    const valid = {
      ...letter,
      formatting: [{ path: "greeting", segments: [{ text: "Dear team", marks: ["underline"] }] }],
    };
    expect(coverLetterContent.safeParse(valid).success).toBe(true);
    expect(
      coverLetterContent.safeParse({
        ...valid,
        formatting: [{ path: "greeting", segments: [{ text: "Other", marks: ["bold"] }] }],
      }).success,
    ).toBe(false);
    expect(
      coverLetterContent.safeParse({
        ...valid,
        formatting: [{ path: "header.name", segments: [{ text: "Alex", marks: [] }] }],
      }).success,
    ).toBe(false);
    expect(
      coverLetterContent.safeParse({
        ...valid,
        formatting: [valid.formatting[0], valid.formatting[0]],
      }).success,
    ).toBe(false);
    expect(
      coverLetterContent.safeParse({
        ...valid,
        formatting: [{ path: "greeting", segments: [{ text: "Dear team", marks: ["highlight"] }] }],
      }).success,
    ).toBe(false);
  });
  it("preserves unchanged styling and clears changed text without touching citations", () => {
    const content = withFieldFormatting(coverLetterContent.parse(letter), "paragraphs.0", [
      { text: "First sentence", marks: ["bold"] },
    ]);
    expect(withUnitText("cover_letter", content, "paragraphs.0", "First sentence")).toEqual(
      content,
    );
    const edited = withUnitText("cover_letter", content, "paragraphs.0", "New sentence");
    expect(edited).toMatchObject({
      formatting: [],
      paragraphs: [
        { text: "New sentence", evidenceIds: [] },
        { text: "Second sentence", evidenceIds: [] },
      ],
    });
    expect(
      withFieldFormatting(content, "paragraphs.0", [{ text: "First sentence", marks: [] }])
        .formatting,
    ).toEqual([]);
  });
  it("uses bold widths with mixed emphasis and retains template bold", () => {
    const segments = [
      { text: "First ", marks: [] },
      {
        text: "sentence",
        marks: ["bold", "italic", "underline"] as ("bold" | "italic" | "underline")[],
      },
    ];
    expect(segmentsWidth(segments, 10)).toBe(
      textWidth("First ", 10) + textWidth("sentence", 10, "bold"),
    );
    expect(segmentsWidth(segments, 10, true)).toBeCloseTo(textWidth("First sentence", 10, "bold"));
    expect(segmentsLineCount(segments, segmentsWidth(segments, 10) - 1, 10)).toBe(2);
    expect(formattingSegments(coverLetterContent.parse(letter), "greeting", "Dear team")).toEqual([
      { text: "Dear team", marks: [] },
    ]);
  });
  it("refuses formatting immutable resume headings", () => {
    const content = {
      header: { name: "Alex", headline: null, contact: [] },
      summary: null,
      sections: [
        {
          kind: "experience",
          title: "Experience",
          entries: [
            { heading: "Company", subheading: null, location: null, dateRange: null, bullets: [] },
          ],
        },
      ],
      formatting: [
        { path: "sections.0.entries.0.heading", segments: [{ text: "Company", marks: ["bold"] }] },
      ],
    };
    expect(resumeContent.safeParse(content).success).toBe(false);
  });
});

it("normalizes edit boundaries only after validating exact raw segment text", async () => {
  const { editUnitInput } = await import("./contracts");
  const base = {
    expectedRevisionId: "00000000-0000-4000-8000-000000000001",
    path: "greeting",
    text: "  Hello world  ",
  };
  const result = editUnitInput.parse({
    ...base,
    segments: [
      { text: "  Hello ", marks: ["bold"] },
      { text: "world  ", marks: ["italic"] },
    ],
  });
  expect(result.text).toBe("Hello world");
  expect(result.segments).toEqual([
    { text: "Hello ", marks: ["bold"] },
    { text: "world", marks: ["italic"] },
  ]);
  expect(
    editUnitInput.safeParse({ ...base, segments: [{ text: "Hello world", marks: [] }] }).success,
  ).toBe(false);
  expect(
    editUnitInput.parse({ ...base, text: " \n ", segments: [{ text: " \n ", marks: ["bold"] }] })
      .segments,
  ).toEqual([]);
});

it("counts explicit line breaks across segment boundaries", () => {
  expect(
    segmentsLineCount(
      [
        { text: "one\r", marks: [] },
        { text: "\ntwo\n", marks: ["bold"] },
      ],
      500,
      10,
    ),
  ).toBe(3);
});

it("keeps salutation marks while normalizing punctuation", async () => {
  const { salutationFormattingSegments } = await import("./formatting");
  const content = {
    ...letter,
    greeting: "Hi,,",
    formatting: [{ path: "greeting", segments: [{ text: "Hi,,", marks: ["bold"] as "bold"[] }] }],
  };
  expect(salutationFormattingSegments(content, "greeting", content.greeting)).toEqual([
    { text: "Hi", marks: ["bold"] },
    { text: ",", marks: [] },
  ]);
});
