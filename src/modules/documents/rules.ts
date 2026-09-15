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

export interface Unit extends ContentUnit {
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
  for (const unit of contentUnits(type, content)) {
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
    if (unit.evidenceIds.length === 0) {
      warnings.push({ kind: "no_evidence", path: unit.path, message: "No evidence cited" });
      continue;
    }
    const cited = known.map((id) => numbersIn(evidence.get(id) ?? "")).flat();
    for (const number of numbersIn(unit.text)) {
      if (!cited.includes(number)) {
        warnings.push({
          kind: "unsupported_number",
          path: unit.path,
          message: `"${number}" does not appear in the cited evidence`,
        });
      }
    }
  }
  if (type === "resume") warnings.push(...headingWarnings(content as ResumeContent, snapshot));
  return warnings;
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

/** A copy of the content with one unit's text replaced; unknown paths return null. */
export function withUnitText(
  type: DocumentType,
  content: DocumentContent,
  path: string,
  text: string,
): DocumentContent | null {
  const copy = structuredClone(content);
  switch (type) {
    case "resume": {
      const resume = copy as ResumeContent;
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
  // A queued paste-back run is a prompt waiting for a person, not work in progress: it must not
  // show as "Crafting documents".
  const latest = runs
    .filter((r) => !(r.mode === "pasted" && r.state === "queued"))
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
