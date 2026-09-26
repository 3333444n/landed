/*
 * Pure rules for generated materials: the grounding check, the unit iterator the editor and the
 * renderer share, immutable edits, run interruption and the facts the Jobs chip needs.
 * No database, no framework, no model.
 */
import type {
  ContentUnit,
  CoverLetterContent,
  DocumentContent,
  DocumentRunState,
  DocumentType,
  GroundingWarning,
  RecruiterMessageContent,
  ResumeContent,
  RunMode,
  Snapshot,
} from "./contracts";
import { lineCount, textWidth } from "./helvetica";

export interface Unit extends ContentUnit {
  contextIds?: string[];
  path: string;
}

/** Every piece of generated prose with its evidence, in reading order, addressed by a dot path. */
export function contentUnits(type: DocumentType, content: DocumentContent): Unit[] {
  switch (type) {
    case "resume": {
      const resume = content as ResumeContent;
      const units: Unit[] = [];
      if (resume.summary) units.push({ path: "summary", ...resume.summary });
      resume.sections.forEach((section, i) =>
        section.entries.forEach((entry, j) =>
          entry.bullets.forEach((bullet, k) =>
            units.push({ path: `sections.${i}.entries.${j}.bullets.${k}`, ...bullet }),
          ),
        ),
      );
      return units;
    }
    case "cover_letter":
      return (content as CoverLetterContent).paragraphs.map((p, i) => ({
        path: `paragraphs.${i}`,
        ...p,
      }));
    case "recruiter_message": {
      const message = content as RecruiterMessageContent;
      return [{ path: "body", text: message.body, evidenceIds: message.evidenceIds }];
    }
  }
}

/** Editable text is distinct from prose that requires citations. */
export interface EditableField {
  path: string;
  label: string;
  text: string;
  clearable: boolean;
}

export function editableFields(type: DocumentType, content: DocumentContent): EditableField[] {
  const fields: EditableField[] = [];
  const add = (path: string, label: string, text: string | null, clearable = false) => {
    fields.push({ path, label, text: text ?? "", clearable });
  };
  if (type === "resume") {
    const resume = content as ResumeContent;
    add("header.headline", "headline", resume.header.headline, true);
    if (resume.summary) add("summary", "summary", resume.summary.text);
    resume.sections.forEach((section, i) =>
      section.entries.forEach((entry, j) => {
        const path = `sections.${i}.entries.${j}`;
        const suffix = `of ${entry.heading}`;
        if (section.kind === "skills" || section.kind === "education") {
          add(
            `${path}.heading`,
            `${section.kind === "skills" ? "skill group" : "institution"} ${suffix}`,
            entry.heading,
          );
        }
        add(
          `${path}.subheading`,
          `${section.kind === "skills" ? "skills" : "subtitle"} ${suffix}`,
          entry.subheading,
          true,
        );
        if (section.kind === "education") {
          add(`${path}.dateRange`, `dates ${suffix}`, entry.dateRange, true);
          add(`${path}.location`, `location ${suffix}`, entry.location, true);
        }
        entry.bullets.forEach((bullet, k) =>
          add(`${path}.bullets.${k}`, `bullet ${k + 1} ${suffix}`, bullet.text),
        );
      }),
    );
  } else if (type === "cover_letter") {
    const letter = content as CoverLetterContent;
    add("title", "professional title", letter.title ?? null, true);
    add("greeting", "greeting", letter.greeting);
    letter.paragraphs.forEach((p, i) => add(`paragraphs.${i}`, `paragraph ${i + 1}`, p.text));
    add("closing", "closing", letter.closing);
    add("signature", "signature", letter.signature);
  } else {
    const message = content as RecruiterMessageContent;
    add("subject", "subject", message.subject);
    add("body", "message", message.body);
  }
  return fields;
}

/** Text fields a record contributes as evidence, so a number cited from it can be found. */
export function evidenceText(snapshot: Snapshot): Map<string, string> {
  const text = new Map<string, string>();
  const put = (id: string, ...parts: (string | number | null | undefined)[]) =>
    text.set(id, parts.filter((p) => p !== null && p !== undefined && p !== "").join("\n"));
  const p = snapshot.profile;
  put(p.id, p.displayName, p.headline, p.summary, p.location);
  for (const e of snapshot.employment) {
    put(e.id, e.employerName, e.role, e.description, e.startYear, e.endYear);
  }
  for (const e of snapshot.education) {
    put(e.id, e.institution, e.qualification, e.subject, e.description, e.startYear, e.endYear);
  }
  for (const r of snapshot.projects) put(r.id, r.name, r.description, r.startYear, r.endYear);
  for (const s of snapshot.skills) put(s.id, s.displayName, s.category);
  for (const a of snapshot.achievements) {
    put(a.id, a.statement, a.problem, a.action, a.result, a.metric);
  }
  return text;
}

/** Context is separately cited and never accepted as career evidence. */
export function contextEvidenceText(snapshot: Snapshot): Map<string, string> {
  const result = new Map<string, string>();
  result.set(
    snapshot.job.id,
    [
      snapshot.job.title,
      snapshot.job.companyName,
      snapshot.job.location,
      snapshot.job.rawDescription,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  const context = snapshot.writingContext;
  if (!context) return result;
  for (const narrative of [context.aboutMe, context.interest])
    if (narrative) result.set(narrative.id, narrative.text);
  if (context.company)
    result.set(
      context.company.id,
      [context.company.name, context.company.location, context.company.about]
        .filter(Boolean)
        .join("\n"),
    );
  for (const finding of context.findings) result.set(finding.id, finding.text);
  return result;
}

const numberPattern = /\d+(?:[.,]\d+)*/g;

/** Numbers as written, with thousands separators removed, so "4,000" and "4000" agree. */
export function numbersIn(text: string): string[] {
  return (text.match(numberPattern) ?? []).map((n) => n.replace(/,/g, ""));
}

/**
 * The grounding check (docs/06). Valid ids alone prove nothing, so numbers are compared with the
 * cited records' text. Headings are checked against the names in the snapshot. Warnings are for
 * the user to fix or accept; nothing here blocks a save.
 */
export function groundingCheck(
  type: DocumentType,
  content: DocumentContent,
  snapshot: Snapshot,
): GroundingWarning[] {
  const evidence = evidenceText(snapshot);
  const warnings: GroundingWarning[] = [];
  const context =
    type === "cover_letter" ? contextEvidenceText(snapshot) : new Map<string, string>();
  for (const unit of contentUnits(type, content)) {
    const contextIds = unit.contextIds ?? [];
    for (const id of contextIds)
      if (!context.has(id))
        warnings.push({
          kind: "unknown_evidence",
          path: unit.path,
          message: `Context ${id} is not in the snapshot`,
        });
    const known = unit.evidenceIds.filter((id) => evidence.has(id));
    for (const id of unit.evidenceIds) {
      if (!evidence.has(id)) {
        warnings.push({
          kind: "unknown_evidence",
          path: unit.path,
          message: `Evidence ${id} is not in the snapshot`,
        });
      }
    }
    if (unit.evidenceIds.length === 0 && contextIds.length === 0) {
      warnings.push({ kind: "no_evidence", path: unit.path, message: "No evidence cited" });
      continue;
    }
    const careerNumbers = known.flatMap((id) => numbersIn(evidence.get(id) ?? ""));
    const contextNumbers = contextIds
      .filter((id) => !id.startsWith("about:") && !id.startsWith("interest:"))
      .flatMap((id) => numbersIn(context.get(id) ?? ""));
    for (const number of numbersIn(unit.text)) {
      if (careerNumbers.includes(number)) continue;
      warnings.push(
        contextNumbers.includes(number)
          ? {
              kind: "context_number",
              path: unit.path,
              message: `"${number}" is supported only by company or posting context. Check that it describes that context, not your accomplishments.`,
            }
          : {
              kind: "unsupported_number",
              path: unit.path,
              message: `"${number}" does not appear in the cited factual evidence`,
            },
      );
    }
  }

  if (type === "cover_letter") {
    const text = (content as CoverLetterContent).paragraphs.map((p) => p.text).join(" ");
    const sentences = [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(text)]
      .length;
    const words = text.trim().split(/\s+/).length;
    if (sentences > 4 || words > 150)
      warnings.push({
        kind: "letter_length",
        path: "paragraphs.0",
        message: `The body has ${sentences} sentences and ${words} words. Aim for three or four sentences and no more than 150 words; keep the strongest example.`,
      });
  }
  if (type === "resume") {
    warnings.push(...headingWarnings(content as ResumeContent, snapshot));
    warnings.push(...attributionWarnings(content as ResumeContent, snapshot));
  }
  return warnings;
}

/**
 * A bullet under an entry may cite only records that belong to that entry: the entry's own
 * record, its achievements (for a role, also the achievements of its projects), the profile and
 * skills. Achievements linked to nothing are allowed anywhere; the user chose not to place them.
 * Found on the first real run, where a personal-project achievement appeared under an employer
 * with every id valid and every number matching.
 */
function attributionWarnings(resume: ResumeContent, snapshot: Snapshot): GroundingWarning[] {
  const anywhere = new Set<string>([snapshot.profile.id, ...snapshot.skills.map((s) => s.id)]);
  for (const a of snapshot.achievements) {
    if (a.employmentId === null && a.projectId === null) anywhere.add(a.id);
  }
  const warnings: GroundingWarning[] = [];
  resume.sections.forEach((section, i) => {
    const kind = section.kind;
    if (kind === "skills") return;
    section.entries.forEach((entry, j) => {
      const allowed = allowedEvidence(kind, entry.heading, snapshot);
      if (!allowed) return; // an unknown heading is already reported
      entry.bullets.forEach((bullet, k) => {
        for (const id of bullet.evidenceIds) {
          if (anywhere.has(id) || allowed.has(id)) continue;
          if (!snapshot.achievements.some((a) => a.id === id) && !isOwnedRecord(id, snapshot)) {
            continue; // unknown ids are reported by the evidence check
          }
          warnings.push({
            kind: "misattributed_evidence",
            path: `sections.${i}.entries.${j}.bullets.${k}`,
            message: `Evidence ${id} belongs to another role, project or institution than "${entry.heading}"`,
          });
        }
      });
    });
  });
  return warnings;
}

function isOwnedRecord(id: string, snapshot: Snapshot): boolean {
  return (
    snapshot.employment.some((e) => e.id === id) ||
    snapshot.projects.some((p) => p.id === id) ||
    snapshot.education.some((e) => e.id === id)
  );
}

/** The ids an entry with this heading may cite, or null when the heading matches no record. */
function allowedEvidence(
  kind: "experience" | "projects" | "education",
  heading: string,
  snapshot: Snapshot,
): Set<string> | null {
  const h = normalize(heading);
  const matches = (name: string) => {
    const n = normalize(name);
    return n === h || n.includes(h) || h.includes(n);
  };
  if (kind === "experience") {
    const role = snapshot.employment.find((e) => matches(e.employerName));
    if (!role) return null;
    const projectIds = snapshot.projects.filter((p) => p.employmentId === role.id).map((p) => p.id);
    const ids = new Set<string>([role.id, ...projectIds]);
    for (const a of snapshot.achievements) {
      if (a.employmentId === role.id || (a.projectId && projectIds.includes(a.projectId))) {
        ids.add(a.id);
      }
    }
    return ids;
  }
  if (kind === "projects") {
    const project = snapshot.projects.find((p) => matches(p.name));
    if (!project) return null;
    const ids = new Set<string>([project.id]);
    for (const a of snapshot.achievements) if (a.projectId === project.id) ids.add(a.id);
    return ids;
  }
  const school = snapshot.education.find((e) => matches(e.institution));
  return school ? new Set([school.id]) : null;
}

function headingWarnings(resume: ResumeContent, snapshot: Snapshot): GroundingWarning[] {
  const names = [
    ...snapshot.employment.map((e) => e.employerName),
    ...snapshot.education.map((e) => e.institution),
    ...snapshot.projects.map((p) => p.name),
  ].map(normalize);
  const warnings: GroundingWarning[] = [];
  resume.sections.forEach((section, i) => {
    if (section.kind === "skills") return;
    section.entries.forEach((entry, j) => {
      const heading = normalize(entry.heading);
      if (!names.some((n) => n === heading || n.includes(heading) || heading.includes(n))) {
        warnings.push({
          kind: "unknown_heading",
          path: `sections.${i}.entries.${j}`,
          message: `"${entry.heading}" is not an employer, institution or project in your facts`,
        });
      }
    });
  });
  return warnings;
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * The resume's printed lines (DESIGN-DOCS.md): Letter minus 0.5 in margins at 10 pt Helvetica;
 * bullets also lose their 10 pt hanging indent; the contact line is 9.5 pt; the summary may take
 * three lines.
 */
export const resumeLine = {
  text: 540,
  bullet: 530,
  fontSize: 10,
  bulletFontSize: 10,
  contactFontSize: 9.5,
  summaryLines: 3,
} as const;

/**
 * Layout check: the contact line, every bullet, entry subheading and skills line must print on
 * one line, and the summary on at most three, or the page budget no longer guarantees one page. Measured with the
 * built-in font's own metrics, so the warning is exact rather than a character count.
 */
export function layoutCheck(type: DocumentType, content: DocumentContent): GroundingWarning[] {
  if (type !== "resume") return [];
  const resume = content as ResumeContent;
  const warnings: GroundingWarning[] = [];
  const size = resumeLine.fontSize;
  const wraps = (path: string, message: string) =>
    warnings.push({ kind: "wraps_line", path, message });
  if (
    resume.header.contact.length > 0 &&
    textWidth(resume.header.contact.join(" · "), resumeLine.contactFontSize) > resumeLine.text
  ) {
    wraps("header", "The contact line wraps; drop an entry");
  }
  if (
    resume.summary &&
    lineCount(resume.summary.text, resumeLine.text, size) > resumeLine.summaryLines
  ) {
    wraps("summary", `The summary runs past ${resumeLine.summaryLines} lines`);
  }
  resume.sections.forEach((section, i) =>
    section.entries.forEach((entry, j) => {
      const entryPath = `sections.${i}.entries.${j}`;
      if (section.kind === "skills") {
        const width =
          textWidth(`${entry.heading}: `, size, "bold") + textWidth(entry.subheading ?? "", size);
        if (width > resumeLine.text) wraps(entryPath, "The skills line wraps");
      } else if (entry.subheading && textWidth(entry.subheading, size) > resumeLine.text) {
        wraps(entryPath, "The subheading wraps");
      }
      entry.bullets.forEach((bullet, k) => {
        if (textWidth(bullet.text, resumeLine.bulletFontSize) > resumeLine.bullet) {
          wraps(`${entryPath}.bullets.${k}`, "The bullet wraps to a second line");
        }
      });
    }),
  );
  return warnings;
}

/** A copy of the content with one unit's text replaced; unknown paths return null. */
export function withUnitText(
  type: DocumentType,
  content: DocumentContent,
  path: string,
  text: string,
): DocumentContent | null {
  const field = editableFields(type, content).find((f) => f.path === path);
  if (!field) return null;
  const copy = structuredClone(content);
  const value = text.trim() || (field.clearable ? null : "");
  switch (type) {
    case "resume": {
      const resume = copy as ResumeContent;
      if (path === "header.headline") {
        resume.header.headline = value;
        return resume;
      }
      const entryMatch =
        /^sections\.(\d+)\.entries\.(\d+)\.(heading|subheading|dateRange|location)$/.exec(path);
      if (entryMatch) {
        const entry = resume.sections[Number(entryMatch[1])]!.entries[Number(entryMatch[2])]!;
        const key = entryMatch[3] as "heading" | "subheading" | "dateRange" | "location";
        if (key === "heading") entry.heading = text;
        else entry[key] = value;
        return resume;
      }
      if (path === "summary") {
        if (!resume.summary) return null;
        resume.summary.text = text;
        return resume;
      }
      const m = /^sections\.(\d+)\.entries\.(\d+)\.bullets\.(\d+)$/.exec(path);
      if (!m) return null;
      const bullet = resume.sections[Number(m[1])]?.entries[Number(m[2])]?.bullets[Number(m[3])];
      if (!bullet) return null;
      bullet.text = text;
      return resume;
    }
    case "cover_letter": {
      const letter = copy as CoverLetterContent;
      if (path === "title") {
        letter.title = value;
        return letter;
      }
      if (path === "greeting" || path === "closing" || path === "signature") {
        letter[path] = text;
        return letter;
      }
      const m = /^paragraphs\.(\d+)$/.exec(path);
      const paragraph = m ? letter.paragraphs[Number(m[1])] : undefined;
      if (!paragraph) return null;
      paragraph.text = text;
      return letter;
    }
    case "recruiter_message": {
      const message = copy as RecruiterMessageContent;
      if (path === "body") message.body = text;
      else if (path === "subject") message.subject = text;
      else return null;
      return message;
    }
  }
}

/** A run still marked running after the limit was interrupted by a restart or a crash (docs/05). */
export function isInterrupted(
  run: { state: DocumentRunState; startedAt: Date | null },
  now: Date,
  limitMs = 10 * 60 * 1000,
): boolean {
  return (
    run.state === "running" &&
    run.startedAt !== null &&
    now.getTime() - run.startedAt.getTime() > limitMs
  );
}

/** The two facts the Jobs chip needs from Documents (docs/05), per application. */
export interface DocumentFacts {
  latestRunState: DocumentRunState | null;
  hasUnreviewedDrafts: boolean;
}

export function documentFacts(
  runs: { state: DocumentRunState; createdAt: Date; mode?: RunMode }[],
  latestRevisions: { reviewedAt: Date | null }[],
): DocumentFacts {
  // A queued paste-back or assistant run is a brief waiting for an answer, not work in progress:
  // it must not show as "Crafting documents".
  const latest = runs
    .filter((r) => !(r.mode !== "adapter" && r.state === "queued"))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  return {
    latestRunState: latest?.state ?? null,
    hasUnreviewedDrafts: latestRevisions.some((r) => r.reviewedAt === null),
  };
}

/** JSON with keys in a stable order, so the same snapshot always yields the same prompt. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value), null, 2);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}
