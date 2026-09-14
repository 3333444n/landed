/*
 * Reads jobs and applications through their public surfaces and derives the list status for each
 * job (docs/05). The result is plain data a client component can filter and sort.
 */
import {
  deriveJobStatus,
  listApplications,
  type DerivedJobStatus,
  type JobStatusFacts,
} from "@/modules/applications";
import { jobSummary, listJobs } from "@/modules/jobs";
import type { BaseDeps } from "@/modules/shared/service";

export interface JobRow {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  summary: string;
  createdAt: string;
  updatedAt: string;
  facts: JobStatusFacts;
  derived: DerivedJobStatus;
}

export async function listJobRows(deps: BaseDeps, profileId: string): Promise<JobRow[]> {
  const [jobs, applications] = await Promise.all([
    listJobs(deps, profileId),
    listApplications(deps, profileId),
  ]);
  const byJob = new Map(applications.map((a) => [a.jobId, a]));
  return jobs.map((job) => {
    const facts: JobStatusFacts = {
      availability: job.availability,
      applicationStatus: byJob.get(job.id)?.status ?? null,
      // No generation or matching runs exist in Phase 1a; Phase 1b and 2 fill these in.
      latestRunState: null,
      hasUnreviewedDrafts: false,
      hasMatchAssessment: false,
    };
    return {
      id: job.id,
      title: job.title,
      companyName: job.companyName,
      location: job.location,
      summary: jobSummary(job.rawDescription),
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      facts,
      derived: deriveJobStatus(facts),
    };
  });
}
