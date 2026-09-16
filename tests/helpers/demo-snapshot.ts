/*
 * Builds a Snapshot from examples/demo-profile.json (fictional) for unit tests, mapping the
 * fixture's snake_case fields to the snapshot shape. The record ids stay the demo ids, so the
 * fixtures in examples/generation/fixtures ground cleanly against it.
 */
import { readFileSync } from "node:fs";
import type { Snapshot } from "@/modules/documents";

type Row = Record<string, unknown>;

export function demoSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  const demo = JSON.parse(readFileSync("examples/demo-profile.json", "utf8")) as Record<
    string,
    Row[]
  >;
  const nullable = <T>(v: unknown): T | null => (v === undefined || v === null ? null : (v as T));
  const p = demo.profiles![0]!;
  const job = demo.jobs![0]!;
  return {
    capturedAt: "2026-01-01T00:00:00.000Z",
    profile: {
      id: String(p.id),
      displayName: String(p.display_name),
      headline: nullable(p.headline),
      summary: nullable(p.summary),
      email: nullable(p.email),
      phone: nullable(p.phone),
      location: nullable(p.location),
      links: [],
    },
    employment: demo.employment!.map((e) => ({
      id: String(e.id),
      employerName: String(e.employer_name),
      role: String(e.role),
      location: nullable(e.location),
      startYear: nullable(e.start_year),
      startMonth: nullable(e.start_month),
      endYear: nullable(e.end_year),
      endMonth: nullable(e.end_month),
      isCurrent: Boolean(e.is_current),
      description: nullable(e.description),
    })),
    education: demo.education!.map((e) => ({
      id: String(e.id),
      institution: String(e.institution),
      qualification: nullable(e.qualification),
      subject: nullable(e.subject),
      startYear: nullable(e.start_year),
      startMonth: nullable(e.start_month),
      endYear: nullable(e.end_year),
      endMonth: nullable(e.end_month),
      status: String(e.status),
      description: nullable(e.description),
    })),
    projects: demo.projects!.map((r) => ({
      id: String(r.id),
      employmentId: nullable(r.employment_id),
      name: String(r.name),
      description: nullable(r.description),
      url: nullable(r.url),
      startYear: nullable(r.start_year),
      startMonth: nullable(r.start_month),
      endYear: nullable(r.end_year),
      endMonth: nullable(r.end_month),
    })),
    skills: demo.skills!.map((s) => ({
      id: String(s.id),
      displayName: String(s.display_name),
      category: nullable(s.category),
    })),
    achievements: demo.achievements!.map((a) => ({
      id: String(a.id),
      employmentId: nullable(a.employment_id),
      projectId: nullable(a.project_id),
      statement: String(a.statement),
      problem: nullable(a.problem),
      action: nullable(a.action),
      result: nullable(a.result),
      metric: nullable(a.metric),
      skillIds: demo
        .achievement_skills!.filter((l) => l.achievement_id === a.id)
        .map((l) => String(l.skill_id)),
    })),
    job: {
      id: String(job.id),
      title: String(job.title),
      companyName: String(job.company_name),
      location: nullable(job.location),
      rawDescription: String(job.raw_description),
    },
    ...overrides,
  };
}

export function readFixture<T = unknown>(name: string): T {
  return JSON.parse(readFileSync(`examples/generation/fixtures/${name}.json`, "utf8")) as T;
}
