CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"status" text DEFAULT 'preparing' NOT NULL,
	"notes" text,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_profile_id_job_id_unique" UNIQUE("profile_id","job_id"),
	CONSTRAINT "applications_status_valid" CHECK (status IN ('preparing', 'ready', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn', 'accepted'))
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"title" text NOT NULL,
	"company_name" text NOT NULL,
	"location" text,
	"source" text DEFAULT 'pasted' NOT NULL,
	"source_url" text,
	"raw_description" text NOT NULL,
	"availability" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_profile_id_id_unique" UNIQUE("profile_id","id"),
	CONSTRAINT "jobs_title_not_blank" CHECK (btrim(title) <> ''),
	CONSTRAINT "jobs_company_name_not_blank" CHECK (btrim(company_name) <> ''),
	CONSTRAINT "jobs_raw_description_not_blank" CHECK (btrim(raw_description) <> ''),
	CONSTRAINT "jobs_source_valid" CHECK (source IN ('pasted')),
	CONSTRAINT "jobs_availability_valid" CHECK (availability IN ('active', 'expired', 'unknown'))
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_fk" FOREIGN KEY ("profile_id","job_id") REFERENCES "public"."jobs"("profile_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jobs_profile_id_updated_at_idx" ON "jobs" USING btree ("profile_id","updated_at");