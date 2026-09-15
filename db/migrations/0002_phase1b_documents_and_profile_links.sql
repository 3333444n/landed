CREATE TABLE "document_artifacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"document_revision_id" uuid NOT NULL,
	"format" text NOT NULL,
	"template_version" integer NOT NULL,
	"storage_key" text NOT NULL,
	"checksum" text NOT NULL,
	"byte_size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_artifacts_revision_format_template_unique" UNIQUE("document_revision_id","format","template_version"),
	CONSTRAINT "document_artifacts_format_valid" CHECK (format IN ('pdf'))
);
--> statement-breakpoint
CREATE TABLE "document_revisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"generation_run_id" uuid,
	"content" jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" text NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_revisions_profile_id_id_unique" UNIQUE("profile_id","id"),
	CONSTRAINT "document_revisions_source_valid" CHECK (source IN ('generated', 'pasted', 'edited'))
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_profile_id_id_unique" UNIQUE("profile_id","id"),
	CONSTRAINT "documents_profile_id_application_id_type_unique" UNIQUE("profile_id","application_id","type"),
	CONSTRAINT "documents_type_valid" CHECK (type IN ('resume', 'cover_letter', 'recruiter_message'))
);
--> statement-breakpoint
CREATE TABLE "generation_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"state" text NOT NULL,
	"failure_kind" text,
	"mode" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt_name" text NOT NULL,
	"prompt_version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd" numeric(12, 6),
	"latency_ms" integer,
	"error_message" text,
	"raw_output" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generation_runs_profile_id_id_unique" UNIQUE("profile_id","id"),
	CONSTRAINT "generation_runs_document_type_valid" CHECK (document_type IN ('resume', 'cover_letter', 'recruiter_message')),
	CONSTRAINT "generation_runs_state_valid" CHECK (state IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
	CONSTRAINT "generation_runs_failure_kind_valid" CHECK (failure_kind IS NULL OR failure_kind IN ('provider', 'validation', 'pasted_invalid', 'interrupted')),
	CONSTRAINT "generation_runs_mode_valid" CHECK (mode IN ('adapter', 'pasted'))
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "links" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_profile_id_id_unique" UNIQUE("profile_id","id");--> statement-breakpoint
ALTER TABLE "document_artifacts" ADD CONSTRAINT "document_artifacts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_artifacts" ADD CONSTRAINT "document_artifacts_revision_fk" FOREIGN KEY ("profile_id","document_revision_id") REFERENCES "public"."document_revisions"("profile_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_document_fk" FOREIGN KEY ("profile_id","document_id") REFERENCES "public"."documents"("profile_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_run_fk" FOREIGN KEY ("profile_id","generation_run_id") REFERENCES "public"."generation_runs"("profile_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_application_fk" FOREIGN KEY ("profile_id","application_id") REFERENCES "public"."applications"("profile_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_application_fk" FOREIGN KEY ("profile_id","application_id") REFERENCES "public"."applications"("profile_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_revisions_profile_id_document_id_created_at_idx" ON "document_revisions" USING btree ("profile_id","document_id","created_at");--> statement-breakpoint
CREATE INDEX "generation_runs_profile_id_application_id_created_at_idx" ON "generation_runs" USING btree ("profile_id","application_id","created_at");
