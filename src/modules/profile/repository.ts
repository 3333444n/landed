/*
 * Drizzle queries for Profile-owned tables. Functions take a database or transaction handle so a
 * use case can compose several of them inside one transaction. No rules live here.
 */
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { DbHandle } from "@/infrastructure/database";
import { achievementSkills, achievements, employment, profiles, projects, skills } from "./schema";

export type ProfileRecord = typeof profiles.$inferSelect;
export type AchievementRecord = typeof achievements.$inferSelect;
export type SkillRecord = typeof skills.$inferSelect;

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

export async function findAchievementById(
  db: DbHandle,
  profileId: string,
  id: string,
): Promise<AchievementRecord | null> {
  const rows = await db
    .select()
    .from(achievements)
    .where(and(eq(achievements.profileId, profileId), eq(achievements.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listAchievements(
  db: DbHandle,
  profileId: string,
): Promise<AchievementRecord[]> {
  return db
    .select()
    .from(achievements)
    .where(eq(achievements.profileId, profileId))
    .orderBy(desc(achievements.createdAt), desc(achievements.id));
}

export async function insertAchievement(
  db: DbHandle,
  values: typeof achievements.$inferInsert,
): Promise<AchievementRecord> {
  const rows = await db.insert(achievements).values(values).returning();
  return rows[0]!;
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

export async function listSkillIdsForAchievement(
  db: DbHandle,
  profileId: string,
  achievementId: string,
): Promise<string[]> {
  const rows = await db
    .select({ skillId: achievementSkills.skillId })
    .from(achievementSkills)
    .where(
      and(
        eq(achievementSkills.profileId, profileId),
        eq(achievementSkills.achievementId, achievementId),
      ),
    );
  return rows.map((r) => r.skillId);
}

export async function employmentBelongsToProfile(
  db: DbHandle,
  profileId: string,
  employmentId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: employment.id })
    .from(employment)
    .where(and(eq(employment.profileId, profileId), eq(employment.id, employmentId)))
    .limit(1);
  return rows.length === 1;
}

export async function projectBelongsToProfile(
  db: DbHandle,
  profileId: string,
  projectId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.profileId, profileId), eq(projects.id, projectId)))
    .limit(1);
  return rows.length === 1;
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
