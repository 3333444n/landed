/*
 * Drizzle queries for the jobs table over a database or transaction handle. No rules live here.
 */
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { DbHandle } from "@/infrastructure/database";
import { jobs, jobSourceOptions, jobFindingSelections } from "./schema";

export type JobRecord = typeof jobs.$inferSelect;

export async function listJobs(db: DbHandle, profileId: string): Promise<JobRecord[]> {
  return db
    .select()
    .from(jobs)
    .where(eq(jobs.profileId, profileId))
    .orderBy(desc(jobs.updatedAt), desc(jobs.id));
}

export async function findJob(
  db: DbHandle,
  profileId: string,
  id: string,
): Promise<JobRecord | null> {
  const rows = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.profileId, profileId), eq(jobs.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertJob(
  db: DbHandle,
  values: typeof jobs.$inferInsert,
): Promise<JobRecord> {
  const rows = await db.insert(jobs).values(values).returning();
  return rows[0]!;
}

/** Compare-and-set on updated_at: a stale form from another tab updates nothing (docs/05). */
export async function updateJob(
  db: DbHandle,
  profileId: string,
  id: string,
  values: Partial<typeof jobs.$inferInsert>,
  expectedUpdatedAt: Date | undefined,
): Promise<JobRecord | null> {
  const conditions = [eq(jobs.profileId, profileId), eq(jobs.id, id)];
  if (expectedUpdatedAt) conditions.push(eq(jobs.updatedAt, expectedUpdatedAt));
  const rows = await db
    .update(jobs)
    .set(values)
    .where(and(...conditions))
    .returning();
  return rows[0] ?? null;
}

export async function deleteJob(db: DbHandle, profileId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(jobs)
    .where(and(eq(jobs.profileId, profileId), eq(jobs.id, id)))
    .returning({ id: jobs.id });
  return rows.length === 1;
}

export type JobSourceRecord = typeof jobSourceOptions.$inferSelect;
export async function listJobSources(db: DbHandle, profileId: string) {
  return db
    .select()
    .from(jobSourceOptions)
    .where(eq(jobSourceOptions.profileId, profileId))
    .orderBy(asc(jobSourceOptions.name));
}
export async function findJobSource(db: DbHandle, profileId: string, id: string) {
  const rows = await db
    .select()
    .from(jobSourceOptions)
    .where(and(eq(jobSourceOptions.profileId, profileId), eq(jobSourceOptions.id, id)))
    .limit(1);
  return rows[0] ?? null;
}
export async function insertJobSource(db: DbHandle, values: typeof jobSourceOptions.$inferInsert) {
  const rows = await db.insert(jobSourceOptions).values(values).returning();
  return rows[0]!;
}
export async function updateJobSource(
  db: DbHandle,
  profileId: string,
  id: string,
  version: Date,
  values: Partial<typeof jobSourceOptions.$inferInsert>,
) {
  const rows = await db
    .update(jobSourceOptions)
    .set(values)
    .where(
      and(
        eq(jobSourceOptions.profileId, profileId),
        eq(jobSourceOptions.id, id),
        eq(jobSourceOptions.updatedAt, version),
      ),
    )
    .returning();
  return rows[0] ?? null;
}
export async function lockJob(db: DbHandle, profileId: string, id: string) {
  return (
    (
      await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.profileId, profileId), eq(jobs.id, id)))
        .for("update")
    )[0] ?? null
  );
}
export async function selectedFindingIds(db: DbHandle, profileId: string, jobId: string) {
  return (
    await db
      .select({ id: jobFindingSelections.findingId })
      .from(jobFindingSelections)
      .where(
        and(eq(jobFindingSelections.profileId, profileId), eq(jobFindingSelections.jobId, jobId)),
      )
  ).map((r) => r.id);
}
export async function clearFindingSelection(db: DbHandle, profileId: string, jobId: string) {
  await db
    .delete(jobFindingSelections)
    .where(
      and(eq(jobFindingSelections.profileId, profileId), eq(jobFindingSelections.jobId, jobId)),
    );
}
export async function replaceFindingSelection(
  db: DbHandle,
  profileId: string,
  jobId: string,
  companyId: string,
  ids: string[],
) {
  await clearFindingSelection(db, profileId, jobId);
  if (ids.length)
    await db
      .insert(jobFindingSelections)
      .values(ids.map((findingId) => ({ profileId, jobId, companyId, findingId })));
}
export async function invalidateFindingJobs(
  db: DbHandle,
  profileId: string,
  findingId: string,
  at: Date,
) {
  const rows = await db
    .select({ id: jobFindingSelections.jobId })
    .from(jobFindingSelections)
    .where(
      and(
        eq(jobFindingSelections.profileId, profileId),
        eq(jobFindingSelections.findingId, findingId),
      ),
    );
  if (rows.length)
    await db
      .update(jobs)
      .set({ updatedAt: at })
      .where(
        and(
          eq(jobs.profileId, profileId),
          inArray(
            jobs.id,
            rows.map((r) => r.id),
          ),
        ),
      );
}
