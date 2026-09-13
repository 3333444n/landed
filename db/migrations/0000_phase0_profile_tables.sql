CREATE TABLE "achievement_skills" (
	"profile_id" uuid NOT NULL,
	"achievement_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	CONSTRAINT "achievement_skills_achievement_id_skill_id_pk" PRIMARY KEY("achievement_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"employment_id" uuid,
	"project_id" uuid,
	"statement" text NOT NULL,
	"problem" text,
	"action" text,
	"result" text,
	"metric" text,
	"source_note" text,
	"source_url" text,
	"reviewed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "achievements_profile_id_id_unique" UNIQUE("profile_id","id"),
	CONSTRAINT "achievements_statement_not_blank" CHECK (btrim(statement) <> ''),
	CONSTRAINT "achievements_single_context" CHECK (employment_id IS NULL OR project_id IS NULL)
);
--> statement-breakpoint
CREATE TABLE "education" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"institution" text NOT NULL,
	"qualification" text,
	"subject" text,
	"start_year" integer,
	"start_month" integer,
	"end_year" integer,
	"end_month" integer,
	"status" text DEFAULT 'completed' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "education_institution_not_blank" CHECK (btrim(institution) <> ''),
	CONSTRAINT "education_status_valid" CHECK (status IN ('in_progress', 'completed', 'incomplete')),
	CONSTRAINT "education_start_month_pair" CHECK ((start_year IS NULL) = (start_month IS NULL)),
	CONSTRAINT "education_end_month_pair" CHECK ((end_year IS NULL) = (end_month IS NULL)),
	CONSTRAINT "education_start_month_range" CHECK (start_month IS NULL OR (start_month BETWEEN 1 AND 12 AND start_year BETWEEN 1900 AND 2100)),
	CONSTRAINT "education_end_month_range" CHECK (end_month IS NULL OR (end_month BETWEEN 1 AND 12 AND end_year BETWEEN 1900 AND 2100)),
	CONSTRAINT "education_end_not_before_start" CHECK (start_year IS NULL OR end_year IS NULL OR (end_year * 12 + end_month) >= (start_year * 12 + start_month))
);
--> statement-breakpoint
CREATE TABLE "employment" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"employer_name" text NOT NULL,
	"role" text NOT NULL,
	"start_year" integer,
	"start_month" integer,
	"end_year" integer,
	"end_month" integer,
	"is_current" boolean DEFAULT false NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employment_profile_id_id_unique" UNIQUE("profile_id","id"),
	CONSTRAINT "employment_employer_name_not_blank" CHECK (btrim(employer_name) <> ''),
	CONSTRAINT "employment_role_not_blank" CHECK (btrim(role) <> ''),
	CONSTRAINT "employment_start_month_pair" CHECK ((start_year IS NULL) = (start_month IS NULL)),
	CONSTRAINT "employment_end_month_pair" CHECK ((end_year IS NULL) = (end_month IS NULL)),
	CONSTRAINT "employment_start_month_range" CHECK (start_month IS NULL OR (start_month BETWEEN 1 AND 12 AND start_year BETWEEN 1900 AND 2100)),
	CONSTRAINT "employment_end_month_range" CHECK (end_month IS NULL OR (end_month BETWEEN 1 AND 12 AND end_year BETWEEN 1900 AND 2100)),
	CONSTRAINT "employment_end_not_before_start" CHECK (start_year IS NULL OR end_year IS NULL OR (end_year * 12 + end_month) >= (start_year * 12 + start_month))
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"headline" text,
	"summary" text,
	"email" text,
	"phone" text,
	"location" text,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_display_name_not_blank" CHECK (btrim(display_name) <> '')
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"employment_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"url" text,
	"start_year" integer,
	"start_month" integer,
	"end_year" integer,
	"end_month" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_profile_id_id_unique" UNIQUE("profile_id","id"),
	CONSTRAINT "projects_name_not_blank" CHECK (btrim(name) <> ''),
	CONSTRAINT "projects_start_month_pair" CHECK ((start_year IS NULL) = (start_month IS NULL)),
	CONSTRAINT "projects_end_month_pair" CHECK ((end_year IS NULL) = (end_month IS NULL)),
	CONSTRAINT "projects_start_month_range" CHECK (start_month IS NULL OR (start_month BETWEEN 1 AND 12 AND start_year BETWEEN 1900 AND 2100)),
	CONSTRAINT "projects_end_month_range" CHECK (end_month IS NULL OR (end_month BETWEEN 1 AND 12 AND end_year BETWEEN 1900 AND 2100)),
	CONSTRAINT "projects_end_not_before_start" CHECK (start_year IS NULL OR end_year IS NULL OR (end_year * 12 + end_month) >= (start_year * 12 + start_month))
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skills_profile_id_id_unique" UNIQUE("profile_id","id"),
	CONSTRAINT "skills_profile_id_normalized_name_unique" UNIQUE("profile_id","normalized_name"),
	CONSTRAINT "skills_display_name_not_blank" CHECK (btrim(display_name) <> ''),
	CONSTRAINT "skills_normalized_name_not_blank" CHECK (btrim(normalized_name) <> '')
);
--> statement-breakpoint
ALTER TABLE "achievement_skills" ADD CONSTRAINT "achievement_skills_achievement_fk" FOREIGN KEY ("profile_id","achievement_id") REFERENCES "public"."achievements"("profile_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement_skills" ADD CONSTRAINT "achievement_skills_skill_fk" FOREIGN KEY ("profile_id","skill_id") REFERENCES "public"."skills"("profile_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_employment_fk" FOREIGN KEY ("profile_id","employment_id") REFERENCES "public"."employment"("profile_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_project_fk" FOREIGN KEY ("profile_id","project_id") REFERENCES "public"."projects"("profile_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education" ADD CONSTRAINT "education_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment" ADD CONSTRAINT "employment_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_employment_fk" FOREIGN KEY ("profile_id","employment_id") REFERENCES "public"."employment"("profile_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "achievement_skills_profile_id_skill_id_idx" ON "achievement_skills" USING btree ("profile_id","skill_id");--> statement-breakpoint
CREATE INDEX "achievements_profile_id_employment_id_idx" ON "achievements" USING btree ("profile_id","employment_id");--> statement-breakpoint
CREATE INDEX "achievements_profile_id_project_id_idx" ON "achievements" USING btree ("profile_id","project_id");--> statement-breakpoint
CREATE INDEX "education_profile_id_idx" ON "education" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "projects_profile_id_employment_id_idx" ON "projects" USING btree ("profile_id","employment_id");