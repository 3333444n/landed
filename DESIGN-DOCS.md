# Landed document design

Rules for the files Landed produces for other people: the resume PDF, the cover-letter PDF and the copyable recruiter message. DESIGN.md governs the application interface; this file governs the documents, which are read by recruiters and parsed by applicant-tracking software. Where the two disagree, each applies to its own surface.

The documents are conservative on purpose. A recruiter spends seconds on a resume and a parser needs plain text in a predictable order. Nothing here is decoration.

## Hard rules

1. **One page.** The resume is exactly one US Letter page. The cover letter fits one page. The content schema carries the budgets that make this possible: per section, up to 4 work entries with 4 bullets, 3 projects with 2, 2 education entries with 1, 3 skills lines; across the resume, at most 6 entries and 8 bullets, each bullet at most 180 characters (measured: 6 entries with 9 bullets of 180 characters still fit; 10 do not). The renderer does not shrink text to fit, and a render test proves the page count at the full budget.
2. **One typeface, built into PDF.** Helvetica, in regular, bold and oblique, as embedded standard fonts. No font download, no fallback stack, no second family.
3. **Monochrome.** Near-black text on white. No colour, no tints, no icons, no photos, no charts, no rating bars for skills.
4. **Sentence case everywhere.** Section headings, role titles and labels are sentence case ("Work experience", not "WORK EXPERIENCE"). No letter-spacing tricks.
5. **Rules, not boxes.** A section heading may sit on a 1px line. No borders around blocks, no background fills, no columns of unequal width, no tables for layout.
6. **Plain structure for parsers.** Reading order is a single column from top to bottom: header, then sections. Dates are on the same line as the role, right-aligned, in a form a parser reads ("Aug 2019 – May 2023", "Jul 2023 – Present"). Bullets use a real bullet character with a hanging indent.
7. **Facts only.** Every bullet in a generated document traces to an evidence record in the input snapshot. The renderer never adds text; it renders what was reviewed.

## Page

| Property | Value |
| --- | --- |
| Size | US Letter, 8.5 × 11 in (612 × 792 pt) |
| Margins | 0.6 in (43 pt) on all sides |
| Text colour | `#111111` |
| Secondary text (dates, contact line) | `#444444` |
| Rules | `#999999`, 1 pt |
| Line height | 1.3 |

## Type scale

| Element | Size | Weight | Notes |
| --- | --- | --- | --- |
| Name | 20 pt | bold | First line of the page |
| Contact line | 9.5 pt | regular | One line: phone, email, links, separated by " · ". Secondary colour |
| Section heading | 11 pt | bold | Sentence case, 1 pt rule below, 10 pt space above, 4 pt below the rule |
| Entry heading (employer, institution, project) | 10.5 pt | bold | Date range right-aligned on the same line in secondary colour, 9.5 pt |
| Entry subheading (role, qualification, technologies) | 10 pt | regular | Optional; directly under the heading |
| Body and bullets | 10 pt | regular | Bullet "•", hanging indent 10 pt, 2 pt between bullets |
| Skills lines | 10 pt | regular | Label in bold followed by a comma-separated list: "Languages: TypeScript, Go" |

Cover letter: same page and type scale; the sender's name and contact line as a header, the date and the greeting, two to four paragraphs of body text at 10.5 pt with 8 pt between paragraphs, then the closing and the name. No letterhead graphics.

## Resume layout

Order of sections, each present only when the reviewed content has entries: header (name, optional headline, contact line), optional summary (at most three lines), work experience, projects, education, skills. Generation may reorder work experience, projects and education to put the strongest evidence first, within the budgets in the content schema. Reference: a classic single-column engineering resume with a name and contact block, sectioned by rules, dates flush right.

## Recruiter message

Plain text, copied rather than rendered: a subject line and a body of at most 900 characters, in the user's voice, with no markup. An email variant and a shorter LinkedIn variant share the same content schema.

## Don'ts

Uppercase headings. A second typeface or font download. Colour of any kind. Two-column layouts, sidebars, skill bars, icons, photos, logos. Text shrunk to fit. Anything generated that the user did not review.
