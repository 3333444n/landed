/** Composition projection: names and logos always come from the linked Company. */
import { getCompany, listCompanies, logoHref } from "@/modules/companies";
import { getJob as readJob, listJobs as readJobs, type JobRecord } from "@/modules/jobs";
import type { BaseDeps } from "@/modules/shared/service";
export type CompanyJob = JobRecord & { companyName: string; logoHref: string | null };
export async function getJob(
  deps: BaseDeps,
  profileId: string,
  id: string,
): Promise<CompanyJob | null> {
  const job = await readJob(deps, profileId, id);
  if (!job) return null;
  const company = job.companyId ? await getCompany(deps, profileId, job.companyId) : null;
  return { ...job, companyName: company?.name ?? "", logoHref: company ? logoHref(company) : null };
}
export async function listJobs(deps: BaseDeps, profileId: string): Promise<CompanyJob[]> {
  const [jobs, companies] = await Promise.all([
    readJobs(deps, profileId),
    listCompanies(deps, profileId),
  ]);
  const byId = new Map(companies.map((c) => [c.id, c]));
  return jobs.map((job) => {
    const company = job.companyId ? byId.get(job.companyId) : null;
    return {
      ...job,
      companyName: company?.name ?? "",
      logoHref: company ? logoHref(company) : null,
    };
  });
}
