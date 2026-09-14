import { sql } from "drizzle-orm";
import { check, foreignKey, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { jobs } from "@/modules/jobs/schema";
import { profiles } from "@/modules/profile/schema";
import { applicationStatuses } from "./contracts";

/*
 * Phase 1a table (docs/04). One pursuit per profile and job. The owner-aware foreign key
 * (profile_id, job_id) -> jobs (profile_id, id) cascades: deleting a job deletes its application,
 * which the interface confirms first. Status is the pursuit's own lifecycle (docs/05); the chip
 * shown in the Jobs list is derived at render time and never stored.
 */
export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").notNull(),
    status: text("status", { enum: applicationStatuses }).notNull().default("preparing"),
    notes: text("notes"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("applications_profile_id_job_id_unique").on(t.profileId, t.jobId),
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
