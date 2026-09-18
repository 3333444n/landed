/*
 * Drizzle queries for Profile-owned tables. Functions take a database or transaction handle so a
 * use case can compose several of them inside one transaction. No rules live here.
 *
 * Every owned table shares the same shape (id, profile_id, updated_at), so the CRUD helpers are
 * written once over a small descriptor and reused per table.
 */
import { and, asc, desc, eq, getTableColumns, inArray, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { DbHandle } from "@/infrastructure/database";
import {
  achievementSkills,
  achievements,
  education,
  employment,
  profiles,
  projects,
  skills,
} from "./schema";

export type ProfileRecord = typeof profiles.$inferSelect;
export type EmploymentRecord = typeof employment.$inferSelect;
export type EducationRecord = typeof education.$inferSelect;
export type ProjectRecord = typeof projects.$inferSelect;
export type AchievementRecord = typeof achievements.$inferSelect;
export type SkillRecord = typeof skills.$inferSelect;

export interface Owned<T extends PgTable = PgTable> {
  table: T;
  id: PgColumn;
  profileId: PgColumn;
  updatedAt: PgColumn;
  order: SQL[];
}

export const ownedTables = {
  employment: {
    table: employment,
    id: employment.id,
    profileId: employment.profileId,
    updatedAt: employment.updatedAt,
    order: [
      sql`${employment.isCurrent} desc`,
      sql`${employment.startYear} desc nulls last`,
      sql`${employment.startMonth} desc nulls last`,
      sql`${employment.createdAt} desc`,
    ],
  },
  education: {
    table: education,
    id: education.id,
    profileId: education.profileId,
    updatedAt: education.updatedAt,
    order: [
      sql`${education.startYear} desc nulls last`,
      sql`${education.startMonth} desc nulls last`,
      sql`${education.createdAt} desc`,
    ],
  },
  projects: {
    table: projects,
    id: projects.id,
    profileId: projects.profileId,
    updatedAt: projects.updatedAt,
    order: [
      sql`${projects.startYear} desc nulls last`,
      sql`${projects.startMonth} desc nulls last`,
      sql`${projects.createdAt} desc`,
    ],
  },
  skills: {
    table: skills,
    id: skills.id,
    profileId: skills.profileId,
    updatedAt: skills.updatedAt,
    order: [asc(skills.normalizedName)],
  },
  achievements: {
    table: achievements,
    id: achievements.id,
    profileId: achievements.profileId,
    updatedAt: achievements.updatedAt,
    order: [desc(achievements.createdAt), desc(achievements.id)],
  },
} satisfies Record<string, Owned>;

type RowOf<O extends Owned> = O["table"]["$inferSelect"];
type InsertOf<O extends Owned> = O["table"]["$inferInsert"];

export async function listOwned<O extends Owned>(
  db: DbHandle,
  owned: O,
  profileId: string,
): Promise<RowOf<O>[]> {
  return db
    .select()
    .from(owned.table as PgTable)
    .where(eq(owned.profileId, profileId))
    .orderBy(...owned.order) as Promise<RowOf<O>[]>;
}

export async function findOwned<O extends Owned>(
  db: DbHandle,
  owned: O,
  profileId: string,
  id: string,
  lock = false,
): Promise<RowOf<O> | null> {
  const query = db
    .select()
    .from(owned.table as PgTable)
    .where(and(eq(owned.profileId, profileId), eq(owned.id, id)))
    .limit(1);
  const rows = (await (lock ? query.for("update") : query)) as RowOf<O>[];
  return rows[0] ?? null;
}

export async function insertOwned<O extends Owned>(
  db: DbHandle,
  owned: O,
  values: InsertOf<O>,
): Promise<RowOf<O>> {
  const rows = (await db
    .insert(owned.table as PgTable)
    .values(values as Record<string, unknown>)
    .returning()) as RowOf<O>[];
  return rows[0]!;
}

/**
 * Updates one owned row. When `expectedUpdatedAt` is given, the write only happens if the row
 * still carries that timestamp; a stale form from another tab then updates nothing.
 */
export async function updateOwned<O extends Owned>(
  db: DbHandle,
  owned: O,
  profileId: string,
  id: string,
  values: Partial<InsertOf<O>>,
  expectedUpdatedAt: Date | undefined,
): Promise<RowOf<O> | null> {
  const conditions = [eq(owned.profileId, profileId), eq(owned.id, id)];
  if (expectedUpdatedAt) conditions.push(eq(owned.updatedAt, expectedUpdatedAt));
  const rows = (await db
    .update(owned.table as PgTable)
    .set(values as Record<string, unknown>)
    .where(and(...conditions))
    .returning()) as RowOf<O>[];
  return rows[0] ?? null;
}

export async function deleteOwned(
  db: DbHandle,
  owned: Owned,
  profileId: string,
  id: string,
  expectedUpdatedAt?: Date,
): Promise<boolean> {
  const conditions = [eq(owned.profileId, profileId), eq(owned.id, id)];
  if (expectedUpdatedAt) conditions.push(eq(owned.updatedAt, expectedUpdatedAt));
  const rows = await db
    .delete(owned.table as PgTable)
    .where(and(...conditions))
    .returning({ id: owned.id });
  return rows.length === 1;
}

// Profile

export async function findSingleProfile(db: DbHandle): Promise<ProfileRecord | null> {
  const rows = await db.select().from(profiles).orderBy(asc(profiles.createdAt)).limit(1);
  return rows[0] ?? null;
}

export async function findProfileById(db: DbHandle, id: string): Promise<ProfileRecord | null> {
  const rows = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function insertProfile(
  db: DbHandle,
  values: typeof profiles.$inferInsert,
): Promise<ProfileRecord> {
  const rows = await db.insert(profiles).values(values).returning();
  return rows[0]!;
}

export async function updateProfile(
  db: DbHandle,
  id: string,
  values: Partial<typeof profiles.$inferInsert>,
  expectedUpdatedAt: Date | undefined,
): Promise<ProfileRecord | null> {
  const conditions = [eq(profiles.id, id)];
  if (expectedUpdatedAt) conditions.push(eq(profiles.updatedAt, expectedUpdatedAt));
  const rows = await db
    .update(profiles)
    .set(values)
    .where(and(...conditions))
    .returning();
  return rows[0] ?? null;
}

// Achievement skill links

export async function replaceAchievementSkills(
  db: DbHandle,
  profileId: string,
  achievementId: string,
  skillIds: readonly string[],
): Promise<void> {
  await db
    .delete(achievementSkills)
    .where(
      and(
        eq(achievementSkills.profileId, profileId),
        eq(achievementSkills.achievementId, achievementId),
      ),
    );
  await insertAchievementSkills(db, profileId, achievementId, skillIds);
}

export async function insertAchievementSkills(
  db: DbHandle,
  profileId: string,
  achievementId: string,
  skillIds: readonly string[],
): Promise<void> {
  if (skillIds.length === 0) return;
  await db
    .insert(achievementSkills)
    .values(skillIds.map((skillId) => ({ profileId, achievementId, skillId })));
}

/**
 * The row version and its skill links must come from the same statement snapshot. Separate
 * reads can pair a new updated_at with old links, allowing a subsequent patch to lose links.
 */
export async function listAchievementsWithSkills(
  db: DbHandle,
  profileId: string,
  id?: string,
): Promise<(AchievementRecord & { skillIds: string[] })[]> {
  return db
    .select({
      ...getTableColumns(achievements),
      skillIds: sql<string[]>`array(
      select ${achievementSkills.skillId} from ${achievementSkills}
      where ${achievementSkills.profileId} = ${achievements.profileId}
        and ${achievementSkills.achievementId} = ${achievements.id}
      order by ${achievementSkills.skillId}
    )`,
    })
    .from(achievements)
    .where(
      and(
        eq(achievements.profileId, profileId),
        id === undefined ? undefined : eq(achievements.id, id),
      ),
    )
    .orderBy(...ownedTables.achievements.order);
}

// Ownership checks

export async function employmentBelongsToProfile(
  db: DbHandle,
  profileId: string,
  employmentId: string,
): Promise<boolean> {
  return (await findOwned(db, ownedTables.employment, profileId, employmentId)) !== null;
}

export async function projectBelongsToProfile(
  db: DbHandle,
  profileId: string,
  projectId: string,
): Promise<boolean> {
  return (await findOwned(db, ownedTables.projects, profileId, projectId)) !== null;
}

export async function countSkillsOwned(
  db: DbHandle,
  profileId: string,
  skillIds: readonly string[],
): Promise<number> {
  if (skillIds.length === 0) return 0;
  const rows = await db
    .select({ id: skills.id })
    .from(skills)
    .where(and(eq(skills.profileId, profileId), inArray(skills.id, [...skillIds])));
  return rows.length;
}

/** Counts of records that reference an employment record; used for readable delete errors. */
export async function countEmploymentDependents(
  db: DbHandle,
  profileId: string,
  employmentId: string,
): Promise<{ projects: number; achievements: number }> {
  const [p, a] = await Promise.all([
    db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.profileId, profileId), eq(projects.employmentId, employmentId))),
    db
      .select({ id: achievements.id })
      .from(achievements)
      .where(
        and(eq(achievements.profileId, profileId), eq(achievements.employmentId, employmentId)),
      ),
  ]);
  return { projects: p.length, achievements: a.length };
}

export async function countProjectDependents(
  db: DbHandle,
  profileId: string,
  projectId: string,
): Promise<number> {
  const rows = await db
    .select({ id: achievements.id })
    .from(achievements)
    .where(and(eq(achievements.profileId, profileId), eq(achievements.projectId, projectId)));
  return rows.length;
}

/** Serialize bootstrap checks across processes without introducing a second source of truth. */
export async function lockProfileCreation(db: DbHandle): Promise<void> {
  await db.execute(sql`select pg_advisory_xact_lock(174812, 1)`);
}

/** Skill deletion changes the achievement aggregate even though only joins disappear. */
export async function touchAchievementsForSkill(
  db: DbHandle,
  profileId: string,
  skillId: string,
  timestamp: Date,
): Promise<void> {
  const linked = db
    .select({ id: achievementSkills.achievementId })
    .from(achievementSkills)
    .where(and(eq(achievementSkills.profileId, profileId), eq(achievementSkills.skillId, skillId)));
  await db
    .update(achievements)
    .set({
      updatedAt: sql`greatest(${timestamp.toISOString()}::timestamptz, ${achievements.updatedAt} + interval '1 millisecond')`,
    })
    .where(and(eq(achievements.profileId, profileId), inArray(achievements.id, linked)));
}

/** Keep achievement row/skill-link edits ordered with cascading skill removal. */
export async function lockAchievementSkills(db: DbHandle, profileId: string): Promise<void> {
  await db.execute(sql`select pg_advisory_xact_lock(174813, hashtext(${profileId}))`);
}
