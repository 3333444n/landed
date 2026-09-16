import { describe, expect, it } from "vitest";
import { demoSnapshot, readFixture } from "../../../tests/helpers/demo-snapshot";
import type { CoverLetterContent, RecruiterMessageContent, ResumeContent } from "./contracts";
import { lineCount, textWidth } from "./helvetica";
import {
  contentUnits,
  documentFacts,
  groundingCheck,
  layoutCheck,
  resumeLine,
  isInterrupted,
  numbersIn,
  stableStringify,
  withUnitText,
} from "./rules";

const snapshot = demoSnapshot();
const achievement = "50000000-0000-4000-8000-000000000001"; // "4 hours to 1 hour per week"
const resume = readFixture<ResumeContent>("resume");
const letter = readFixture<CoverLetterContent>("cover-letter");
const message = readFixture<RecruiterMessageContent>("recruiter-message");

const minimalResume = (
  bullet: { text: string; evidenceIds: string[] },
  heading = "Example Workshop",
): ResumeContent => ({
  header: { name: "Alex Rivera", headline: null, contact: [] },
  summary: null,
  sections: [
    {
      kind: "experience",
      title: "Work experience",
      entries: [{ heading, subheading: null, dateRange: null, bullets: [bullet] }],
    },
  ],
});

describe("contentUnits", () => {
  it("addresses resume summary and bullets by dot path in reading order", () => {
    const paths = contentUnits("resume", resume).map((u) => u.path);
    expect(paths[0]).toBe("summary");
    expect(paths).toContain("sections.0.entries.0.bullets.0");
    expect(paths).toContain("sections.1.entries.0.bullets.1");
    expect(paths).toHaveLength(4);
  });
  it("addresses cover-letter paragraphs and the message body", () => {
    expect(contentUnits("cover_letter", letter).map((u) => u.path)).toEqual([
      "paragraphs.0",
      "paragraphs.1",
      "paragraphs.2",
    ]);
    const [body] = contentUnits("recruiter_message", message);
    expect(body?.path).toBe("body");
    expect(body?.evidenceIds).toEqual(message.evidenceIds);
  });
});

describe("numbersIn", () => {
  it("drops thousands separators so 4,000 and 4000 agree", () => {
    expect(numbersIn("4,000 users and 3.5 hours")).toEqual(["4000", "3.5"]);
  });
});

describe("groundingCheck", () => {
  it("passes a clean fixture against the demo snapshot", () => {
    expect(groundingCheck("resume", resume, snapshot)).toEqual([]);
    expect(groundingCheck("cover_letter", letter, snapshot)).toEqual([]);
    expect(groundingCheck("recruiter_message", message, snapshot)).toEqual([]);
  });
  it("flags a bullet that cites another role's or project's record", () => {
    const projectAchievement = "50000000-0000-4000-8000-000000000002"; // Community Tool Library
    const standalone = "50000000-0000-4000-8000-000000000003";
    const warnings = groundingCheck(
      "resume",
      minimalResume({ text: "Built accessible forms.", evidenceIds: [projectAchievement] }),
      snapshot,
    );
    expect(warnings.map((w) => w.kind)).toEqual(["misattributed_evidence"]);
    expect(warnings[0]?.path).toBe("sections.0.entries.0.bullets.0");
    // The role's own achievement, the profile and an unplaced achievement are fine anywhere
    expect(
      groundingCheck(
        "resume",
        minimalResume({
          text: "Built a reporting tool.",
          evidenceIds: [achievement, snapshot.profile.id, standalone],
        }),
        snapshot,
      ),
    ).toEqual([]);
    // Under the project's own entry the project achievement is at home
    const projectResume = minimalResume(
      { text: "Built accessible forms.", evidenceIds: [projectAchievement] },
      "Community Tool Library",
    );
    projectResume.sections[0]!.kind = "projects";
    expect(groundingCheck("resume", projectResume, snapshot)).toEqual([]);
    // An unknown heading is reported once, not also as misattribution
    expect(
      groundingCheck(
        "resume",
        minimalResume({ text: "Did things.", evidenceIds: [achievement] }, "Nowhere Inc"),
        snapshot,
      ).map((w) => w.kind),
    ).toEqual(["unknown_heading"]);
  });
  it("flags evidence ids that are not in the snapshot", () => {
    const warnings = groundingCheck(
      "resume",
      minimalResume({ text: "Built a tool.", evidenceIds: ["nope"] }),
      snapshot,
    );
    expect(warnings.map((w) => w.kind)).toEqual(["unknown_evidence"]);
    expect(warnings[0]?.path).toBe("sections.0.entries.0.bullets.0");
  });
  it("flags a unit with no evidence and skips its number check", () => {
    const warnings = groundingCheck(
      "resume",
      minimalResume({ text: "Saved 99 hours.", evidenceIds: [] }),
      snapshot,
    );
    expect(warnings.map((w) => w.kind)).toEqual(["no_evidence"]);
  });
  it("flags numbers absent from the cited evidence and accepts supported ones", () => {
    const ok = groundingCheck(
      "resume",
      minimalResume({ text: "Cut preparation from 4 hours to 1.", evidenceIds: [achievement] }),
      snapshot,
    );
    expect(ok).toEqual([]);
    const bad = groundingCheck(
      "resume",
      minimalResume({ text: "Served 4,000 analysts.", evidenceIds: [achievement] }),
      snapshot,
    );
    expect(bad.map((w) => w.kind)).toEqual(["unsupported_number"]);
    expect(bad[0]?.message).toContain('"4000"');
  });
  it("flags headings that name no employer, institution or project, case-insensitively", () => {
    const ok = groundingCheck(
      "resume",
      minimalResume({ text: "Built a tool.", evidenceIds: [achievement] }, "example workshop"),
      snapshot,
    );
    expect(ok).toEqual([]);
    const bad = groundingCheck(
      "resume",
      minimalResume({ text: "Built a tool.", evidenceIds: [achievement] }, "Globex"),
      snapshot,
    );
    expect(bad).toEqual([
      {
        kind: "unknown_heading",
        path: "sections.0.entries.0",
        message: '"Globex" is not an employer, institution or project in your facts',
      },
    ]);
  });
  it("finds every warning kind in the ungrounded fixture", () => {
    const kinds = new Set(
      groundingCheck("resume", readFixture<ResumeContent>("resume.ungrounded"), snapshot).map(
        (w) => w.kind,
      ),
    );
    expect([...kinds].sort()).toEqual([
      "no_evidence",
      "unknown_evidence",
      "unknown_heading",
      "unsupported_number",
    ]);
  });
});

describe("withUnitText", () => {
  it("replaces one bullet and leaves the original untouched", () => {
    const before = JSON.stringify(resume);
    const edited = withUnitText(
      "resume",
      resume,
      "sections.0.entries.0.bullets.0",
      "New text",
    ) as ResumeContent;
    expect(edited.sections[0]?.entries[0]?.bullets[0]?.text).toBe("New text");
    expect(edited.sections[0]?.entries[0]?.bullets[0]?.evidenceIds).toEqual(
      resume.sections[0]?.entries[0]?.bullets[0]?.evidenceIds,
    );
    expect(JSON.stringify(resume)).toBe(before);
  });
  it("edits the summary, a paragraph, the subject and the body", () => {
    expect((withUnitText("resume", resume, "summary", "S") as ResumeContent).summary?.text).toBe(
      "S",
    );
    expect(
      (withUnitText("cover_letter", letter, "paragraphs.1", "P") as CoverLetterContent)
        .paragraphs[1]?.text,
    ).toBe("P");
    expect(
      (withUnitText("recruiter_message", message, "subject", "Sub") as RecruiterMessageContent)
        .subject,
    ).toBe("Sub");
    expect(
      (withUnitText("recruiter_message", message, "body", "B") as RecruiterMessageContent).body,
    ).toBe("B");
  });
  it("returns null for unknown paths", () => {
    expect(withUnitText("resume", resume, "sections.9.entries.0.bullets.0", "x")).toBeNull();
    expect(withUnitText("resume", resume, "header.name", "x")).toBeNull();
    expect(withUnitText("cover_letter", letter, "paragraphs.7", "x")).toBeNull();
    expect(withUnitText("recruiter_message", message, "greeting", "x")).toBeNull();
    expect(withUnitText("resume", { ...resume, summary: null }, "summary", "x")).toBeNull();
  });
});

describe("isInterrupted", () => {
  const now = new Date("2026-09-14T12:00:00Z");
  const limit = 10 * 60 * 1000;
  it("is true only for running runs older than the limit", () => {
    const at = (ms: number) => new Date(now.getTime() - ms);
    expect(isInterrupted({ state: "running", startedAt: at(limit + 1) }, now)).toBe(true);
    expect(isInterrupted({ state: "running", startedAt: at(limit) }, now)).toBe(false);
    expect(isInterrupted({ state: "succeeded", startedAt: at(limit + 1) }, now)).toBe(false);
    expect(isInterrupted({ state: "running", startedAt: null }, now)).toBe(false);
  });
});

describe("documentFacts", () => {
  it("takes the newest run by createdAt and detects unreviewed drafts", () => {
    const facts = documentFacts(
      [
        { state: "failed", createdAt: new Date(1) },
        { state: "succeeded", createdAt: new Date(3) },
        { state: "running", createdAt: new Date(2) },
      ],
      [{ reviewedAt: new Date() }, { reviewedAt: null }],
    );
    expect(facts).toEqual({ latestRunState: "succeeded", hasUnreviewedDrafts: true });
    expect(documentFacts([], [{ reviewedAt: new Date() }])).toEqual({
      latestRunState: null,
      hasUnreviewedDrafts: false,
    });
  });
});

describe("stableStringify", () => {
  it("is independent of key order, including nested objects and arrays", () => {
    const a = { b: [{ y: 1, x: 2 }], a: { d: null, c: "s" } };
    const b = { a: { c: "s", d: null }, b: [{ x: 2, y: 1 }] };
    expect(stableStringify(a)).toBe(stableStringify(b));
    expect(stableStringify(a)).toContain('"a": {');
  });
});

describe("helvetica metrics", () => {
  it("measures with the built-in font's advance widths", () => {
    // "Hi" in Helvetica: H 722 + i 222 = 944 per 1000 em.
    expect(textWidth("Hi", 10)).toBeCloseTo(9.44, 5);
    expect(textWidth("Hi", 10, "bold")).toBeCloseTo((722 + 278) / 100, 5);
    expect(textWidth("é", 10)).toBe(textWidth("e", 10));
  });
  it("counts greedy word-wrapped lines", () => {
    const word = "word";
    const w = textWidth(word, 10);
    const space = textWidth(" ", 10);
    expect(lineCount(`${word} ${word}`, 2 * w + space, 10)).toBe(1);
    expect(lineCount(`${word} ${word}`, 2 * w + space - 0.1, 10)).toBe(2);
    expect(lineCount("", 100, 10)).toBe(1);
  });
});

describe("layoutCheck", () => {
  const fits = readFixture("resume") as ResumeContent;
  it("passes the fixture and ignores other document types", () => {
    expect(layoutCheck("resume", fits)).toEqual([]);
    expect(layoutCheck("cover_letter", readFixture("cover-letter") as never)).toEqual([]);
  });
  it("flags a bullet, a subheading, a skills line and a summary that wrap", () => {
    const long = "word ".repeat(40).trim();
    const content = structuredClone(fits);
    content.sections[0]!.entries[0]!.bullets[0]!.text = long;
    content.sections[0]!.entries[0]!.subheading = long;
    const skills = content.sections.find((s) => s.kind === "skills")!;
    skills.entries[0]!.subheading = long;
    content.summary!.text = "mmmm ".repeat(60).trim();
    expect(textWidth(long, resumeLine.fontSize)).toBeGreaterThan(resumeLine.text);
    const paths = layoutCheck("resume", content).map((w) => `${w.kind}:${w.path}`);
    expect(paths).toEqual([
      "wraps_line:summary",
      "wraps_line:sections.0.entries.0",
      "wraps_line:sections.0.entries.0.bullets.0",
      `wraps_line:sections.${content.sections.indexOf(skills)}.entries.0`,
    ]);
  });
  it("flags a contact line that wraps", () => {
    const content = structuredClone(fits);
    content.header.contact = ["a".repeat(60), "b".repeat(60)];
    expect(layoutCheck("resume", content).map((w) => w.path)).toEqual(["header"]);
  });
  it("accepts a bullet exactly as wide as its printed line", () => {
    let text = "x";
    while (textWidth(`${text} x`, resumeLine.bulletFontSize) <= resumeLine.bullet) text += " x";
    const content = structuredClone(fits);
    content.sections[0]!.entries[0]!.bullets[0]!.text = text;
    expect(layoutCheck("resume", content)).toEqual([]);
    content.sections[0]!.entries[0]!.bullets[0]!.text = `${text} x`;
    expect(layoutCheck("resume", content)).toHaveLength(1);
  });
});
