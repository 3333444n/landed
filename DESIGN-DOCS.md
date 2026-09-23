# Landed document design

Rules for the files Landed produces for other people: the resume PDF, the cover-letter PDF and the copyable recruiter message. DESIGN.md governs the application interface; this file governs the documents, which are read by recruiters and parsed by applicant-tracking software. Where the two disagree, each applies to its own surface.

The documents are conservative on purpose. A recruiter spends seconds on a resume and a parser needs plain text in a predictable order. Nothing here is decoration.

## Hard rules

1. **Resume: one page, filled.** The resume is exactly one US Letter page and ends at the bottom margin. The content schema carries the budgets that make this possible: per section, up to 4 work entries with 4 bullets, 3 projects with 3, 2 education entries with 1, 4 skills lines; across the resume, at most 7 entries and 12 bullets. The contact line, every bullet, entry subheading and skills line prints on one line and the summary on at most three: the layout check measures each with the font's own metrics and warns in the review view when one wraps, because the page budget is counted in lines (the prompt asks for 108 to 114 characters per bullet, so each bullet fills its line). The renderer never shrinks text to fit; a render test proves the page count at the full budget with every line at its full width. To fill the page it stretches the gaps between blocks (section, entry and bullet spacing, never a font size or a line height) to the largest scale that still yields one page, found by bisection over renders, up to 2.4 times the base gaps. Content thinner than that leaves the rest of the page empty: the fix is more content, not more air.
2. **One typeface, built into PDF.** Helvetica, in regular, bold and oblique, as embedded standard fonts. No font download, no fallback stack, no second family.
3. **Monochrome.** Black text on white, one tone: no greys for dates, contact lines or rules. No colour, no tints, no icons, no photos, no charts, no rating bars for skills.
4. **Uppercase section headings, sentence case everywhere else.** Section headings are the one uppercase element ("EXPERIENCE"), set by the renderer from sentence-case content so the text stays "Experience" for parsers and the preview. Entry headings, role titles and labels are sentence case. No letter-spacing tricks.
5. **Rules, not boxes.** A section heading sits on a 2 pt line. No borders around blocks, no background fills, no columns of unequal width, no tables for layout.
6. **Plain structure for parsers.** Reading order is a single column from top to bottom: header, then sections. Dates are on the same line as the employer, right-aligned, and a role's location on the same line as the role, right-aligned, in a form a parser reads ("Aug 2019 – May 2023", "Jul 2023 – Present"). Bullets use a real bullet character with a hanging indent.
7. **Facts only.** Every bullet in a generated document traces to an evidence record in the input snapshot. The renderer never adds text; it renders what was reviewed.

## Page

| Property | Value |
| --- | --- |
| Size | US Letter, 8.5 × 11 in (612 × 792 pt) |
| Margins | 0.5 in (36 pt) on all sides |
| Text colour | `#000000` |
| Secondary text (dates, contact line, locations) | `#000000`, same as the text |
| Rules | `#000000`, 2 pt |
| Line height | 1.25 |

## Type scale

| Element | Size | Weight | Notes |
| --- | --- | --- | --- |
| Name | 24 pt | bold | First line of the page |
| Contact line | 9.5 pt | regular | One line: phone, email, links, separated by " · ". Phone, email, location, LinkedIn, GitHub, in that order, when present; no other link. Must print on one line |
| Section heading | 12 pt | bold | Uppercase, 2 pt rule below, 10 pt space above, 4 pt below the rule (both gaps scale with the page fill) |
| Entry heading (employer, institution, project) | 10.5 pt | bold | Date range right-aligned on the same line, bold, 10 pt, text colour |
| Entry subheading (role, qualification, technologies) | 10 pt | regular | Optional; directly under the heading. A role's location right-aligned on the same line at 9 pt |
| Body | 10 pt | regular | Summary, subheadings, skills lines |
| Bullets | 10 pt | regular | Bullet "•", hanging indent 10 pt, one printed line each (530 pt), 1 pt between bullets, 4 pt between entries; no hyphenation |
| Skills lines | 10 pt | regular | Label in bold followed by a comma-separated list: "Languages: TypeScript, Go" |

Cover letter: same page and type scale, always a single column; the sender's name and contact line as a header, the date and greeting, body text at 10.5 pt with 8 pt between paragraphs, then the closing and name. New drafts target three or four body sentences, roughly 80–150 words in two or three paragraphs. Date, greeting and signature are outside that budget. Existing two-to-four-paragraph content remains valid. Whitespace is intentional: do not add padding prose or stretch the cover letter to fill the page. No letterhead graphics.

A letter connects the specific role and company to stated user motivation and one supported career story. Career accomplishments cite career records; company claims and personal motivation cite distinct frozen context. The app displays citation details and review warnings, but the recipient-facing PDF prints only the letter. Company websites are stored addresses, never evidence that a page was read.

## Resume layout

Order of sections, each present only when the reviewed content has entries: header (name, optional headline, contact line), optional summary (at most three lines, under a "Summary" heading the renderer supplies), work experience, projects, education, skills. Generation may reorder work experience, projects and education to put the strongest evidence first, within the budgets in the content schema. Reference: a classic single-column engineering resume with a name and contact block, sectioned by rules, dates flush right.

## Recruiter message

Plain text, copied rather than rendered: a subject line and a body of at most 900 characters, in the user's voice, with no markup. An email variant and a shorter LinkedIn variant share the same content schema.

## Don'ts

Uppercase anywhere but section headings. Hyphenated line ends. A second typeface or font download. Colour of any kind. Two-column layouts, sidebars, skill bars, icons, photos, logos. Text shrunk to fit. Anything generated that the user did not review.
