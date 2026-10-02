import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";
import { companies, companyFindings } from "@/modules/companies/schema";
import { profiles } from "@/modules/profile/schema";
import { jobAvailabilities, jobSources } from "./contracts";

/*
 * Phase 1a table (docs/04). A job is an external posting; its text is untrusted input and is
 * stored as pasted. Availability is the job's own lifecycle and never moves an application
 * (docs/05). UNIQUE (profile_id, id) lets Applications link owner-aware, as in Phase 0.
 */

const notBlank = (column: string) =>
  check(`jobs_${column}_not_blank`, sql.raw(`trim(${column}) <> ''`));

export const jobSourceOptions = sqliteTable(
  "job_source_options",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    unique("job_source_options_profile_id_id_unique").on(t.profileId, t.id),
    check("job_source_options_name_not_blank", sql`trim(name) <> ''`),
  ],
);

export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    companyId: text("company_id"),
    location: text("location"),
    /** As the posting states it, any currency or period; never parsed (docs/01). */
    salary: text("salary"),
    source: text("source", { enum: jobSources }).notNull().default("pasted"),
    sourceUrl: text("source_url"),
    jobSourceId: text("job_source_id"),
    rawDescription: text("raw_description").notNull(),
    availability: text("availability", { enum: jobAvailabilities }).notNull().default("active"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.profileId, t.jobSourceId],
      foreignColumns: [jobSourceOptions.profileId, jobSourceOptions.id],
      name: "jobs_source_owner_fk",
    }),
    foreignKey({
      columns: [t.profileId, t.companyId],
      foreignColumns: [companies.profileId, companies.id],
    }),
    unique("jobs_owner_company_unique").on(t.profileId, t.id, t.companyId),
    unique("jobs_profile_id_id_unique").on(t.profileId, t.id),
    index("jobs_profile_id_updated_at_idx").on(t.profileId, t.updatedAt),
    notBlank(t.title.name),
    notBlank(t.rawDescription.name),
    check("jobs_source_valid", sql`source IN ('pasted')`),
    check("jobs_availability_valid", sql`availability IN ('active', 'expired', 'unknown')`),
  ],
);

/** Both composite keys enforce owner and company agreement even under concurrent writes. */
export const jobFindingSelections = sqliteTable(
  "job_finding_selections",
  {
    profileId: text("profile_id").notNull(),
    jobId: text("job_id").notNull(),
    companyId: text("company_id").notNull(),
    findingId: text("finding_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.jobId, t.findingId] }),
    foreignKey({
      columns: [t.profileId, t.jobId, t.companyId],
      foreignColumns: [jobs.profileId, jobs.id, jobs.companyId],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.profileId, t.companyId, t.findingId],
      foreignColumns: [companyFindings.profileId, companyFindings.companyId, companyFindings.id],
    }).onDelete("cascade"),
  ],
);
