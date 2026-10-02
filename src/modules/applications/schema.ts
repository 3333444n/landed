import { sql } from "drizzle-orm";
import { check, foreignKey, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { jobs } from "@/modules/jobs/schema";
import { profiles } from "@/modules/profile/schema";
import { applicationStatuses } from "./contracts";

/*
 * Phase 1a table (docs/04). One pursuit per profile and job. The owner-aware foreign key
 * (profile_id, job_id) -> jobs (profile_id, id) cascades: deleting a job deletes its application,
 * which the interface confirms first. Status is the pursuit's own lifecycle (docs/05); the chip
 * shown in the Jobs list is derived at render time and never stored.
 */
export const applications = sqliteTable(
  "applications",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    jobId: text("job_id").notNull(),
    status: text("status", { enum: applicationStatuses }).notNull().default("preparing"),
    notes: text("notes"),
    interest: text("interest"),
    submittedAt: integer("submitted_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    unique("applications_profile_id_job_id_unique").on(t.profileId, t.jobId),
    // Phase 1b: documents and runs link owner-aware to (profile_id, id), as jobs do for us.
    // Declared last so SQLite checks it first and a retried id reports it (mapDatabaseError).
    unique("applications_profile_id_id_unique").on(t.profileId, t.id),
    foreignKey({
      name: "applications_job_fk",
      columns: [t.profileId, t.jobId],
      foreignColumns: [jobs.profileId, jobs.id],
    }).onDelete("cascade"),
    check(
      "applications_status_valid",
      sql`status IN ('preparing', 'ready', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn', 'accepted')`,
    ),
  ],
);
