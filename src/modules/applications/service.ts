/*
 * Use cases for pursuits. Applications stores a job id it received from the caller and never
 * imports the Jobs module's internals; the database's owner-aware foreign key checks the link.
 */
import { fieldErrorsFromZod, type Result } from "@/modules/shared/contracts";
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
import { createApplicationInput, updateApplicationInput, updateInterestInput } from "./contracts";
import * as repo from "./repository";
import { submittedAtAfter } from "./rules";

export type ApplicationsDeps = BaseDeps;

export async function listApplications(
  deps: ApplicationsDeps,
  profileId: string,
): Promise<repo.ApplicationRecord[]> {
  return repo.listApplications(deps.db, profileId);
}

export async function getApplicationForJob(
  deps: ApplicationsDeps,
  profileId: string,
  jobId: string,
): Promise<repo.ApplicationRecord | null> {
  return repo.findApplicationForJob(deps.db, profileId, jobId);
}

/**
 * Creates the pursuit for a job in `preparing`. A repeat for the same job (a replayed paste)
 * returns the existing application instead of failing on the unique (profile_id, job_id) key.
 */
export async function createApplication(
  deps: ApplicationsDeps,
  profileId: string,
  rawInput: unknown,
): Promise<Result<repo.ApplicationRecord>> {
  const parsed = createApplicationInput.safeParse(rawInput);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  const input = parsed.data;
  const id = input.id ?? newId(deps);

  try {
    return await deps.db.transaction(async (tx) => {
      const existing = await repo.findApplicationForJob(tx, profileId, input.jobId);
      if (existing) return { ok: true as const, value: existing };
      const created = await repo.insertApplication(tx, {
        id,
        profileId,
        jobId: input.jobId,
        status: "preparing",
        ...stamps(deps),
      });
      return { ok: true as const, value: created };
    });
  } catch (error) {
    return mapDatabaseError(error, async () => {
      const existing = await repo.findApplication(deps.db, profileId, id);
      return existing ? { ok: true as const, value: existing } : null;
    });
  }
}

/** Any status may be chosen; the submission time is set on the first entry to `applied` (docs/01). */
export async function updateApplication(
  deps: ApplicationsDeps,
  profileId: string,
  id: string,
  rawInput: unknown,
): Promise<Result<repo.ApplicationRecord>> {
  const parsed = updateApplicationInput.safeParse(rawInput);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  const input = parsed.data;

  try {
    return await deps.db.transaction(async (tx) => {
      const current = await repo.findApplication(tx, profileId, id);
      if (!current) return notFound("Application");
      const at = new Date(Math.max(now(deps).getTime(), current.updatedAt.getTime() + 1));
      const updated = await repo.updateApplication(
        tx,
        profileId,
        id,
        {
          status: input.status,
          notes: input.notes ?? null,
          submittedAt: submittedAtAfter(current, input.status, at),
          updatedAt: at,
        },
        expected(input.expectedUpdatedAt),
      );
      return updated ? { ok: true as const, value: updated } : stale();
    });
  } catch (error) {
    return mapDatabaseError(error, async () => null);
  }
}

/** Change only the user's reason for pursuing this application. */
export async function updateInterest(
  deps: ApplicationsDeps,
  profileId: string,
  id: string,
  rawInput: unknown,
): Promise<Result<repo.ApplicationRecord>> {
  const parsed = updateInterestInput.safeParse(rawInput);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  try {
    return await deps.db.transaction(async (tx) => {
      const current = await repo.findApplication(tx, profileId, id);
      if (!current) return notFound("Application");
      const updated = await repo.updateApplication(
        tx,
        profileId,
        id,
        {
          interest: parsed.data.interest,
          updatedAt: new Date(Math.max(now(deps).getTime(), current.updatedAt.getTime() + 1)),
        },
        new Date(parsed.data.expectedUpdatedAt),
      );
      return updated ? { ok: true as const, value: updated } : stale();
    });
  } catch (error) {
    return mapDatabaseError(error, async () => null);
  }
}
