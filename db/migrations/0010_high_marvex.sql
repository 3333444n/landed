CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"website" text,
	"about" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_profile_id_id_unique" UNIQUE("profile_id","id"),
	CONSTRAINT "companies_name_not_blank" CHECK (btrim("companies"."name") <> '')
);
--> statement-breakpoint
CREATE TABLE "company_findings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"text" text NOT NULL,
	"source_url" text NOT NULL,
	"retrieved_at" date NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_findings_owner_company_id_unique" UNIQUE("profile_id","company_id","id"),
	CONSTRAINT "company_findings_text_not_blank" CHECK (btrim("company_findings"."text") <> ''),
	CONSTRAINT "company_findings_kind_valid" CHECK ("company_findings"."kind" IN ('statement','interpretation'))
);
--> statement-breakpoint
CREATE TABLE "job_finding_selections" (
	"profile_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	CONSTRAINT "job_finding_selections_job_id_finding_id_pk" PRIMARY KEY("job_id","finding_id")
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_findings" ADD CONSTRAINT "company_findings_profile_id_company_id_companies_profile_id_id_fk" FOREIGN KEY ("profile_id","company_id") REFERENCES "public"."companies"("profile_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_owner_company_unique" UNIQUE("profile_id","id","company_id");--> statement-breakpoint
ALTER TABLE "job_finding_selections" ADD CONSTRAINT "job_finding_selections_profile_id_job_id_company_id_jobs_profile_id_id_company_id_fk" FOREIGN KEY ("profile_id","job_id","company_id") REFERENCES "public"."jobs"("profile_id","id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_finding_selections" ADD CONSTRAINT "job_finding_selections_profile_id_company_id_finding_id_company_findings_profile_id_company_id_id_fk" FOREIGN KEY ("profile_id","company_id","finding_id") REFERENCES "public"."company_findings"("profile_id","company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_profile_id_company_id_companies_profile_id_id_fk" FOREIGN KEY ("profile_id","company_id") REFERENCES "public"."companies"("profile_id","id") ON DELETE no action ON UPDATE no action;