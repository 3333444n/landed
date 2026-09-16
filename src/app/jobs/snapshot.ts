/*
 * Builds the frozen input snapshot (ADR 002, docs/04) from the profile's records and one job. A
 * pure function over data: the same records always yield the same snapshot, which is what makes
 * a prompt reproducible from its run record.
 */
import type { Snapshot } from "@/modules/documents";
import type { JobRecord } from "@/modules/jobs";
import type {
  AchievementWithSkills,
  EducationRecord,
  EmploymentRecord,
  ProfileRecord,
  ProjectRecord,
  SkillRecord,
} from "@/modules/profile";

export interface SnapshotSources {
  profile: ProfileRecord;
  employment: EmploymentRecord[];
  education: EducationRecord[];
  projects: ProjectRecord[];
  skills: SkillRecord[];
  achievements: AchievementWithSkills[];
  job: JobRecord;
  capturedAt: Date;
}

export function buildSnapshot(s: SnapshotSources): Snapshot {
  return {
    capturedAt: s.capturedAt.toISOString(),
    profile: {
      id: s.profile.id,
      displayName: s.profile.displayName,
      headline: s.profile.headline,
      summary: s.profile.summary,
      email: s.profile.email,
      phone: s.profile.phone,
      location: s.profile.location,
      links: s.profile.links.map((l) => ({ label: l.label, url: l.url })),
    },
    employment: s.employment.map((e) => ({
      id: e.id,
      employerName: e.employerName,
      role: e.role,
      location: e.location,
      startYear: e.startYear,
      startMonth: e.startMonth,
      endYear: e.endYear,
      endMonth: e.endMonth,
      isCurrent: e.isCurrent,
      description: e.description,
    })),
    education: s.education.map((e) => ({
      id: e.id,
      institution: e.institution,
      qualification: e.qualification,
      subject: e.subject,
      startYear: e.startYear,
      startMonth: e.startMonth,
      endYear: e.endYear,
      endMonth: e.endMonth,
      status: e.status,
      description: e.description,
    })),
    projects: s.projects.map((p) => ({
      id: p.id,
      employmentId: p.employmentId,
      name: p.name,
      description: p.description,
      url: p.url,
      startYear: p.startYear,
      startMonth: p.startMonth,
      endYear: p.endYear,
      endMonth: p.endMonth,
    })),
    skills: s.skills.map((k) => ({ id: k.id, displayName: k.displayName, category: k.category })),
    achievements: s.achievements.map((a) => ({
      id: a.id,
      employmentId: a.employmentId,
      projectId: a.projectId,
      statement: a.statement,
      problem: a.problem,
      action: a.action,
      result: a.result,
      metric: a.metric,
      skillIds: [...a.skillIds].sort(),
    })),
    job: {
      id: s.job.id,
      title: s.job.title,
      companyName: s.job.companyName,
      location: s.job.location,
      rawDescription: s.job.rawDescription,
    },
  };
}
