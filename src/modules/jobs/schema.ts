import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { profiles } from "@/modules/profile/schema";
import { jobAvailabilities, jobSources, logoContentTypes } from "./contracts";

/*
 * Phase 1a table (docs/04). A job is an external posting; its text is untrusted input and is
 * stored as pasted. Availability is the job's own lifecycle and never moves an application
 * (docs/05). UNIQUE (profile_id, id) lets Applications link owner-aware, as in Phase 0.
 */

const notBlank = (column: string) =>
  check(`jobs_${column}_not_blank`, sql.raw(`btrim(${column}) <> ''`));

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    companyName: text("company_name").notNull(),
    location: text("location"),
    /** As the posting states it, any currency or period; never parsed (docs/01). */
    salary: text("salary"),
    source: text("source", { enum: jobSources }).notNull().default("pasted"),
    sourceUrl: text("source_url"),
    rawDescription: text("raw_description").notNull(),
    availability: text("availability", { enum: jobAvailabilities }).notNull().default("active"),
    /** A company logo stored as a file under the artifact directory (docs/04); both or neither. */
    logoStorageKey: text("logo_storage_key"),
    logoContentType: text("logo_content_type", { enum: logoContentTypes }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("jobs_profile_id_id_unique").on(t.profileId, t.id),
    index("jobs_profile_id_updated_at_idx").on(t.profileId, t.updatedAt),
    notBlank(t.title.name),
    notBlank(t.companyName.name),
    notBlank(t.rawDescription.name),
    check("jobs_source_valid", sql`source IN ('pasted')`),
    check("jobs_availability_valid", sql`availability IN ('active', 'expired', 'unknown')`),
    check("jobs_logo_pair", sql`(logo_storage_key IS NULL) = (logo_content_type IS NULL)`),
    check(
      "jobs_logo_content_type_valid",
      sql`logo_content_type IS NULL OR logo_content_type IN ('image/png', 'image/jpeg', 'image/webp', 'image/svg+xml')`,
    ),
  ],
);
