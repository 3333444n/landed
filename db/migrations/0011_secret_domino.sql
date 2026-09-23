ALTER TABLE "jobs" DROP CONSTRAINT "jobs_company_name_not_blank";--> statement-breakpoint
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_logo_pair";--> statement-breakpoint
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_logo_content_type_valid";--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "logo_storage_key" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "logo_content_type" text;--> statement-breakpoint
-- Preserve legacy identity without guessing whether equal names represent the same company.
-- The migrator runs this file in a transaction; old image files stay at their existing keys.
LOCK TABLE "jobs", "companies" IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
CREATE TEMP TABLE landed_company_backfill ON COMMIT DROP AS
SELECT id AS job_id, gen_random_uuid() AS company_id, profile_id, company_name,
       created_at, updated_at
FROM jobs WHERE company_id IS NULL;
--> statement-breakpoint
INSERT INTO companies (id, profile_id, name, created_at, updated_at)
SELECT company_id, profile_id, company_name, created_at, updated_at
FROM landed_company_backfill;
--> statement-breakpoint
UPDATE jobs AS j
SET company_id = b.company_id,
    updated_at = greatest(j.updated_at + interval '1 millisecond', now())
FROM landed_company_backfill AS b WHERE j.id = b.job_id;
--> statement-breakpoint
-- Existing shared company identity wins. Its newest linked job supplies the shared image.
UPDATE companies AS c
SET logo_storage_key = chosen.logo_storage_key,
    logo_content_type = chosen.logo_content_type,
    updated_at = greatest(c.updated_at + interval '1 millisecond', now())
FROM (
  SELECT DISTINCT ON (profile_id, company_id)
         profile_id, company_id, logo_storage_key, logo_content_type
  FROM jobs WHERE company_id IS NOT NULL AND logo_storage_key IS NOT NULL
  ORDER BY profile_id, company_id, updated_at DESC, id DESC
) AS chosen
WHERE c.id = chosen.company_id AND c.profile_id = chosen.profile_id
  AND c.logo_storage_key IS NULL;
--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "company_name";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "logo_storage_key";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "logo_content_type";--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_logo_pair" CHECK (("companies"."logo_storage_key" IS NULL) = ("companies"."logo_content_type" IS NULL));--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_logo_content_type_valid" CHECK ("companies"."logo_content_type" IS NULL OR "companies"."logo_content_type" IN ('image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'));