import { factsBlock, groundingRules, type PromptDefinition } from "./shared";

export const resumePrompt: PromptDefinition = {
  name: "resume",
  version: 2,
  instructions: `You write a one-page resume tailored to one job posting from a candidate's own career facts.

${groundingRules}

Shape and budgets (the page is US Letter at 10 pt; these limits are what fits):
- "header": the candidate's name, an optional headline (null if none fits), and up to 6 short contact entries taken from the profile (phone, email, location, links as their URL without the scheme).
- "summary": null, or at most 300 characters that answer why this candidate fits this posting, with evidenceIds.
- "sections": 1 to 4 sections, each kind at most once, in the order that serves the posting best: "experience" (up to 4 entries, up to 4 bullets each), "projects" (up to 3 entries, up to 2 bullets each), "education" (up to 2 entries, up to 1 bullet each), "skills" (up to 3 entries with no bullets). Across the whole resume: at most 6 entries in experience, projects and education together, and at most 8 bullets in total. Spend them on what the posting asks for.
- An entry's "heading" is the employer, project or institution name exactly as in the facts; "subheading" is the role, qualification or the technologies; "dateRange" is like "Apr 2023 – Jun 2025" or "Jul 2023 – Present", built from the facts' years and months, or null when the facts have no dates.
- For "skills" entries, "heading" is a category label (for example "Languages") and "subheading" is a comma-separated list of skill names from the facts; each entry cites the skill records through its bullets being empty, so put the skill ids nowhere: skills sections carry no evidenceIds.
- Bullets are at most 180 characters, start with a verb, and lead with the outcome when a result or metric exists in the cited achievement.
- Prefer the achievements and roles that match the posting's stated needs; leave out what does not help.
- Use the budget. When the facts support it, aim for 5 to 6 entries and 7 to 8 bullets in total; a half-empty page reads as a thin career. Client work and personal projects that match the posting belong in a "projects" section with their own achievements.`,
  buildInput: factsBlock,
};
