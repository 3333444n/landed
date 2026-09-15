/*
 * Drizzle queries for runs, documents and revisions over a database or transaction handle.
 */
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import type { DbHandle } from "@/infrastructure/database";
import type { DocumentType } from "./contracts";
import { documentRevisions, documents, generationRuns } from "./schema";

export type GenerationRunRecord = typeof generationRuns.$inferSelect;
export type DocumentRecord = typeof documents.$inferSelect;
export type DocumentRevisionRecord = typeof documentRevisions.$inferSelect;

// Runs

export async function insertRun(
  db: DbHandle,
  values: typeof generationRuns.$inferInsert,
): Promise<GenerationRunRecord> {
  const rows = await db.insert(generationRuns).values(values).returning();
  return rows[0]!;
}

export async function findRun(
  db: DbHandle,
  profileId: string,
  id: string,
): Promise<GenerationRunRecord | null> {
  const rows = await db
    .select()
    .from(generationRuns)
    .where(and(eq(generationRuns.profileId, profileId), eq(generationRuns.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateRun(
  db: DbHandle,
  profileId: string,
  id: string,
  values: Partial<typeof generationRuns.$inferInsert>,
): Promise<GenerationRunRecord | null> {
  const rows = await db
    .update(generationRuns)
    .set(values)
    .where(and(eq(generationRuns.profileId, profileId), eq(generationRuns.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function listRuns(
  db: DbHandle,
  profileId: string,
  applicationId: string,
  documentType?: DocumentType,
): Promise<GenerationRunRecord[]> {
  const conditions = [
    eq(generationRuns.profileId, profileId),
    eq(generationRuns.applicationId, applicationId),
  ];
  if (documentType) conditions.push(eq(generationRuns.documentType, documentType));
  return db
    .select()
    .from(generationRuns)
    .where(and(...conditions))
    .orderBy(desc(generationRuns.createdAt), desc(generationRuns.id));
}

export async function listRunsForApplications(
  db: DbHandle,
  profileId: string,
  applicationIds: readonly string[],
): Promise<GenerationRunRecord[]> {
  if (applicationIds.length === 0) return [];
  return db
    .select()
    .from(generationRuns)
    .where(
      and(
        eq(generationRuns.profileId, profileId),
        inArray(generationRuns.applicationId, [...applicationIds]),
      ),
    );
}

/** Marks every run still `running` since before `before` as interrupted. Returns the count. */
export async function failStaleRuns(
  db: DbHandle,
  profileId: string,
  before: Date,
  finishedAt: Date,
): Promise<number> {
  const rows = await db
    .update(generationRuns)
    .set({
      state: "failed",
      failureKind: "interrupted",
      errorMessage: "Interrupted: the server stopped before the run finished",
      finishedAt,
      updatedAt: finishedAt,
    })
    .where(
      and(
        eq(generationRuns.profileId, profileId),
        eq(generationRuns.state, "running"),
        lt(generationRuns.startedAt, before),
      ),
    )
    .returning({ id: generationRuns.id });
  return rows.length;
}

/** Opening Paste back again supersedes earlier unanswered prompts for the same document. */
export async function cancelQueuedPastedRuns(
  db: DbHandle,
  profileId: string,
  applicationId: string,
  documentType: DocumentType,
  at: Date,
): Promise<number> {
  const rows = await db
    .update(generationRuns)
    .set({ state: "cancelled", finishedAt: at, updatedAt: at })
    .where(
      and(
        eq(generationRuns.profileId, profileId),
        eq(generationRuns.applicationId, applicationId),
        eq(generationRuns.documentType, documentType),
        eq(generationRuns.mode, "pasted"),
        eq(generationRuns.state, "queued"),
      ),
    )
    .returning({ id: generationRuns.id });
  return rows.length;
}

// Documents

export async function findDocument(
  db: DbHandle,
  profileId: string,
  applicationId: string,
  type: DocumentType,
): Promise<DocumentRecord | null> {
  const rows = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.profileId, profileId),
        eq(documents.applicationId, applicationId),
        eq(documents.type, type),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function insertDocument(
  db: DbHandle,
  values: typeof documents.$inferInsert,
): Promise<DocumentRecord> {
  const rows = await db.insert(documents).values(values).returning();
  return rows[0]!;
}

export async function listDocumentsForApplications(
  db: DbHandle,
  profileId: string,
  applicationIds: readonly string[],
): Promise<DocumentRecord[]> {
  if (applicationIds.length === 0) return [];
  return db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.profileId, profileId),
        inArray(documents.applicationId, [...applicationIds]),
      ),
    );
}

// Revisions

export async function insertRevision(
  db: DbHandle,
  values: typeof documentRevisions.$inferInsert,
): Promise<DocumentRevisionRecord> {
  const rows = await db.insert(documentRevisions).values(values).returning();
  return rows[0]!;
}

export async function findRevision(
  db: DbHandle,
  profileId: string,
  id: string,
): Promise<DocumentRevisionRecord | null> {
  const rows = await db
    .select()
    .from(documentRevisions)
    .where(and(eq(documentRevisions.profileId, profileId), eq(documentRevisions.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function latestRevision(
  db: DbHandle,
  profileId: string,
  documentId: string,
): Promise<DocumentRevisionRecord | null> {
  const rows = await db
    .select()
    .from(documentRevisions)
    .where(
      and(eq(documentRevisions.profileId, profileId), eq(documentRevisions.documentId, documentId)),
    )
    .orderBy(desc(documentRevisions.createdAt), desc(documentRevisions.id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listRevisions(
  db: DbHandle,
  profileId: string,
  documentId: string,
): Promise<DocumentRevisionRecord[]> {
  return db
    .select()
    .from(documentRevisions)
    .where(
      and(eq(documentRevisions.profileId, profileId), eq(documentRevisions.documentId, documentId)),
    )
    .orderBy(desc(documentRevisions.createdAt), desc(documentRevisions.id));
}

export async function listRevisionsForDocuments(
  db: DbHandle,
  profileId: string,
  documentIds: readonly string[],
): Promise<DocumentRevisionRecord[]> {
  if (documentIds.length === 0) return [];
  return db
    .select()
    .from(documentRevisions)
    .where(
      and(
        eq(documentRevisions.profileId, profileId),
        inArray(documentRevisions.documentId, [...documentIds]),
      ),
    )
    .orderBy(desc(documentRevisions.createdAt), desc(documentRevisions.id));
}

export async function setReviewedAt(
  db: DbHandle,
  profileId: string,
  id: string,
  reviewedAt: Date | null,
): Promise<DocumentRevisionRecord | null> {
  const rows = await db
    .update(documentRevisions)
    .set({ reviewedAt })
    .where(and(eq(documentRevisions.profileId, profileId), eq(documentRevisions.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function listDocumentsForApplicationsById(
  db: DbHandle,
  profileId: string,
  documentIds: readonly string[],
): Promise<DocumentRecord[]> {
  if (documentIds.length === 0) return [];
  return db
    .select()
    .from(documents)
    .where(and(eq(documents.profileId, profileId), inArray(documents.id, [...documentIds])));
}
