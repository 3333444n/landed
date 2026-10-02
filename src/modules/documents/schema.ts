import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  real,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";
import { applications } from "@/modules/applications/schema";
import { profiles } from "@/modules/profile/schema";
import {
  documentTypes,
  failureKinds,
  revisionSources,
  runModes,
  runStates,
  type DocumentContent,
  type GroundingWarning,
  type Snapshot,
} from "./contracts";

/*
 * Phase 1b tables (docs/04). Owner-aware foreign keys to applications cascade, so deleting a job
 * removes its application, documents, revisions and runs in one statement. Revisions are
 * immutable except for reviewed_at; the run row is written before the model call and finished
 * after it, outside any transaction (docs/05).
 */

const owner = {
  profileId: text("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
};

const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

export const generationRuns = sqliteTable(
  "generation_runs",
  {
    id: text("id").primaryKey(),
    ...owner,
    applicationId: text("application_id").notNull(),
    documentType: text("document_type", { enum: documentTypes }).notNull(),
    state: text("state", { enum: runStates }).notNull(),
    failureKind: text("failure_kind", { enum: failureKinds }),
    mode: text("mode", { enum: runModes }).notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    promptName: text("prompt_name").notNull(),
    promptVersion: integer("prompt_version").notNull(),
    snapshot: text("snapshot", { mode: "json" }).$type<Snapshot>().notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: real("cost_usd"),
    latencyMs: integer("latency_ms"),
    errorMessage: text("error_message"),
    rawOutput: text("raw_output"),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    unique("generation_runs_profile_id_id_unique").on(t.profileId, t.id),
    foreignKey({
      name: "generation_runs_application_fk",
      columns: [t.profileId, t.applicationId],
      foreignColumns: [applications.profileId, applications.id],
    }).onDelete("cascade"),
    index("generation_runs_profile_id_application_id_created_at_idx").on(
      t.profileId,
      t.applicationId,
      t.createdAt,
    ),
    check("generation_runs_document_type_valid", sql`document_type IN (${inList(documentTypes)})`),
    check("generation_runs_state_valid", sql`state IN (${inList(runStates)})`),
    check(
      "generation_runs_failure_kind_valid",
      sql`failure_kind IS NULL OR failure_kind IN (${inList(failureKinds)})`,
    ),
    check("generation_runs_mode_valid", sql`mode IN (${inList(runModes)})`),
  ],
);

export const documents = sqliteTable(
  "documents",
  {
    id: text("id").primaryKey(),
    ...owner,
    applicationId: text("application_id").notNull(),
    type: text("type", { enum: documentTypes }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    unique("documents_profile_id_application_id_type_unique").on(
      t.profileId,
      t.applicationId,
      t.type,
    ),
    // Declared last so SQLite checks it first and a retried id reports it (mapDatabaseError).
    unique("documents_profile_id_id_unique").on(t.profileId, t.id),
    foreignKey({
      name: "documents_application_fk",
      columns: [t.profileId, t.applicationId],
      foreignColumns: [applications.profileId, applications.id],
    }).onDelete("cascade"),
    check("documents_type_valid", sql`type IN (${inList(documentTypes)})`),
  ],
);

export const documentRevisions = sqliteTable(
  "document_revisions",
  {
    id: text("id").primaryKey(),
    ...owner,
    documentId: text("document_id").notNull(),
    // Keyed on the run id alone: SET NULL on a composite key would also null profile_id.
    generationRunId: text("generation_run_id").references(() => generationRuns.id, {
      onDelete: "set null",
    }),
    content: text("content", { mode: "json" }).$type<DocumentContent>().notNull(),
    warnings: text("warnings", { mode: "json" }).$type<GroundingWarning[]>().notNull().default([]),
    source: text("source", { enum: revisionSources }).notNull(),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    unique("document_revisions_profile_id_id_unique").on(t.profileId, t.id),
    foreignKey({
      name: "document_revisions_document_fk",
      columns: [t.profileId, t.documentId],
      foreignColumns: [documents.profileId, documents.id],
    }).onDelete("cascade"),
    index("document_revisions_profile_id_document_id_created_at_idx").on(
      t.profileId,
      t.documentId,
      t.createdAt,
    ),
    check("document_revisions_source_valid", sql`source IN (${inList(revisionSources)})`),
  ],
);

export const documentArtifacts = sqliteTable(
  "document_artifacts",
  {
    id: text("id").primaryKey(),
    ...owner,
    documentRevisionId: text("document_revision_id").notNull(),
    format: text("format", { enum: ["pdf"] }).notNull(),
    templateVersion: integer("template_version").notNull(),
    storageKey: text("storage_key").notNull(),
    checksum: text("checksum").notNull(),
    byteSize: integer("byte_size").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    foreignKey({
      name: "document_artifacts_revision_fk",
      columns: [t.profileId, t.documentRevisionId],
      foreignColumns: [documentRevisions.profileId, documentRevisions.id],
    }).onDelete("cascade"),
    unique("document_artifacts_revision_format_template_unique").on(
      t.documentRevisionId,
      t.format,
      t.templateVersion,
    ),
    check("document_artifacts_format_valid", sql`format IN ('pdf')`),
  ],
);
