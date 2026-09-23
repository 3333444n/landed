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
import { documentFactsForApplications, sweepInterruptedRuns } from "@/modules/documents";
import { jobSummary } from "@/modules/jobs";
import { listJobs } from "./company-job";
import type { BaseDeps } from "@/modules/shared/service";

export interface JobRow {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  salary: string | null;
  /** The stored logo's address; when present it replaces the status icon (DESIGN.md). */
  logoHref: string | null;
  summary: string;
  createdAt: string;
  updatedAt: string;
  facts: JobStatusFacts;
  derived: DerivedJobStatus;
}

export async function listJobRows(deps: BaseDeps, profileId: string): Promise<JobRow[]> {
  // Runs abandoned by a restart become visible failures before the chip is derived (docs/05).
  await sweepInterruptedRuns(deps, profileId);
  const [jobs, applications] = await Promise.all([
    listJobs(deps, profileId),
    listApplications(deps, profileId),
  ]);
  const byJob = new Map(applications.map((a) => [a.jobId, a]));
  const documentFacts = await documentFactsForApplications(
    deps,
    profileId,
    applications.map((a) => a.id),
  );
  return jobs.map((job) => {
    const application = byJob.get(job.id);
    const documents = application ? documentFacts.get(application.id) : undefined;
    const facts: JobStatusFacts = {
      availability: job.availability,
      applicationStatus: application?.status ?? null,
      latestRunState: documents?.latestRunState ?? null,
      hasUnreviewedDrafts: documents?.hasUnreviewedDrafts ?? false,
      // Matching runs arrive in Phase 2.
      hasMatchAssessment: false,
    };
    return {
      id: job.id,
      title: job.title,
      companyName: job.companyName,
      location: job.location,
      salary: job.salary,
      logoHref: job.logoHref,
      summary: jobSummary(job.rawDescription),
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      facts,
      derived: deriveJobStatus(facts),
    };
  });
}
