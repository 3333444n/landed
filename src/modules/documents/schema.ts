import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
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
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
};

const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

export const generationRuns = pgTable(
  "generation_runs",
  {
    id: uuid("id").primaryKey(),
    ...owner,
    applicationId: uuid("application_id").notNull(),
    documentType: text("document_type", { enum: documentTypes }).notNull(),
    state: text("state", { enum: runStates }).notNull(),
    failureKind: text("failure_kind", { enum: failureKinds }),
    mode: text("mode", { enum: runModes }).notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    promptName: text("prompt_name").notNull(),
    promptVersion: integer("prompt_version").notNull(),
    snapshot: jsonb("snapshot").$type<Snapshot>().notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }),
    latencyMs: integer("latency_ms"),
    errorMessage: text("error_message"),
    rawOutput: text("raw_output"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey(),
    ...owner,
    applicationId: uuid("application_id").notNull(),
    type: text("type", { enum: documentTypes }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("documents_profile_id_id_unique").on(t.profileId, t.id),
    unique("documents_profile_id_application_id_type_unique").on(
      t.profileId,
      t.applicationId,
      t.type,
    ),
    foreignKey({
      name: "documents_application_fk",
      columns: [t.profileId, t.applicationId],
      foreignColumns: [applications.profileId, applications.id],
    }).onDelete("cascade"),
    check("documents_type_valid", sql`type IN (${inList(documentTypes)})`),
  ],
);

export const documentRevisions = pgTable(
  "document_revisions",
  {
    id: uuid("id").primaryKey(),
    ...owner,
    documentId: uuid("document_id").notNull(),
    generationRunId: uuid("generation_run_id"),
    content: jsonb("content").$type<DocumentContent>().notNull(),
    warnings: jsonb("warnings").$type<GroundingWarning[]>().notNull().default([]),
    source: text("source", { enum: revisionSources }).notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("document_revisions_profile_id_id_unique").on(t.profileId, t.id),
    foreignKey({
      name: "document_revisions_document_fk",
      columns: [t.profileId, t.documentId],
      foreignColumns: [documents.profileId, documents.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "document_revisions_run_fk",
      columns: [t.profileId, t.generationRunId],
      foreignColumns: [generationRuns.profileId, generationRuns.id],
    }).onDelete("set null"),
    index("document_revisions_profile_id_document_id_created_at_idx").on(
      t.profileId,
      t.documentId,
      t.createdAt,
    ),
    check("document_revisions_source_valid", sql`source IN (${inList(revisionSources)})`),
  ],
);

export const documentArtifacts = pgTable(
  "document_artifacts",
  {
    id: uuid("id").primaryKey(),
    ...owner,
    documentRevisionId: uuid("document_revision_id").notNull(),
    format: text("format", { enum: ["pdf"] }).notNull(),
    templateVersion: integer("template_version").notNull(),
    storageKey: text("storage_key").notNull(),
    checksum: text("checksum").notNull(),
    byteSize: integer("byte_size").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
