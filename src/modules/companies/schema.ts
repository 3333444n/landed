import { sql } from "drizzle-orm";
import { check, foreignKey, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { profiles } from "@/modules/profile/schema";
import { findingKinds, logoContentTypes } from "./contracts";
export const companies = sqliteTable(
  "companies",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    location: text("location"),
    website: text("website"),
    about: text("about"),
    logoStorageKey: text("logo_storage_key"),
    logoContentType: text("logo_content_type", { enum: logoContentTypes }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    check("companies_logo_pair", sql`(logo_storage_key IS NULL) = (logo_content_type IS NULL)`),
    check(
      "companies_logo_content_type_valid",
      sql`logo_content_type IS NULL OR logo_content_type IN ('image/png', 'image/jpeg', 'image/webp', 'image/svg+xml')`,
    ),
    unique("companies_profile_id_id_unique").on(t.profileId, t.id),
    check("companies_name_not_blank", sql`trim(name) <> ''`),
  ],
);
export const companyFindings = sqliteTable(
  "company_findings",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id").notNull(),
    companyId: text("company_id").notNull(),
    text: text("text").notNull(),
    sourceUrl: text("source_url").notNull(),
    /** ISO date, YYYY-MM-DD. */
    retrievedAt: text("retrieved_at").notNull(),
    kind: text("kind", { enum: findingKinds }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.profileId, t.companyId],
      foreignColumns: [companies.profileId, companies.id],
    }).onDelete("cascade"),
    unique("company_findings_owner_company_id_unique").on(t.profileId, t.companyId, t.id),
    check("company_findings_text_not_blank", sql`trim(text) <> ''`),
    check("company_findings_kind_valid", sql`kind IN ('statement','interpretation')`),
  ],
);
