import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  unique,
  foreignKey,
  check,
  date,
} from "drizzle-orm/pg-core";
import { profiles } from "@/modules/profile/schema";
import { findingKinds, logoContentTypes } from "./contracts";
export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    location: text("location"),
    website: text("website"),
    about: text("about"),
    logoStorageKey: text("logo_storage_key"),
    logoContentType: text("logo_content_type", { enum: logoContentTypes }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "companies_logo_pair",
      sql`(${t.logoStorageKey} IS NULL) = (${t.logoContentType} IS NULL)`,
    ),
    check(
      "companies_logo_content_type_valid",
      sql`${t.logoContentType} IS NULL OR ${t.logoContentType} IN ('image/png', 'image/jpeg', 'image/webp', 'image/svg+xml')`,
    ),
    unique("companies_profile_id_id_unique").on(t.profileId, t.id),
    check("companies_name_not_blank", sql`btrim(${t.name}) <> ''`),
  ],
);
export const companyFindings = pgTable(
  "company_findings",
  {
    id: uuid("id").primaryKey(),
    profileId: uuid("profile_id").notNull(),
    companyId: uuid("company_id").notNull(),
    text: text("text").notNull(),
    sourceUrl: text("source_url").notNull(),
    retrievedAt: date("retrieved_at").notNull(),
    kind: text("kind", { enum: findingKinds }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.profileId, t.companyId],
      foreignColumns: [companies.profileId, companies.id],
    }).onDelete("cascade"),
    unique("company_findings_owner_company_id_unique").on(t.profileId, t.companyId, t.id),
    check("company_findings_text_not_blank", sql`btrim(${t.text}) <> ''`),
    check("company_findings_kind_valid", sql`${t.kind} IN ('statement','interpretation')`),
  ],
);
