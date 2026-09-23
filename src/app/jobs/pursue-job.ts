/*
 * Composition boundary (docs/03): pasting a posting creates the job and its application together.
 * Neither module imports the other; this function passes one transaction handle to both, and
 * their own transactions nest as savepoints inside it.
 */
import type { Database } from "@/infrastructure/database";
import { createApplication } from "@/modules/applications";
import { saveJob, type JobRecord, type JobsDeps } from "@/modules/jobs";
import type { Result } from "@/modules/shared/contracts";

class RolledBack {
  constructor(readonly result: Result<never>) {}
}

export async function pursueJob(
  deps: JobsDeps,
  profileId: string,
  rawInput: unknown,
): Promise<Result<JobRecord>> {
  try {
    return await deps.db.transaction(async (tx) => {
      const inner = { ...deps, db: tx as unknown as Database };
      const job = await saveJob(inner, profileId, rawInput);
      if (!job.ok) return job;
      const application = await createApplication(inner, profileId, { jobId: job.value.id });
      if (!application.ok) throw new RolledBack(application);
      return job;
    });
  } catch (error) {
    if (error instanceof RolledBack) return error.result;
    throw error;
  }
}
