import { and, asc, eq } from "drizzle-orm";
import type { DbHandle } from "@/infrastructure/database";
import { companies, companyFindings } from "./schema";
export type CompanyRecord = typeof companies.$inferSelect;
export type CompanyFindingRecord = typeof companyFindings.$inferSelect;
export const listCompanies = (db: DbHandle, profileId: string) =>
  db
    .select()
    .from(companies)
    .where(eq(companies.profileId, profileId))
    .orderBy(asc(companies.name), asc(companies.id));
export async function findCompany(db: DbHandle, profileId: string, id: string) {
  return (
    (
      await db
        .select()
        .from(companies)
        .where(and(eq(companies.profileId, profileId), eq(companies.id, id)))
    )[0] ?? null
  );
}
export const listFindings = (db: DbHandle, profileId: string, companyId: string) =>
  db
    .select()
    .from(companyFindings)
    .where(and(eq(companyFindings.profileId, profileId), eq(companyFindings.companyId, companyId)))
    .orderBy(asc(companyFindings.createdAt), asc(companyFindings.id));
export async function findFinding(db: DbHandle, profileId: string, companyId: string, id: string) {
  return (
    (
      await db
        .select()
        .from(companyFindings)
        .where(
          and(
            eq(companyFindings.profileId, profileId),
            eq(companyFindings.companyId, companyId),
            eq(companyFindings.id, id),
          ),
        )
    )[0] ?? null
  );
}
export async function insertCompany(db: DbHandle, values: typeof companies.$inferInsert) {
  return (await db.insert(companies).values(values).returning())[0]!;
}
export async function updateCompany(
  db: DbHandle,
  profileId: string,
  id: string,
  at: Date,
  values: Partial<typeof companies.$inferInsert>,
) {
  return (
    (
      await db
        .update(companies)
        .set(values)
        .where(
          and(
            eq(companies.profileId, profileId),
            eq(companies.id, id),
            eq(companies.updatedAt, at),
          ),
        )
        .returning()
    )[0] ?? null
  );
}
export async function deleteCompany(db: DbHandle, profileId: string, id: string, at: Date) {
  return (
    (
      await db
        .delete(companies)
        .where(
          and(
            eq(companies.profileId, profileId),
            eq(companies.id, id),
            eq(companies.updatedAt, at),
          ),
        )
        .returning()
    ).length > 0
  );
}
export async function insertFinding(db: DbHandle, values: typeof companyFindings.$inferInsert) {
  return (await db.insert(companyFindings).values(values).returning())[0]!;
}
export async function updateFinding(
  db: DbHandle,
  profileId: string,
  companyId: string,
  id: string,
  at: Date,
  values: Partial<typeof companyFindings.$inferInsert>,
) {
  return (
    (
      await db
        .update(companyFindings)
        .set(values)
        .where(
          and(
            eq(companyFindings.profileId, profileId),
            eq(companyFindings.companyId, companyId),
            eq(companyFindings.id, id),
            eq(companyFindings.updatedAt, at),
          ),
        )
        .returning()
    )[0] ?? null
  );
}
export async function deleteFinding(
  db: DbHandle,
  profileId: string,
  companyId: string,
  id: string,
  at: Date,
) {
  return (
    (
      await db
        .delete(companyFindings)
        .where(
          and(
            eq(companyFindings.profileId, profileId),
            eq(companyFindings.companyId, companyId),
            eq(companyFindings.id, id),
            eq(companyFindings.updatedAt, at),
          ),
        )
        .returning()
    ).length > 0
  );
}
