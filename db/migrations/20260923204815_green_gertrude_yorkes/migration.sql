CREATE TABLE "job_source_options" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"name" text NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_source_options_profile_id_id_unique" UNIQUE("profile_id","id"),
	CONSTRAINT "job_source_options_name_not_blank" CHECK (btrim(name) <> '')
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "job_source_id" uuid;--> statement-breakpoint
ALTER TABLE "job_source_options" ADD CONSTRAINT "job_source_options_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_source_owner_fk" FOREIGN KEY ("profile_id","job_source_id") REFERENCES "public"."job_source_options"("profile_id","id") ON DELETE no action ON UPDATE no action;