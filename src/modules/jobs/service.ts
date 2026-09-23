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
import {
  createJobSourceInput,
  updateJobSourceInput,
  updateJobSourceLinkInput,
  jobInput,
  jobCompanyInput,
  findingSelectionInput,
  type StoredLogo,
} from "./contracts";
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
    ...(input.companyId !== undefined ? { companyId: input.companyId } : {}),
    location: input.location ?? null,
    salary: input.salary ?? null,
    sourceUrl: input.sourceUrl ?? null,
    ...(input.jobSourceId !== undefined ? { jobSourceId: input.jobSourceId } : {}),
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
      if (!existingId) {
        const replay = await repo.findJob(tx, profileId, id);
        if (replay) return { ok: true as const, value: replay };
      }
      const currentSourceJob = existingId ? await repo.findJob(tx, profileId, id) : null;
      if (input.jobSourceId) {
        const source = await repo.findJobSource(tx, profileId, input.jobSourceId);
        if (!source || (source.archived && currentSourceJob?.jobSourceId !== source.id))
          return validation({ jobSourceId: ["Choose an active source from your Job Sources"] });
      }
      if (
        rawInput &&
        typeof rawInput === "object" &&
        "jobSourceId" in rawInput &&
        !input.jobSourceId
      )
        Object.assign(values, { jobSourceId: null });
      // The profile_id foreign key backs ownership; the route already resolved the profile.
      if (existingId) {
        const current = await repo.lockJob(tx, profileId, id);
        if (!current) return notFound("Job");
        if (input.expectedUpdatedAt && current.updatedAt.toISOString() !== input.expectedUpdatedAt)
          return stale();
        if (input.companyId !== undefined && input.companyId !== current.companyId)
          await repo.clearFindingSelection(tx, profileId, id);
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

export async function listJobSources(deps: JobsDeps, profileId: string) {
  return repo.listJobSources(deps.db, profileId);
}
export async function getJobSource(deps: JobsDeps, profileId: string, id: string) {
  return repo.findJobSource(deps.db, profileId, id);
}
export async function createJobSource(
  deps: JobsDeps,
  profileId: string,
  raw: unknown,
): Promise<Result<repo.JobSourceRecord>> {
  const parsed = createJobSourceInput.safeParse(raw);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  try {
    return await deps.db.transaction(async (tx) => {
      const prior = await repo.findJobSource(tx, profileId, parsed.data.id);
      if (prior) return { ok: true, value: prior };
      return {
        ok: true,
        value: await repo.insertJobSource(tx, { ...parsed.data, profileId, ...stamps(deps) }),
      };
    });
  } catch (error) {
    return mapDatabaseError(error, async () => {
      const prior = await repo.findJobSource(deps.db, profileId, parsed.data.id);
      return prior ? { ok: true, value: prior } : null;
    });
  }
}
export async function updateJobSource(
  deps: JobsDeps,
  profileId: string,
  id: string,
  raw: unknown,
): Promise<Result<repo.JobSourceRecord>> {
  const parsed = updateJobSourceInput.safeParse(raw);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  try {
    return await deps.db.transaction(async (tx) => {
      const current = await repo.findJobSource(tx, profileId, id);
      if (!current) return notFound("Source");
      const { expectedUpdatedAt, ...patch } = parsed.data;
      const value = await repo.updateJobSource(tx, profileId, id, new Date(expectedUpdatedAt), {
        ...patch,
        updatedAt: now(deps),
      });
      return value ? { ok: true, value } : stale();
    });
  } catch (error) {
    return mapDatabaseError(error, async () => null);
  }
}
export async function updateJobSourceLink(
  deps: JobsDeps,
  profileId: string,
  id: string,
  raw: unknown,
): Promise<Result<repo.JobRecord>> {
  const parsed = updateJobSourceLinkInput.safeParse(raw);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  try {
    return await deps.db.transaction(async (tx) => {
      const current = await repo.findJob(tx, profileId, id);
      if (!current) return notFound("Job");
      if (parsed.data.jobSourceId) {
        const source = await repo.findJobSource(tx, profileId, parsed.data.jobSourceId);
        if (!source || (source.archived && current.jobSourceId !== source.id))
          return validation({ jobSourceId: ["Choose an active source from your Job Sources"] });
      }
      const value = await repo.updateJob(
        tx,
        profileId,
        id,
        {
          jobSourceId: parsed.data.jobSourceId,
          updatedAt: new Date(Math.max(now(deps).getTime(), current.updatedAt.getTime() + 1)),
        },
        new Date(parsed.data.expectedUpdatedAt),
      );
      return value ? { ok: true, value } : stale();
    });
  } catch (error) {
    return mapDatabaseError(error, async () => null);
  }
}
export const getSelectedFindingIds = (deps: JobsDeps, profileId: string, jobId: string) =>
  repo.selectedFindingIds(deps.db, profileId, jobId);
export const invalidateJobsForFinding = (deps: JobsDeps, profileId: string, findingId: string) =>
  repo.invalidateFindingJobs(deps.db, profileId, findingId, now(deps));
export async function updateJobCompany(
  deps: JobsDeps,
  profileId: string,
  jobId: string,
  raw: unknown,
): Promise<Result<repo.JobRecord>> {
  const parsed = jobCompanyInput.safeParse(raw);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  try {
    return await deps.db.transaction(async (tx) => {
      const job = await repo.lockJob(tx, profileId, jobId);
      if (!job) return notFound("Job");
      if (job.updatedAt.toISOString() !== parsed.data.expectedUpdatedAt) return stale();
      if (job.companyId !== parsed.data.companyId)
        await repo.clearFindingSelection(tx, profileId, jobId);
      const updated = await repo.updateJob(
        tx,
        profileId,
        jobId,
        { companyId: parsed.data.companyId, updatedAt: now(deps) },
        new Date(parsed.data.expectedUpdatedAt),
      );
      return updated ? { ok: true as const, value: updated } : stale();
    });
  } catch (e) {
    return mapDatabaseError(e, async () => null);
  }
}
export async function setJobFindingSelection(
  deps: JobsDeps,
  profileId: string,
  jobId: string,
  raw: unknown,
): Promise<Result<repo.JobRecord>> {
  const parsed = findingSelectionInput.safeParse(raw);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  try {
    return await deps.db.transaction(async (tx) => {
      const job = await repo.lockJob(tx, profileId, jobId);
      if (!job) return notFound("Job");
      if (job.updatedAt.toISOString() !== parsed.data.expectedUpdatedAt) return stale();
      if (!job.companyId && parsed.data.findingIds.length)
        return validation({ findingIds: ["Link a company before selecting findings"] });
      if (job.companyId)
        await repo.replaceFindingSelection(
          tx,
          profileId,
          jobId,
          job.companyId,
          parsed.data.findingIds,
        );
      const updated = await repo.updateJob(
        tx,
        profileId,
        jobId,
        { updatedAt: now(deps) },
        new Date(parsed.data.expectedUpdatedAt),
      );
      return updated ? { ok: true as const, value: updated } : stale();
    });
  } catch (e) {
    return mapDatabaseError(e, async () => null);
  }
}
