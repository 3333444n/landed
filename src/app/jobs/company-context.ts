import type { Database } from "@/infrastructure/database";
import { deleteCompanyFinding, listCompanyFindings } from "@/modules/companies";
import {
  getJob,
  getSelectedFindingIds,
  invalidateJobsForFinding,
  lockJobFindingContext,
} from "@/modules/jobs";
import type { BaseDeps } from "@/modules/shared/service";
import type { Result } from "@/modules/shared/contracts";
export async function getSelectedJobFindings(deps: BaseDeps, profileId: string, jobId: string) {
  const job = await getJob(deps, profileId, jobId);
  if (!job?.companyId) return [];
  const [findings, ids] = await Promise.all([
    listCompanyFindings(deps, profileId, job.companyId),
    getSelectedFindingIds(deps, profileId, jobId),
  ]);
  return findings.filter((f) => ids.includes(f.id));
}
class Rollback {
  constructor(readonly result: Result<void>) {}
}
/** Removing a finding invalidates open selection forms as well as cascading live selections. */
export async function removeCompanyFinding(
  deps: BaseDeps,
  profileId: string,
  companyId: string,
  id: string,
  raw: unknown,
): Promise<Result<void>> {
  try {
    return await deps.db.transaction(async (tx) => {
      const inner = { ...deps, db: tx as unknown as Database };
      await lockJobFindingContext(inner, profileId);
      await invalidateJobsForFinding(inner, profileId, id);
      const result = await deleteCompanyFinding(inner, profileId, companyId, id, raw);
      if (!result.ok) throw new Rollback(result);
      return result;
    });
  } catch (e) {
    if (e instanceof Rollback) return e.result;
    throw e;
  }
}
