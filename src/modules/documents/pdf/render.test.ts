import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoSnapshot } from "../../../../tests/helpers/demo-snapshot";
import { coverLetterContent, resumeContent, resumeTotals } from "../contracts";
import { textWidth } from "../helvetica";
import { resumeLine } from "../rules";
import {
  fitResume,
  letterHeaderFrom,
  pdfPageCount,
  renderCoverLetterPdf,
  renderResumePdf,
  spacingBounds,
} from "./render";

const fixture = (name: string) =>
  JSON.parse(readFileSync(`examples/generation/fixtures/${name}.json`, "utf8"));

const evidenceIds = ["50000000-0000-4000-8000-000000000001"];
/** A bullet as wide as one printed line allows (resumeLine.bullet), so it is the worst case. */
const bullet = (n: number) => {
  let text = `Bullet ${n}`;
  while (textWidth(`${text} word`, resumeLine.bulletFontSize) <= resumeLine.bullet) text += " word";
  return { text, evidenceIds };
};

describe("PDF rendering (DESIGN-DOCS.md)", () => {
  it("renders the resume fixture to exactly one Letter page", async () => {
    const pdf = await renderResumePdf(resumeContent.parse(fixture("resume")));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdfPageCount(pdf)).toBe(1);
    expect(pdf.toString("latin1")).toContain("/MediaBox [0 0 612 792]");
    expect(pdf.toString("latin1")).toContain("Helvetica");
  });

  it("stretches a thin resume's spacing up to the bound and never beyond one page", async () => {
    // The demo fixture is far shorter than a page: the fit reaches the maximum scale.
    const thin = await fitResume(resumeContent.parse(fixture("resume")));
    expect(thin.spacing).toBe(spacingBounds.max);
    expect(pdfPageCount(thin.pdf)).toBe(1);
  });

  it("renders a resume at the full budget on one page", async () => {
    // resumeTotals: 7 entries and 12 bullets, every bullet filling its printed line, a summary
    // of three full lines and a headline. The guarantee holds for one-line bullets, subheadings
    // and skills lines; anything wider is what the layout check warns about.
    const full = resumeContent.parse({
      header: {
        name: "Alex Rivera",
        headline: "Software developer",
        contact: ["a@example.com", "+1 555 0100", "City", "linkedin.com/in/x", "github.com/x"],
      },
      summary: {
        text: `${bullet(0).text} ${bullet(0).text} ${bullet(0).text}`.slice(0, 300),
        evidenceIds,
      },
      sections: [
        {
          kind: "experience",
          title: "Work experience",
          entries: [0, 1, 2].map((i) => ({
            heading: `Employer ${i}`,
            subheading: "Role title here",
            dateRange: "Jan 2020 – Dec 2021",
            location: null,
            bullets: i < 2 ? [bullet(1), bullet(2), bullet(3), bullet(4)] : [bullet(5), bullet(6)],
          })),
        },
        {
          kind: "projects",
          title: "Projects",
          entries: [0, 1].map((i) => ({
            heading: `Project ${i}`,
            subheading: "Technologies",
            dateRange: null,
            location: null,
            bullets: [bullet(7)],
          })),
        },
        {
          kind: "education",
          title: "Education",
          entries: [0, 1].map((i) => ({
            heading: `School ${i}`,
            subheading: "Degree",
            dateRange: "2015 – 2019",
            location: null,
            bullets: [],
          })),
        },
        {
          kind: "skills",
          title: "Skills",
          entries: [0, 1, 2, 3].map((i) => ({
            heading: `Group ${i}`,
            subheading: "a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x",
            dateRange: null,
            location: null,
            bullets: [],
          })),
        },
      ],
    });
    const entries = full.sections
      .filter((s) => s.kind !== "skills")
      .reduce((n, s) => n + s.entries.length, 0);
    const bullets = full.sections.reduce(
      (n, s) => n + s.entries.reduce((m, e) => m + e.bullets.length, 0),
      0,
    );
    expect(entries).toBe(resumeTotals.entries);
    expect(bullets).toBe(resumeTotals.bullets);
    const fitted = await fitResume(full);
    expect(pdfPageCount(fitted.pdf)).toBe(1);
    // A full page is fitted, not stretched to the bound: the spacing lands strictly inside it.
    expect(fitted.spacing).toBeGreaterThanOrEqual(spacingBounds.min);
    expect(fitted.spacing).toBeLessThan(spacingBounds.max);
  });

  it("rejects a resume over the totals before it can reach the renderer", () => {
    const over = resumeContent.safeParse({
      header: { name: "Alex Rivera", headline: null, contact: [] },
      summary: null,
      sections: [
        {
          kind: "experience",
          title: "Work experience",
          entries: [0, 1, 2, 3].map((i) => ({
            heading: `Employer ${i}`,
            subheading: null,
            dateRange: null,
            location: null,
            bullets: [bullet(1), bullet(2), bullet(3), bullet(4)],
          })),
        },
      ],
    });
    expect(over.success).toBe(false);
  });

  it("renders the cover letter fixture on one page with the snapshot header", async () => {
    const header = letterHeaderFrom(demoSnapshot(), new Date("2026-09-14T00:00:00Z"));
    expect(header.name).toBe("Alex Rivera");
    expect(header.topContact.map((item) => item.text)).toContain("alex@example.com");
    const pdf = await renderCoverLetterPdf(
      coverLetterContent.parse(fixture("cover-letter")),
      header,
    );
    expect(pdfPageCount(pdf)).toBe(1);
  });
});

it("renders long and sparse letters without losing the closing", async () => {
  const content = coverLetterContent.parse(fixture("cover-letter"));
  const header = letterHeaderFrom(demoSnapshot(), new Date());
  for (const sparse of [false, true]) {
    const pdf = await renderCoverLetterPdf(
      content,
      sparse
        ? {
            ...header,
            topContact: [],
            footerLinks: [],
            locationLines: [],
            company: null,
            role: null,
          }
        : header,
    );
    expect(pdfPageCount(pdf)).toBe(1);
  }
  content.paragraphs = Array.from({ length: 4 }, () => ({
    text: "A supported career story with practical details. ".repeat(14),
    evidenceIds: [],
  }));
  expect(coverLetterContent.safeParse(content).success).toBe(true);
  // Legacy long drafts flow onto another page rather than shrinking below 12 pt.
  expect(pdfPageCount(await renderCoverLetterPdf(content, header))).toBe(2);
});

it("embeds explicit web link annotations with the full destination", async () => {
  const snapshot = demoSnapshot();
  snapshot.profile.links = [{ label: "Website", url: "https://www.example.com/" }];
  const pdf = await renderCoverLetterPdf(
    coverLetterContent.parse(fixture("cover-letter")),
    letterHeaderFrom(snapshot, new Date()),
  );
  expect(pdf.toString("latin1")).toContain("/Subtype /Link");
  expect(pdf.toString("latin1")).toContain("https://www.example.com/");
});

it("lets long footer details flow onto later pages instead of overlapping the letter", async () => {
  const snapshot = demoSnapshot();
  snapshot.profile.location = `${"Harbor district ".repeat(240)}, Portugal`;
  snapshot.profile.links = [
    { label: "Website", url: `https://example.com/${"long-path/".repeat(120)}` },
  ];
  const pdf = await renderCoverLetterPdf(
    coverLetterContent.parse(fixture("cover-letter")),
    letterHeaderFrom(snapshot, new Date()),
  );
  expect(pdfPageCount(pdf)).toBeGreaterThan(1);
  expect(pdf.toString("latin1")).toContain(snapshot.profile.links[0]!.url);
});
