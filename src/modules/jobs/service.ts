/*
 * Use cases for postings. Each one validates input and writes inside a transaction; the
 * transaction nests as a savepoint when the caller already passes a transaction handle, which is
 * how the paste-and-pursue composition in src/app writes a job and its application together.
 */
import {
  expected,
  mapDatabaseError,
  newId,
  notFound,
  now,
  stale,
  stamps,
  validation,
  type BaseDeps,
} from "@/modules/shared/service";
import { fieldErrorsFromZod, type Result } from "@/modules/shared/contracts";
import { jobInput } from "./contracts";
import * as repo from "./repository";

export type JobsDeps = BaseDeps;

export async function listJobs(deps: JobsDeps, profileId: string): Promise<repo.JobRecord[]> {
  return repo.listJobs(deps.db, profileId);
}

export async function getJob(
  deps: JobsDeps,
  profileId: string,
  id: string,
): Promise<repo.JobRecord | null> {
  return repo.findJob(deps.db, profileId, id);
}

/** Create or update one job: replay on a duplicate client-minted id, stale check on update. */
export async function saveJob(
  deps: JobsDeps,
  profileId: string,
  rawInput: unknown,
  existingId?: string,
): Promise<Result<repo.JobRecord>> {
  const parsed = jobInput.safeParse(rawInput);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  const input = parsed.data;
  const id = existingId ?? input.id ?? newId(deps);
  const values = {
    title: input.title,
    companyName: input.companyName,
    location: input.location ?? null,
    salary: input.salary ?? null,
    sourceUrl: input.sourceUrl ?? null,
    rawDescription: input.rawDescription,
    availability: input.availability,
  };

  try {
    return await deps.db.transaction(async (tx) => {
      // The profile_id foreign key backs ownership; the route already resolved the profile.
      if (existingId) {
        const current = await repo.findJob(tx, profileId, id);
        if (!current) return notFound("Job");
        const updated = await repo.updateJob(
          tx,
          profileId,
          id,
          { ...values, updatedAt: now(deps) },
          expected(input.expectedUpdatedAt),
        );
        return updated ? { ok: true as const, value: updated } : stale();
      }
      const created = await repo.insertJob(tx, {
        id,
        profileId,
        source: "pasted",
        ...values,
        ...stamps(deps),
      });
      return { ok: true as const, value: created };
    });
  } catch (error) {
    return mapDatabaseError(error, async () => {
      const existing = await repo.findJob(deps.db, profileId, id);
      return existing ? { ok: true as const, value: existing } : null;
    });
  }
}

/** Deleting a job also deletes its application (ON DELETE CASCADE); the interface confirms first. */
export async function deleteJob(
  deps: JobsDeps,
  profileId: string,
  id: string,
): Promise<Result<void>> {
  try {
    const deleted = await repo.deleteJob(deps.db, profileId, id);
    return deleted ? { ok: true, value: undefined } : notFound("Job");
  } catch (error) {
    return mapDatabaseError(error, async () => null);
  }
}
