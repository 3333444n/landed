/*
 * Vocabulary and Zod schemas for generated materials (docs/04, docs/05). Browser-safe: no
 * database imports. The content schemas are what the model must produce and what the grounding
 * check and the renderer read; their budgets are what keeps the resume on one page.
 *
 * Optional fields are `nullable()` rather than `optional()` because strict JSON-schema modes
 * (OpenAI) reject optional properties.
 */
import { z } from "zod";

export const documentTypes = ["resume", "cover_letter", "recruiter_message"] as const;
export type DocumentType = (typeof documentTypes)[number];

export const documentTypeLabels: Record<DocumentType, string> = {
  resume: "Resume",
  cover_letter: "Cover letter",
  recruiter_message: "Recruiter message",
};

/** Path segments under /jobs/[id]/. */
export const documentSlugs: Record<DocumentType, string> = {
  resume: "resume",
  cover_letter: "cover-letter",
  recruiter_message: "recruiter-message",
};

export function documentTypeFromSlug(slug: string): DocumentType | null {
  const entry = (Object.entries(documentSlugs) as [DocumentType, string][]).find(
    ([, s]) => s === slug,
  );
  return entry ? entry[0] : null;
}

export const runStates = ["queued", "running", "succeeded", "failed", "cancelled"] as const;
export type DocumentRunState = (typeof runStates)[number];

export const failureKinds = ["provider", "validation", "pasted_invalid", "interrupted"] as const;
export type FailureKind = (typeof failureKinds)[number];

export const failureLabels: Record<FailureKind, string> = {
  provider: "The provider call failed",
  validation: "The answer did not match the document schema",
  pasted_invalid: "The pasted answer was not valid",
  interrupted: "Interrupted before it finished",
};

export const runModes = ["adapter", "pasted"] as const;
export type RunMode = (typeof runModes)[number];

export const revisionSources = ["generated", "pasted", "edited"] as const;
export type RevisionSource = (typeof revisionSources)[number];

// Content schemas

const evidenceIds = z
  .array(z.string().min(1).max(64))
  .max(6)
  .describe("Ids of snapshot records that support this text");

const bullet = z.object({
  text: z.string().trim().min(1).max(180),
  evidenceIds,
});
export type ContentUnit = z.infer<typeof bullet>;

export const resumeSectionKinds = ["experience", "projects", "education", "skills"] as const;
export type ResumeSectionKind = (typeof resumeSectionKinds)[number];

const resumeEntry = z.object({
  heading: z.string().trim().min(1).max(80),
  subheading: z.string().trim().max(160).nullable(),
  dateRange: z.string().trim().max(40).nullable(),
  bullets: z.array(bullet).max(4),
});
export type ResumeEntry = z.infer<typeof resumeEntry>;

const resumeSection = z.object({
  kind: z.enum(resumeSectionKinds),
  title: z.string().trim().min(1).max(40),
  entries: z.array(resumeEntry).max(4),
});
export type ResumeSection = z.infer<typeof resumeSection>;

/**
 * Budgets (DESIGN-DOCS.md): what fits on one Letter page at 10 pt. Per-kind caps shape each
 * section; the totals are what the render test proves fit in the worst case.
 */
export const resumeTotals = { entries: 6, bullets: 8 } as const;

export const resumeBudgets: Record<ResumeSectionKind, { entries: number; bullets: number }> = {
  experience: { entries: 4, bullets: 4 },
  projects: { entries: 3, bullets: 2 },
  education: { entries: 2, bullets: 1 },
  skills: { entries: 3, bullets: 0 },
};

export const resumeContent = z
  .object({
    header: z.object({
      name: z.string().trim().min(1).max(80),
      headline: z.string().trim().max(120).nullable(),
      contact: z.array(z.string().trim().min(1).max(80)).max(6),
    }),
    summary: z
      .object({ text: z.string().trim().min(1).max(300), evidenceIds })
      .nullable()
      .describe("At most three lines, or null"),
    sections: z.array(resumeSection).min(1).max(4),
  })
  .superRefine((content, ctx) => {
    const seen = new Set<ResumeSectionKind>();
    let entries = 0;
    let bullets = 0;
    for (const section of content.sections) {
      if (section.kind !== "skills") entries += section.entries.length;
      for (const entry of section.entries) bullets += entry.bullets.length;
    }
    if (entries > resumeTotals.entries) {
      ctx.addIssue({
        code: "custom",
        path: ["sections"],
        message: `At most ${resumeTotals.entries} entries across experience, projects and education`,
      });
    }
    if (bullets > resumeTotals.bullets) {
      ctx.addIssue({
        code: "custom",
        path: ["sections"],
        message: `At most ${resumeTotals.bullets} bullets in the whole resume`,
      });
    }
    content.sections.forEach((section, i) => {
      if (seen.has(section.kind)) {
        ctx.addIssue({ code: "custom", path: ["sections", i], message: "Duplicate section" });
      }
      seen.add(section.kind);
      const budget = resumeBudgets[section.kind];
      if (section.entries.length > budget.entries) {
        ctx.addIssue({
          code: "custom",
          path: ["sections", i, "entries"],
          message: `At most ${budget.entries} ${section.kind} entries`,
        });
      }
      section.entries.forEach((entry, j) => {
        if (entry.bullets.length > budget.bullets) {
          ctx.addIssue({
            code: "custom",
            path: ["sections", i, "entries", j, "bullets"],
            message: `At most ${budget.bullets} bullets per ${section.kind} entry`,
          });
        }
      });
    });
  });
export type ResumeContent = z.infer<typeof resumeContent>;

export const coverLetterContent = z.object({
  greeting: z.string().trim().min(1).max(80),
  paragraphs: z
    .array(z.object({ text: z.string().trim().min(1).max(700), evidenceIds }))
    .min(2)
    .max(4),
  closing: z.string().trim().min(1).max(40),
  signature: z.string().trim().min(1).max(80),
});
export type CoverLetterContent = z.infer<typeof coverLetterContent>;

export const messageVariants = ["email", "linkedin"] as const;

export const recruiterMessageContent = z.object({
  variant: z.enum(messageVariants),
  subject: z.string().trim().min(1).max(90),
  body: z.string().trim().min(1).max(900),
  evidenceIds,
});
export type RecruiterMessageContent = z.infer<typeof recruiterMessageContent>;

export const contentSchemas = {
  resume: resumeContent,
  cover_letter: coverLetterContent,
  recruiter_message: recruiterMessageContent,
} as const;

export type DocumentContent = ResumeContent | CoverLetterContent | RecruiterMessageContent;

// The frozen input snapshot (ADR 002). Record ids are the original ids, so evidence references
// point at the live record while it exists and at the frozen copy forever.

const monthDates = {
  startYear: z.number().int().nullable(),
  startMonth: z.number().int().nullable(),
  endYear: z.number().int().nullable(),
  endMonth: z.number().int().nullable(),
};

export const profileLink = z.object({
  label: z.string().trim().min(1).max(40),
  url: z.url({ protocol: /^https?$/ }),
});
export type ProfileLink = z.infer<typeof profileLink>;

export const snapshot = z.object({
  capturedAt: z.iso.datetime(),
  profile: z.object({
    id: z.string(),
    displayName: z.string(),
    headline: z.string().nullable(),
    summary: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    location: z.string().nullable(),
    links: z.array(profileLink),
  }),
  employment: z.array(
    z.object({
      id: z.string(),
      employerName: z.string(),
      role: z.string(),
      ...monthDates,
      isCurrent: z.boolean(),
      description: z.string().nullable(),
    }),
  ),
  education: z.array(
    z.object({
      id: z.string(),
      institution: z.string(),
      qualification: z.string().nullable(),
      subject: z.string().nullable(),
      ...monthDates,
      status: z.string(),
      description: z.string().nullable(),
    }),
  ),
  projects: z.array(
    z.object({
      id: z.string(),
      employmentId: z.string().nullable(),
      name: z.string(),
      description: z.string().nullable(),
      url: z.string().nullable(),
      ...monthDates,
    }),
  ),
  skills: z.array(
    z.object({ id: z.string(), displayName: z.string(), category: z.string().nullable() }),
  ),
  achievements: z.array(
    z.object({
      id: z.string(),
      employmentId: z.string().nullable(),
      projectId: z.string().nullable(),
      statement: z.string(),
      problem: z.string().nullable(),
      action: z.string().nullable(),
      result: z.string().nullable(),
      metric: z.string().nullable(),
      skillIds: z.array(z.string()),
    }),
  ),
  job: z.object({
    id: z.string(),
    title: z.string(),
    companyName: z.string(),
    location: z.string().nullable(),
    rawDescription: z.string(),
  }),
});
export type Snapshot = z.infer<typeof snapshot>;

// Grounding warnings (docs/06): produced by the application after every generation.

export const warningKinds = [
  "unknown_evidence",
  "no_evidence",
  "unsupported_number",
  "unknown_heading",
] as const;
export type WarningKind = (typeof warningKinds)[number];

export interface GroundingWarning {
  kind: WarningKind;
  /** Dot path of the unit inside the content, for example `sections.0.entries.1.bullets.2`. */
  path: string;
  message: string;
}

export const warningLabels: Record<WarningKind, string> = {
  unknown_evidence: "Cites a record that is not in the snapshot",
  no_evidence: "Cites no evidence",
  unsupported_number: "Contains a number not found in the cited evidence",
  unknown_heading: "Names an employer, project or institution not in your facts",
};

// Inputs

export const pasteBackInput = z.object({
  runId: z.uuid(),
  json: z.string().min(1, "Paste the answer first").max(200_000),
});
export type PasteBackInput = z.infer<typeof pasteBackInput>;

export const editUnitInput = z.object({
  /** The revision the editor was showing; a newer one means another tab saved first. */
  expectedRevisionId: z.uuid(),
  path: z.string().min(1).max(200),
  text: z.string().trim().min(1, "Write something or cancel").max(2000),
});
export type EditUnitInput = z.infer<typeof editUnitInput>;
