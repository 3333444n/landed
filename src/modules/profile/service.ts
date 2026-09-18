/*
 * Use cases. Each one validates input, applies rules, and writes inside a transaction.
 * Dependencies arrive as a parameter; nothing here is a singleton.
 */
import { z } from "zod";
import {
  expected,
  fail,
  mapDatabaseError,
  newId,
  notFound,
  now,
  plural,
  stale,
  stamps,
  validation,
  type BaseDeps,
} from "@/modules/shared/service";
import {
  achievementInput,
  profilePatchInput,
  employmentPatchInput,
  educationPatchInput,
  projectPatchInput,
  skillPatchInput,
  achievementPatchInput,
  profileLinkLabels,
  createProfileInput,
  educationInput,
  employmentInput,
  fieldErrorsFromZod,
  projectInput,
  skillInput,
  updateProfileInput,
  type FieldErrors,
  type Result,
} from "./contracts";
import * as repo from "./repository";
import { contextLinkErrors, monthDateErrors, normalizeSkillName, reviewedAfterEdit } from "./rules";
import type { ProfileLinkRecord, ProfilePreferences } from "./schema";

export type ProfileDeps = BaseDeps;

export interface AchievementWithSkills extends repo.AchievementRecord {
  skillIds: string[];
}

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
      await repo.lockProfileCreation(tx);
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
  const links: ProfileLinkRecord[] = [];
  if (input.linkedinUrl) links.push({ label: "LinkedIn", url: input.linkedinUrl });
  if (input.githubUrl) links.push({ label: "GitHub", url: input.githubUrl });
  if (input.websiteUrl) links.push({ label: "Website", url: input.websiteUrl });
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
          links,
          updatedAt: nextVersion(deps, current.updatedAt),
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
    location: input.location ?? null,
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
  expectedUpdatedAt?: string,
): Promise<Result<void>> {
  const dependents = await repo.countEmploymentDependents(deps.db, profileId, id);
  if (dependents.projects > 0 || dependents.achievements > 0) {
    return fail({
      kind: "conflict",
      message: `Detach the ${describeDependents(dependents)} that reference this role before deleting it`,
    });
  }
  return deleteOwned(
    deps,
    repo.ownedTables.employment,
    "Employment",
    profileId,
    id,
    expectedUpdatedAt,
  );
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
  expectedUpdatedAt?: string,
): Promise<Result<void>> {
  return deleteOwned(
    deps,
    repo.ownedTables.education,
    "Education",
    profileId,
    id,
    expectedUpdatedAt,
  );
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
  expectedUpdatedAt?: string,
): Promise<Result<void>> {
  const dependents = await repo.countProjectDependents(deps.db, profileId, id);
  if (dependents > 0) {
    return fail({
      kind: "conflict",
      message: `Detach the ${plural(dependents, "achievement")} that reference this project before deleting it`,
    });
  }
  return deleteOwned(deps, repo.ownedTables.projects, "Project", profileId, id, expectedUpdatedAt);
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
  expectedUpdatedAt?: string,
): Promise<Result<void>> {
  return deleteOwned(deps, repo.ownedTables.skills, "Skill", profileId, id, expectedUpdatedAt);
}

// Achievements

export async function listAchievements(
  deps: ProfileDeps,
  profileId: string,
): Promise<AchievementWithSkills[]> {
  return repo.listAchievementsWithSkills(deps.db, profileId);
}

export async function getAchievement(
  deps: ProfileDeps,
  profileId: string,
  id: string,
): Promise<AchievementWithSkills | null> {
  const rows = await repo.listAchievementsWithSkills(deps.db, profileId, id);
  return rows[0] ?? null;
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
      await repo.lockAchievementSkills(tx, profileId);
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
          {
            ...values,
            reviewed: reviewedAfterEdit(current, input),
            updatedAt: nextVersion(deps, current.updatedAt),
          },
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
  expectedUpdatedAt?: string,
): Promise<Result<void>> {
  return deleteOwned(
    deps,
    repo.ownedTables.achievements,
    "Achievement",
    profileId,
    id,
    expectedUpdatedAt,
  );
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
          { ...options.values, updatedAt: nextVersion(deps, current.updatedAt) } as Partial<
            T["table"]["$inferInsert"]
          >,
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
  expectedUpdatedAt?: string,
): Promise<Result<void>> {
  if (expectedUpdatedAt !== undefined && !z.iso.datetime().safeParse(expectedUpdatedAt).success) {
    return validation({ expectedUpdatedAt: ["Supply a valid ISO timestamp"] });
  }
  try {
    return await deps.db.transaction(async (tx) => {
      if (owned === repo.ownedTables.skills || owned === repo.ownedTables.achievements) {
        await repo.lockAchievementSkills(tx, profileId);
      }
      const current = await repo.findOwned(tx, owned, profileId, id, true);
      if (!current) return notFound(label);
      if (
        expectedUpdatedAt &&
        current.updatedAt.getTime() !== new Date(expectedUpdatedAt).getTime()
      )
        return stale();
      if (owned === repo.ownedTables.skills) {
        await repo.touchAchievementsForSkill(tx, profileId, id, now(deps));
      }
      const deleted = await repo.deleteOwned(tx, owned, profileId, id, expected(expectedUpdatedAt));
      return deleted ? { ok: true as const, value: undefined } : stale();
    });
  } catch (error) {
    return mapDatabaseError(error, async () => null);
  }
}

/** A successful edit must always invalidate an earlier version, even within one millisecond. */
function nextVersion(deps: ProfileDeps, previous: Date): Date {
  return new Date(Math.max(now(deps).getTime(), previous.getTime() + 1));
}

function describeDependents(d: { projects: number; achievements: number }): string {
  const parts: string[] = [];
  if (d.projects > 0) parts.push(plural(d.projects, "project"));
  if (d.achievements > 0) parts.push(plural(d.achievements, "achievement"));
  return parts.join(" and ");
}

// Partial edits reuse the full-save rules after merging with the transaction's current record.
export async function patchProfile(
  deps: ProfileDeps,
  profileId: string,
  rawInput: unknown,
): Promise<Result<repo.ProfileRecord>> {
  const parsed = profilePatchInput.safeParse(rawInput);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  const {
    expectedUpdatedAt,
    desiredRoles,
    locations,
    workArrangement,
    constraints,
    linkedinUrl,
    githubUrl,
    websiteUrl,
    ...fields
  } = parsed.data;
  try {
    return await deps.db.transaction(async (tx) => {
      const current = await repo.findProfileById(tx, profileId);
      if (!current) return notFound("Profile");
      const preferences = { ...current.preferences };
      if (desiredRoles !== undefined) preferences.desiredRoles = desiredRoles;
      if (locations !== undefined) preferences.locations = locations;
      if (workArrangement !== undefined) preferences.workArrangement = workArrangement;
      if (constraints === null) delete preferences.constraints;
      else if (constraints !== undefined) preferences.constraints = constraints;
      let links = [...current.links];
      for (const [key, value] of Object.entries({ linkedinUrl, githubUrl, websiteUrl })) {
        if (value === undefined) continue;
        const label = profileLinkLabels[key as keyof typeof profileLinkLabels];
        links = links.filter((link) => link.label !== label);
        if (value !== null) links.push({ label, url: value });
      }
      const updated = await repo.updateProfile(
        tx,
        profileId,
        {
          ...definedFields(fields),
          preferences,
          links,
          updatedAt: nextVersion(deps, current.updatedAt),
        },
        new Date(expectedUpdatedAt),
      );
      return updated ? { ok: true as const, value: updated } : stale();
    });
  } catch (error) {
    return mapDatabaseError(error, async () => null);
  }
}

function definedFields(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
}

async function patchRecord<T extends { updatedAt: Date }>(
  deps: ProfileDeps,
  profileId: string,
  id: string,
  rawInput: unknown,
  schema: z.ZodType<{ expectedUpdatedAt: string }>,
  read: (deps: ProfileDeps, profileId: string, id: string) => Promise<T | null>,
  save: (deps: ProfileDeps, profileId: string, input: unknown, id: string) => Promise<Result<T>>,
  label: string,
): Promise<Result<T>> {
  const parsed = schema.safeParse(rawInput);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  try {
    return await deps.db.transaction(async (tx) => {
      const transactionDeps = { ...deps, db: tx };
      const current = await read(transactionDeps, profileId, id);
      if (!current) return notFound(label);
      if (current.updatedAt.getTime() !== new Date(parsed.data.expectedUpdatedAt).getTime())
        return stale();
      const merged = { ...current, ...definedFields(parsed.data) };
      // Browser contracts interpret absent optional values as undefined, not null.
      const input = Object.fromEntries(
        Object.entries(merged).map(([key, value]) => [key, value === null ? undefined : value]),
      );
      return save(transactionDeps, profileId, input, id);
    });
  } catch (error) {
    return mapDatabaseError(error, async () => null);
  }
}

export function patchEmployment(deps: ProfileDeps, profileId: string, id: string, input: unknown) {
  return patchRecord(
    deps,
    profileId,
    id,
    input,
    employmentPatchInput,
    getEmployment,
    saveEmployment,
    "Role",
  );
}
export function patchEducation(deps: ProfileDeps, profileId: string, id: string, input: unknown) {
  return patchRecord(
    deps,
    profileId,
    id,
    input,
    educationPatchInput,
    getEducation,
    saveEducation,
    "Education",
  );
}
export function patchProject(deps: ProfileDeps, profileId: string, id: string, input: unknown) {
  return patchRecord(
    deps,
    profileId,
    id,
    input,
    projectPatchInput,
    getProject,
    saveProject,
    "Project",
  );
}
export function patchSkill(deps: ProfileDeps, profileId: string, id: string, input: unknown) {
  return patchRecord(deps, profileId, id, input, skillPatchInput, getSkill, saveSkill, "Skill");
}
export function patchAchievement(deps: ProfileDeps, profileId: string, id: string, input: unknown) {
  return patchRecord(
    deps,
    profileId,
    id,
    input,
    achievementPatchInput,
    getAchievement,
    (transactionDeps, ownerId, merged, recordId) =>
      updateAchievement(transactionDeps, ownerId, recordId, merged),
    "Achievement",
  );
}
