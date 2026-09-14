/*
 * Drizzle queries for the applications table over a database or transaction handle.
 */
import { and, eq } from "drizzle-orm";
import type { DbHandle } from "@/infrastructure/database";
import { applications } from "./schema";

export type ApplicationRecord = typeof applications.$inferSelect;

export async function listApplications(
  db: DbHandle,
  profileId: string,
): Promise<ApplicationRecord[]> {
  return db.select().from(applications).where(eq(applications.profileId, profileId));
}

export async function findApplication(
  db: DbHandle,
  profileId: string,
  id: string,
): Promise<ApplicationRecord | null> {
  const rows = await db
    .select()
    .from(applications)
    .where(and(eq(applications.profileId, profileId), eq(applications.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findApplicationForJob(
  db: DbHandle,
  profileId: string,
  jobId: string,
): Promise<ApplicationRecord | null> {
  const rows = await db
    .select()
    .from(applications)
    .where(and(eq(applications.profileId, profileId), eq(applications.jobId, jobId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertApplication(
  db: DbHandle,
  values: typeof applications.$inferInsert,
): Promise<ApplicationRecord> {
  const rows = await db.insert(applications).values(values).returning();
  return rows[0]!;
}

/** Compare-and-set on updated_at: a stale form from another tab updates nothing (docs/05). */
export async function updateApplication(
  db: DbHandle,
  profileId: string,
  id: string,
  values: Partial<typeof applications.$inferInsert>,
  expectedUpdatedAt: Date | undefined,
): Promise<ApplicationRecord | null> {
  const conditions = [eq(applications.profileId, profileId), eq(applications.id, id)];
  if (expectedUpdatedAt) conditions.push(eq(applications.updatedAt, expectedUpdatedAt));
  const rows = await db
    .update(applications)
    .set(values)
    .where(and(...conditions))
    .returning();
  return rows[0] ?? null;
}
