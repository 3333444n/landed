/*
 * Use cases. Each one validates input, applies rules, and writes inside a transaction.
 * Dependencies arrive as a parameter; nothing here is a singleton.
 */
import { DatabaseError } from "pg";
import type { Database } from "@/infrastructure/database";
import {
  achievementInput,
  createProfileInput,
  educationInput,
  employmentInput,
  fieldErrorsFromZod,
  projectInput,
  skillInput,
  updateProfileInput,
  type FieldErrors,
  type ProfileError,
  type Result,
} from "./contracts";
import * as repo from "./repository";
import { contextLinkErrors, monthDateErrors, normalizeSkillName, reviewedAfterEdit } from "./rules";
import type { ProfilePreferences } from "./schema";

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
const notFound = (what: string): Result<never> =>
  fail({ kind: "not_found", message: `${what} not found` });
const stale = (): Result<never> =>
  fail({
    kind: "stale",
    message: "This record changed since you opened it. Reload to see the latest version.",
  });

// Profile

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

export async function updateProfile(
  deps: ProfileDeps,
  profileId: string,
  rawInput: unknown,
): Promise<Result<repo.ProfileRecord>> {
  const parsed = updateProfileInput.safeParse(rawInput);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  const input = parsed.data;
  const preferences: ProfilePreferences = {
    desiredRoles: input.desiredRoles,
    locations: input.locations,
    workArrangement: input.workArrangement,
    ...(input.constraints ? { constraints: input.constraints } : {}),
  };
  try {
    return await deps.db.transaction(async (tx) => {
      const current = await repo.findProfileById(tx, profileId);
      if (!current) return notFound("Profile");
      const updated = await repo.updateProfile(
        tx,
        profileId,
        {
          displayName: input.displayName,
          headline: input.headline ?? null,
          summary: input.summary ?? null,
          email: input.email ?? null,
          phone: input.phone ?? null,
          location: input.location ?? null,
          preferences,
          updatedAt: now(deps),
        },
        expected(input.expectedUpdatedAt),
      );
      return updated ? { ok: true as const, value: updated } : stale();
    });
  } catch (error) {
    return mapDatabaseError(error, async () => null);
  }
}

// Employment

export async function listEmployment(deps: ProfileDeps, profileId: string) {
  return repo.listOwned(deps.db, repo.ownedTables.employment, profileId);
}

export async function getEmployment(deps: ProfileDeps, profileId: string, id: string) {
  return repo.findOwned(deps.db, repo.ownedTables.employment, profileId, id);
}

export async function saveEmployment(
  deps: ProfileDeps,
  profileId: string,
  rawInput: unknown,
  existingId?: string,
): Promise<Result<repo.EmploymentRecord>> {
  const parsed = employmentInput.safeParse(rawInput);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  const input = parsed.data;
  const dateErrors = monthDateErrors(input);
  if (Object.keys(dateErrors).length > 0) return validation(dateErrors);

  const values = {
    employerName: input.employerName,
    role: input.role,
    startYear: input.startYear ?? null,
    startMonth: input.startMonth ?? null,
    endYear: input.endYear ?? null,
    endMonth: input.endMonth ?? null,
    isCurrent: input.isCurrent,
    description: input.description ?? null,
  };
  return saveOwned(deps, repo.ownedTables.employment, "Employment", profileId, {
    id: existingId,
    clientId: input.id,
    expectedUpdatedAt: input.expectedUpdatedAt,
    values,
  });
}

export async function deleteEmployment(
  deps: ProfileDeps,
  profileId: string,
  id: string,
): Promise<Result<void>> {
  const dependents = await repo.countEmploymentDependents(deps.db, profileId, id);
  if (dependents.projects > 0 || dependents.achievements > 0) {
    return fail({
      kind: "conflict",
      message: `Detach the ${describeDependents(dependents)} that reference this role before deleting it`,
    });
  }
  return deleteOwned(deps, repo.ownedTables.employment, "Employment", profileId, id);
}

// Education

export async function listEducation(deps: ProfileDeps, profileId: string) {
  return repo.listOwned(deps.db, repo.ownedTables.education, profileId);
}

export async function getEducation(deps: ProfileDeps, profileId: string, id: string) {
  return repo.findOwned(deps.db, repo.ownedTables.education, profileId, id);
}

export async function saveEducation(
  deps: ProfileDeps,
  profileId: string,
  rawInput: unknown,
  existingId?: string,
): Promise<Result<repo.EducationRecord>> {
  const parsed = educationInput.safeParse(rawInput);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  const input = parsed.data;
  const dateErrors = monthDateErrors(input);
  if (Object.keys(dateErrors).length > 0) return validation(dateErrors);

  const values = {
    institution: input.institution,
    qualification: input.qualification ?? null,
    subject: input.subject ?? null,
    startYear: input.startYear ?? null,
    startMonth: input.startMonth ?? null,
    endYear: input.endYear ?? null,
    endMonth: input.endMonth ?? null,
    status: input.status,
    description: input.description ?? null,
  };
  return saveOwned(deps, repo.ownedTables.education, "Education", profileId, {
    id: existingId,
    clientId: input.id,
    expectedUpdatedAt: input.expectedUpdatedAt,
    values,
  });
}

export async function deleteEducation(
  deps: ProfileDeps,
  profileId: string,
  id: string,
): Promise<Result<void>> {
  return deleteOwned(deps, repo.ownedTables.education, "Education", profileId, id);
}

// Projects

export async function listProjects(deps: ProfileDeps, profileId: string) {
  return repo.listOwned(deps.db, repo.ownedTables.projects, profileId);
}

export async function getProject(deps: ProfileDeps, profileId: string, id: string) {
  return repo.findOwned(deps.db, repo.ownedTables.projects, profileId, id);
}

export async function saveProject(
  deps: ProfileDeps,
  profileId: string,
  rawInput: unknown,
  existingId?: string,
): Promise<Result<repo.ProjectRecord>> {
  const parsed = projectInput.safeParse(rawInput);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  const input = parsed.data;
  const dateErrors = monthDateErrors(input);
  if (Object.keys(dateErrors).length > 0) return validation(dateErrors);

  if (
    input.employmentId &&
    !(await repo.employmentBelongsToProfile(deps.db, profileId, input.employmentId))
  ) {
    return validation({ employmentId: ["That role is not in your profile"] });
  }
  const values = {
    name: input.name,
    description: input.description ?? null,
    url: input.url ?? null,
    employmentId: input.employmentId ?? null,
    startYear: input.startYear ?? null,
    startMonth: input.startMonth ?? null,
    endYear: input.endYear ?? null,
    endMonth: input.endMonth ?? null,
  };
  return saveOwned(deps, repo.ownedTables.projects, "Project", profileId, {
    id: existingId,
    clientId: input.id,
    expectedUpdatedAt: input.expectedUpdatedAt,
    values,
  });
}

export async function deleteProject(
  deps: ProfileDeps,
  profileId: string,
  id: string,
): Promise<Result<void>> {
  const dependents = await repo.countProjectDependents(deps.db, profileId, id);
  if (dependents > 0) {
    return fail({
      kind: "conflict",
      message: `Detach the ${plural(dependents, "achievement")} that reference this project before deleting it`,
    });
  }
  return deleteOwned(deps, repo.ownedTables.projects, "Project", profileId, id);
}

// Skills

export async function listSkills(deps: ProfileDeps, profileId: string) {
  return repo.listOwned(deps.db, repo.ownedTables.skills, profileId);
}

export async function getSkill(deps: ProfileDeps, profileId: string, id: string) {
  return repo.findOwned(deps.db, repo.ownedTables.skills, profileId, id);
}

export async function saveSkill(
  deps: ProfileDeps,
  profileId: string,
  rawInput: unknown,
  existingId?: string,
): Promise<Result<repo.SkillRecord>> {
  const parsed = skillInput.safeParse(rawInput);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  const input = parsed.data;
  const values = {
    displayName: input.displayName,
    normalizedName: normalizeSkillName(input.displayName),
    category: input.category ?? null,
  };
  return saveOwned(deps, repo.ownedTables.skills, "Skill", profileId, {
    id: existingId,
    clientId: input.id,
    expectedUpdatedAt: input.expectedUpdatedAt,
    values,
    uniqueMessage: { displayName: ["You already have a skill with this name"] },
  });
}

export async function deleteSkill(
  deps: ProfileDeps,
  profileId: string,
  id: string,
): Promise<Result<void>> {
  return deleteOwned(deps, repo.ownedTables.skills, "Skill", profileId, id);
}

// Achievements

export async function listAchievements(
  deps: ProfileDeps,
  profileId: string,
): Promise<AchievementWithSkills[]> {
  const [rows, links] = await Promise.all([
    repo.listOwned(deps.db, repo.ownedTables.achievements, profileId),
    repo.listSkillLinks(deps.db, profileId),
  ]);
  return rows.map((row) => ({
    ...row,
    skillIds: links.filter((l) => l.achievementId === row.id).map((l) => l.skillId),
  }));
}

export async function getAchievement(
  deps: ProfileDeps,
  profileId: string,
  id: string,
): Promise<AchievementWithSkills | null> {
  const row = await repo.findOwned(deps.db, repo.ownedTables.achievements, profileId, id);
  if (!row) return null;
  return { ...row, skillIds: await repo.listSkillIdsForAchievement(deps.db, profileId, id) };
}

/**
 * Saves an achievement and its skill links in one transaction (docs/02 aggregate rule).
 * Context links and skills must belong to the same profile; the database enforces the same
 * rule through owner-aware foreign keys, so a race still cannot produce a cross-profile link.
 * Achievements are edited in place; editing the statement clears the reviewed flag (docs/04).
 */
export async function createAchievement(
  deps: ProfileDeps,
  profileId: string,
  rawInput: unknown,
): Promise<Result<AchievementWithSkills>> {
  return saveAchievement(deps, profileId, rawInput);
}

export async function updateAchievement(
  deps: ProfileDeps,
  profileId: string,
  id: string,
  rawInput: unknown,
): Promise<Result<AchievementWithSkills>> {
  return saveAchievement(deps, profileId, rawInput, id);
}

async function saveAchievement(
  deps: ProfileDeps,
  profileId: string,
  rawInput: unknown,
  existingId?: string,
): Promise<Result<AchievementWithSkills>> {
  const parsed = achievementInput.safeParse(rawInput);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  const input = parsed.data;

  const ruleErrors = contextLinkErrors(input);
  if (Object.keys(ruleErrors).length > 0) return validation(ruleErrors);

  const id = existingId ?? input.id ?? newId(deps);
  const skillIds = [...new Set(input.skillIds)];

  try {
    return await deps.db.transaction(async (tx) => {
      const profile = await repo.findProfileById(tx, profileId);
      if (!profile) return notFound("Profile");

      if (
        input.employmentId &&
        !(await repo.employmentBelongsToProfile(tx, profileId, input.employmentId))
      ) {
        return validation({ employmentId: ["That role is not in your profile"] });
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

      const values = {
        employmentId: input.employmentId ?? null,
        projectId: input.projectId ?? null,
        statement: input.statement,
        problem: input.problem ?? null,
        action: input.action ?? null,
        result: input.result ?? null,
        metric: input.metric ?? null,
        sourceNote: input.sourceNote ?? null,
        sourceUrl: input.sourceUrl ?? null,
      };

      if (existingId) {
        const current = await repo.findOwned(tx, repo.ownedTables.achievements, profileId, id);
        if (!current) return notFound("Achievement");
        const updated = await repo.updateOwned(
          tx,
          repo.ownedTables.achievements,
          profileId,
          id,
          { ...values, reviewed: reviewedAfterEdit(current, input), updatedAt: now(deps) },
          expected(input.expectedUpdatedAt),
        );
        if (!updated) return stale();
        await repo.replaceAchievementSkills(tx, profileId, id, skillIds);
        return { ok: true as const, value: { ...updated, skillIds } };
      }

      const created = await repo.insertOwned(tx, repo.ownedTables.achievements, {
        id,
        profileId,
        ...values,
        reviewed: false,
        ...stamps(deps),
      });
      await repo.insertAchievementSkills(tx, profileId, id, skillIds);
      return { ok: true as const, value: { ...created, skillIds } };
    });
  } catch (error) {
    return mapDatabaseError(error, async () => {
      // A retry after a lost response: the first attempt already committed this id.
      const existing = await getAchievement(deps, profileId, id);
      return existing ? { ok: true as const, value: existing } : null;
    });
  }
}

/** Deleting an achievement removes only its skill joins, never the skills (docs/04). */
export async function deleteAchievement(
  deps: ProfileDeps,
  profileId: string,
  id: string,
): Promise<Result<void>> {
  return deleteOwned(deps, repo.ownedTables.achievements, "Achievement", profileId, id);
}

// Shared helpers

type OwnedTable = (typeof repo.ownedTables)[keyof typeof repo.ownedTables];

interface SaveOptions<TValues> {
  id: string | undefined;
  clientId: string | undefined;
  expectedUpdatedAt: string | undefined;
  values: TValues;
  /** Field errors to report when a unique constraint other than the primary key fires. */
  uniqueMessage?: FieldErrors;
}

/** Create or update one owned record: replay on a duplicate id, stale check on update. */
async function saveOwned<T extends OwnedTable>(
  deps: ProfileDeps,
  owned: T,
  label: string,
  profileId: string,
  options: SaveOptions<Record<string, unknown>>,
): Promise<Result<T["table"]["$inferSelect"]>> {
  const id = options.id ?? options.clientId ?? newId(deps);
  try {
    return await deps.db.transaction(async (tx) => {
      const profile = await repo.findProfileById(tx, profileId);
      if (!profile) return notFound("Profile");
      if (options.id) {
        const current = await repo.findOwned(tx, owned, profileId, id);
        if (!current) return notFound(label);
        const updated = await repo.updateOwned(
          tx,
          owned,
          profileId,
          id,
          { ...options.values, updatedAt: now(deps) } as Partial<T["table"]["$inferInsert"]>,
          expected(options.expectedUpdatedAt),
        );
        return updated ? { ok: true as const, value: updated } : stale();
      }
      const created = await repo.insertOwned(tx, owned, {
        id,
        profileId,
        ...options.values,
        ...stamps(deps),
      } as T["table"]["$inferInsert"]);
      return { ok: true as const, value: created };
    });
  } catch (error) {
    return mapDatabaseError(
      error,
      async () => {
        const existing = await repo.findOwned(deps.db, owned, profileId, id);
        return existing ? { ok: true as const, value: existing } : null;
      },
      options.uniqueMessage,
    );
  }
}

async function deleteOwned(
  deps: ProfileDeps,
  owned: OwnedTable,
  label: string,
  profileId: string,
  id: string,
): Promise<Result<void>> {
  try {
    const deleted = await repo.deleteOwned(deps.db, owned, profileId, id);
    return deleted ? { ok: true, value: undefined } : notFound(label);
  } catch (error) {
    return mapDatabaseError(error, async () => null);
  }
}

function newId(deps: ProfileDeps): string {
  return deps.newId ? deps.newId() : crypto.randomUUID();
}

function now(deps: ProfileDeps): Date {
  return deps.now ? deps.now() : new Date();
}

function stamps(deps: ProfileDeps) {
  const at = now(deps);
  return { createdAt: at, updatedAt: at };
}

function expected(iso: string | undefined): Date | undefined {
  return iso ? new Date(iso) : undefined;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function describeDependents(d: { projects: number; achievements: number }): string {
  const parts: string[] = [];
  if (d.projects > 0) parts.push(plural(d.projects, "project"));
  if (d.achievements > 0) parts.push(plural(d.achievements, "achievement"));
  return parts.join(" and ");
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
  uniqueMessage?: FieldErrors,
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
      if (uniqueMessage) return validation(uniqueMessage);
      return fail({ kind: "conflict", message: "A record with the same value already exists" });
    }
    if (error.code === "23503") {
      return fail({
        kind: "conflict",
        message: "Other records still reference this one; detach them first",
      });
    }
    if (error.code === "23514") {
      return validation({ form: ["The record violates a data rule and was not saved"] });
    }
  }
  throw thrown;
}
