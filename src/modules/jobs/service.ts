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
import { jobInput, type StoredLogo } from "./contracts";
import { removeLogoFile } from "./logo";
import * as repo from "./repository";

/** `artifactDir` lets a replaced or deleted logo's file be removed; without it the file stays. */
export type JobsDeps = BaseDeps & { artifactDir?: string };

/** A stored logo sets the job's logo, null clears it, undefined leaves it as it is. */
export type LogoChange = StoredLogo | null | undefined;

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
  logo?: LogoChange,
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
  const logoValues =
    logo === undefined
      ? {}
      : { logoStorageKey: logo?.storageKey ?? null, logoContentType: logo?.contentType ?? null };

  let replaced: string | null = null;
  try {
    const result = await deps.db.transaction(async (tx) => {
      // The profile_id foreign key backs ownership; the route already resolved the profile.
      if (existingId) {
        const current = await repo.findJob(tx, profileId, id);
        if (!current) return notFound("Job");
        const updated = await repo.updateJob(
          tx,
          profileId,
          id,
          { ...values, ...logoValues, updatedAt: now(deps) },
          expected(input.expectedUpdatedAt),
        );
        if (!updated) return stale();
        replaced = current.logoStorageKey;
        return { ok: true as const, value: updated };
      }
      const created = await repo.insertJob(tx, {
        id,
        profileId,
        source: "pasted",
        ...values,
        ...logoValues,
        ...stamps(deps),
      });
      return { ok: true as const, value: created };
    });
    // The row no longer points at the old file: remove it after the commit, best effort (docs/04).
    if (result.ok && replaced && replaced !== result.value.logoStorageKey && deps.artifactDir) {
      await removeLogoFile(deps.artifactDir, replaced);
    }
    return result;
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
    const current = await repo.findJob(deps.db, profileId, id);
    const deleted = await repo.deleteJob(deps.db, profileId, id);
    if (!deleted) return notFound("Job");
    if (current?.logoStorageKey && deps.artifactDir) {
      await removeLogoFile(deps.artifactDir, current.logoStorageKey);
    }
    return { ok: true, value: undefined };
  } catch (error) {
    return mapDatabaseError(error, async () => null);
  }
}
