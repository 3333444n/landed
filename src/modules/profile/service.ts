/*
 * Use cases. Each one validates input, applies rules, and writes inside a transaction.
 * Dependencies arrive as a parameter; nothing here is a singleton.
 */
import { DatabaseError } from "pg";
import type { Database } from "@/infrastructure/database";
import {
  createAchievementInput,
  createProfileInput,
  fieldErrorsFromZod,
  type FieldErrors,
  type ProfileError,
  type Result,
} from "./contracts";
import * as repo from "./repository";
import { contextLinkErrors } from "./rules";

export interface ProfileDeps {
  db: Database;
  now?: () => Date;
  newId?: () => string;
}

export interface AchievementWithSkills extends repo.AchievementRecord {
  skillIds: string[];
}

const fail = (error: ProfileError): Result<never> => ({ ok: false, error });
const validation = (fieldErrors: FieldErrors): Result<never> =>
  fail({ kind: "validation", fieldErrors });

/** Phase 0 keeps one profile per installation. Returns null on a blank installation. */
export async function getCurrentProfile(deps: ProfileDeps): Promise<repo.ProfileRecord | null> {
  return repo.findSingleProfile(deps.db);
}

export async function createProfile(
  deps: ProfileDeps,
  rawInput: unknown,
): Promise<Result<repo.ProfileRecord>> {
  const parsed = createProfileInput.safeParse(rawInput);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  const input = parsed.data;
  const id = input.id ?? newId(deps);

  try {
    return await deps.db.transaction(async (tx) => {
      const existing = await repo.findSingleProfile(tx);
      if (existing) {
        return existing.id === id
          ? { ok: true as const, value: existing }
          : fail({ kind: "conflict", message: "A profile already exists in this installation" });
      }
      const created = await repo.insertProfile(tx, {
        id,
        displayName: input.displayName,
        ...stamps(deps),
      });
      return { ok: true as const, value: created };
    });
  } catch (error) {
    return mapDatabaseError(error, async () => {
      const existing = await repo.findProfileById(deps.db, id);
      return existing ? { ok: true as const, value: existing } : null;
    });
  }
}

export async function listAchievements(
  deps: ProfileDeps,
  profileId: string,
): Promise<AchievementWithSkills[]> {
  const rows = await repo.listAchievements(deps.db, profileId);
  const withSkills = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      skillIds: await repo.listSkillIdsForAchievement(deps.db, profileId, row.id),
    })),
  );
  return withSkills;
}

/**
 * Saves an achievement and its skill links in one transaction (docs/02 aggregate rule).
 * Context links and skills must belong to the same profile; the database enforces the same
 * rule through owner-aware foreign keys, so a race still cannot produce a cross-profile link.
 */
export async function createAchievement(
  deps: ProfileDeps,
  profileId: string,
  rawInput: unknown,
): Promise<Result<AchievementWithSkills>> {
  const parsed = createAchievementInput.safeParse(rawInput);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  const input = parsed.data;

  const ruleErrors = contextLinkErrors(input);
  if (Object.keys(ruleErrors).length > 0) return validation(ruleErrors);

  const id = input.id ?? newId(deps);
  const skillIds = [...new Set(input.skillIds)];

  try {
    return await deps.db.transaction(async (tx) => {
      const profile = await repo.findProfileById(tx, profileId);
      if (!profile) return fail({ kind: "not_found", message: "Profile not found" });

      if (
        input.employmentId &&
        !(await repo.employmentBelongsToProfile(tx, profileId, input.employmentId))
      ) {
        return validation({ employmentId: ["That job is not in your profile"] });
      }
      if (
        input.projectId &&
        !(await repo.projectBelongsToProfile(tx, profileId, input.projectId))
      ) {
        return validation({ projectId: ["That project is not in your profile"] });
      }
      if ((await repo.countSkillsOwned(tx, profileId, skillIds)) !== skillIds.length) {
        return validation({ skillIds: ["One of the selected skills is not in your profile"] });
      }

      const created = await repo.insertAchievement(tx, {
        id,
        profileId,
        employmentId: input.employmentId ?? null,
        projectId: input.projectId ?? null,
        statement: input.statement,
        problem: input.problem ?? null,
        action: input.action ?? null,
        result: input.result ?? null,
        metric: input.metric ?? null,
        sourceNote: input.sourceNote ?? null,
        sourceUrl: input.sourceUrl ?? null,
        reviewed: false,
        ...stamps(deps),
      });
      await repo.insertAchievementSkills(tx, profileId, id, skillIds);
      return { ok: true as const, value: { ...created, skillIds } };
    });
  } catch (error) {
    return mapDatabaseError(error, async () => {
      // A retry after a lost response: the first attempt already committed this id.
      const existing = await repo.findAchievementById(deps.db, profileId, id);
      if (!existing) return null;
      const existingSkillIds = await repo.listSkillIdsForAchievement(deps.db, profileId, id);
      return { ok: true as const, value: { ...existing, skillIds: existingSkillIds } };
    });
  }
}

function newId(deps: ProfileDeps): string {
  return deps.newId ? deps.newId() : crypto.randomUUID();
}

function stamps(deps: ProfileDeps) {
  const now = deps.now ? deps.now() : new Date();
  return { createdAt: now, updatedAt: now };
}

/** Drizzle wraps driver errors; the PostgreSQL error sits in `cause`. */
function postgresError(error: unknown): DatabaseError | null {
  if (error instanceof DatabaseError) return error;
  if (error instanceof Error && error.cause instanceof DatabaseError) return error.cause;
  return null;
}

/** PostgreSQL error codes: 23505 unique, 23503 foreign key, 23514 check. */
async function mapDatabaseError<T>(
  thrown: unknown,
  onDuplicatePrimaryKey: () => Promise<Result<T> | null>,
): Promise<Result<T>> {
  const error = postgresError(thrown);
  if (error) {
    if (error.code === "23505" && error.constraint?.endsWith("_pkey")) {
      const replay = await onDuplicatePrimaryKey();
      if (replay) return replay;
      return fail({
        kind: "conflict",
        message: "This record id is already used by another record",
      });
    }
    if (error.code === "23505") {
      return fail({ kind: "conflict", message: "A record with the same value already exists" });
    }
    if (error.code === "23503") {
      return validation({ form: ["A linked record does not belong to this profile"] });
    }
    if (error.code === "23514") {
      return validation({ form: ["The record violates a data rule and was not saved"] });
    }
  }
  throw thrown;
}
