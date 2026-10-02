CREATE TABLE `applications` (
	`id` text PRIMARY KEY,
	`profile_id` text NOT NULL,
	`job_id` text NOT NULL,
	`status` text DEFAULT 'preparing' NOT NULL,
	`notes` text,
	`interest` text,
	`submitted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_applications_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `applications_job_fk` FOREIGN KEY (`profile_id`,`job_id`) REFERENCES `jobs`(`profile_id`,`id`) ON DELETE CASCADE,
	CONSTRAINT `applications_profile_id_job_id_unique` UNIQUE(`profile_id`,`job_id`),
	CONSTRAINT `applications_profile_id_id_unique` UNIQUE(`profile_id`,`id`),
	CONSTRAINT "applications_status_valid" CHECK(status IN ('preparing', 'ready', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn', 'accepted'))
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY,
	`profile_id` text NOT NULL,
	`name` text NOT NULL,
	`location` text,
	`website` text,
	`about` text,
	`logo_storage_key` text,
	`logo_content_type` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_companies_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `companies_profile_id_id_unique` UNIQUE(`profile_id`,`id`),
	CONSTRAINT "companies_logo_pair" CHECK((logo_storage_key IS NULL) = (logo_content_type IS NULL)),
	CONSTRAINT "companies_logo_content_type_valid" CHECK(logo_content_type IS NULL OR logo_content_type IN ('image/png', 'image/jpeg', 'image/webp', 'image/svg+xml')),
	CONSTRAINT "companies_name_not_blank" CHECK(trim(name) <> '')
);
--> statement-breakpoint
CREATE TABLE `company_findings` (
	`id` text PRIMARY KEY,
	`profile_id` text NOT NULL,
	`company_id` text NOT NULL,
	`text` text NOT NULL,
	`source_url` text NOT NULL,
	`retrieved_at` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_company_findings_profile_id_company_id_companies_profile_id_id_fk` FOREIGN KEY (`profile_id`,`company_id`) REFERENCES `companies`(`profile_id`,`id`) ON DELETE CASCADE,
	CONSTRAINT `company_findings_owner_company_id_unique` UNIQUE(`profile_id`,`company_id`,`id`),
	CONSTRAINT "company_findings_text_not_blank" CHECK(trim(text) <> ''),
	CONSTRAINT "company_findings_kind_valid" CHECK(kind IN ('statement','interpretation'))
);
--> statement-breakpoint
CREATE TABLE `document_artifacts` (
	`id` text PRIMARY KEY,
	`profile_id` text NOT NULL,
	`document_revision_id` text NOT NULL,
	`format` text NOT NULL,
	`template_version` integer NOT NULL,
	`storage_key` text NOT NULL,
	`checksum` text NOT NULL,
	`byte_size` integer NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_document_artifacts_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `document_artifacts_revision_fk` FOREIGN KEY (`profile_id`,`document_revision_id`) REFERENCES `document_revisions`(`profile_id`,`id`) ON DELETE CASCADE,
	CONSTRAINT `document_artifacts_revision_format_template_unique` UNIQUE(`document_revision_id`,`format`,`template_version`),
	CONSTRAINT "document_artifacts_format_valid" CHECK(format IN ('pdf'))
);
--> statement-breakpoint
CREATE TABLE `document_revisions` (
	`id` text PRIMARY KEY,
	`profile_id` text NOT NULL,
	`document_id` text NOT NULL,
	`generation_run_id` text,
	`content` text NOT NULL,
	`warnings` text DEFAULT '[]' NOT NULL,
	`source` text NOT NULL,
	`reviewed_at` integer,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_document_revisions_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_document_revisions_generation_run_id_generation_runs_id_fk` FOREIGN KEY (`generation_run_id`) REFERENCES `generation_runs`(`id`) ON DELETE SET NULL,
	CONSTRAINT `document_revisions_document_fk` FOREIGN KEY (`profile_id`,`document_id`) REFERENCES `documents`(`profile_id`,`id`) ON DELETE CASCADE,
	CONSTRAINT `document_revisions_profile_id_id_unique` UNIQUE(`profile_id`,`id`),
	CONSTRAINT "document_revisions_source_valid" CHECK(source IN ('generated', 'pasted', 'assistant', 'edited'))
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY,
	`profile_id` text NOT NULL,
	`application_id` text NOT NULL,
	`type` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_documents_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `documents_application_fk` FOREIGN KEY (`profile_id`,`application_id`) REFERENCES `applications`(`profile_id`,`id`) ON DELETE CASCADE,
	CONSTRAINT `documents_profile_id_application_id_type_unique` UNIQUE(`profile_id`,`application_id`,`type`),
	CONSTRAINT `documents_profile_id_id_unique` UNIQUE(`profile_id`,`id`),
	CONSTRAINT "documents_type_valid" CHECK(type IN ('resume', 'cover_letter', 'recruiter_message'))
);
--> statement-breakpoint
CREATE TABLE `generation_runs` (
	`id` text PRIMARY KEY,
	`profile_id` text NOT NULL,
	`application_id` text NOT NULL,
	`document_type` text NOT NULL,
	`state` text NOT NULL,
	`failure_kind` text,
	`mode` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`prompt_name` text NOT NULL,
	`prompt_version` integer NOT NULL,
	`snapshot` text NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`cost_usd` real,
	`latency_ms` integer,
	`error_message` text,
	`raw_output` text,
	`started_at` integer,
	`finished_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_generation_runs_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `generation_runs_application_fk` FOREIGN KEY (`profile_id`,`application_id`) REFERENCES `applications`(`profile_id`,`id`) ON DELETE CASCADE,
	CONSTRAINT `generation_runs_profile_id_id_unique` UNIQUE(`profile_id`,`id`),
	CONSTRAINT "generation_runs_document_type_valid" CHECK(document_type IN ('resume', 'cover_letter', 'recruiter_message')),
	CONSTRAINT "generation_runs_state_valid" CHECK(state IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
	CONSTRAINT "generation_runs_failure_kind_valid" CHECK(failure_kind IS NULL OR failure_kind IN ('provider', 'validation', 'pasted_invalid', 'interrupted')),
	CONSTRAINT "generation_runs_mode_valid" CHECK(mode IN ('adapter', 'pasted', 'assistant'))
);
--> statement-breakpoint
CREATE TABLE `job_finding_selections` (
	`profile_id` text NOT NULL,
	`job_id` text NOT NULL,
	`company_id` text NOT NULL,
	`finding_id` text NOT NULL,
	CONSTRAINT `job_finding_selections_pk` PRIMARY KEY(`job_id`, `finding_id`),
	CONSTRAINT `fk_job_finding_selections_profile_id_job_id_company_id_jobs_profile_id_id_company_id_fk` FOREIGN KEY (`profile_id`,`job_id`,`company_id`) REFERENCES `jobs`(`profile_id`,`id`,`company_id`) ON DELETE CASCADE,
	CONSTRAINT `fk_job_finding_selections_profile_id_company_id_finding_id_company_findings_profile_id_company_id_id_fk` FOREIGN KEY (`profile_id`,`company_id`,`finding_id`) REFERENCES `company_findings`(`profile_id`,`company_id`,`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `job_source_options` (
	`id` text PRIMARY KEY,
	`profile_id` text NOT NULL,
	`name` text NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_job_source_options_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `job_source_options_profile_id_id_unique` UNIQUE(`profile_id`,`id`),
	CONSTRAINT "job_source_options_name_not_blank" CHECK(trim(name) <> '')
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY,
	`profile_id` text NOT NULL,
	`title` text NOT NULL,
	`company_id` text,
	`location` text,
	`salary` text,
	`source` text DEFAULT 'pasted' NOT NULL,
	`source_url` text,
	`job_source_id` text,
	`raw_description` text NOT NULL,
	`availability` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_jobs_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `jobs_source_owner_fk` FOREIGN KEY (`profile_id`,`job_source_id`) REFERENCES `job_source_options`(`profile_id`,`id`),
	CONSTRAINT `fk_jobs_profile_id_company_id_companies_profile_id_id_fk` FOREIGN KEY (`profile_id`,`company_id`) REFERENCES `companies`(`profile_id`,`id`),
	CONSTRAINT `jobs_owner_company_unique` UNIQUE(`profile_id`,`id`,`company_id`),
	CONSTRAINT `jobs_profile_id_id_unique` UNIQUE(`profile_id`,`id`),
	CONSTRAINT "jobs_title_not_blank" CHECK(trim(title) <> ''),
	CONSTRAINT "jobs_raw_description_not_blank" CHECK(trim(raw_description) <> ''),
	CONSTRAINT "jobs_source_valid" CHECK(source IN ('pasted')),
	CONSTRAINT "jobs_availability_valid" CHECK(availability IN ('active', 'expired', 'unknown'))
);
--> statement-breakpoint
CREATE TABLE `achievement_skills` (
	`profile_id` text NOT NULL,
	`achievement_id` text NOT NULL,
	`skill_id` text NOT NULL,
	CONSTRAINT `achievement_skills_pk` PRIMARY KEY(`achievement_id`, `skill_id`),
	CONSTRAINT `achievement_skills_achievement_fk` FOREIGN KEY (`profile_id`,`achievement_id`) REFERENCES `achievements`(`profile_id`,`id`) ON DELETE CASCADE,
	CONSTRAINT `achievement_skills_skill_fk` FOREIGN KEY (`profile_id`,`skill_id`) REFERENCES `skills`(`profile_id`,`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `achievements` (
	`id` text PRIMARY KEY,
	`profile_id` text NOT NULL,
	`employment_id` text,
	`project_id` text,
	`statement` text NOT NULL,
	`problem` text,
	`action` text,
	`result` text,
	`metric` text,
	`source_note` text,
	`source_url` text,
	`reviewed` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_achievements_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `achievements_employment_fk` FOREIGN KEY (`profile_id`,`employment_id`) REFERENCES `employment`(`profile_id`,`id`) ON DELETE RESTRICT,
	CONSTRAINT `achievements_project_fk` FOREIGN KEY (`profile_id`,`project_id`) REFERENCES `projects`(`profile_id`,`id`) ON DELETE RESTRICT,
	CONSTRAINT `achievements_profile_id_id_unique` UNIQUE(`profile_id`,`id`),
	CONSTRAINT "achievements_statement_not_blank" CHECK(trim(statement) <> ''),
	CONSTRAINT "achievements_single_context" CHECK(employment_id IS NULL OR project_id IS NULL)
);
--> statement-breakpoint
CREATE TABLE `education` (
	`id` text PRIMARY KEY,
	`profile_id` text NOT NULL,
	`institution` text NOT NULL,
	`qualification` text,
	`subject` text,
	`start_year` integer,
	`start_month` integer,
	`end_year` integer,
	`end_month` integer,
	`status` text DEFAULT 'completed' NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_education_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
	CONSTRAINT "education_institution_not_blank" CHECK(trim(institution) <> ''),
	CONSTRAINT "education_status_valid" CHECK(status IN ('in_progress', 'completed', 'incomplete')),
	CONSTRAINT "education_start_month_pair" CHECK((start_year IS NULL) = (start_month IS NULL)),
	CONSTRAINT "education_end_month_pair" CHECK((end_year IS NULL) = (end_month IS NULL)),
	CONSTRAINT "education_start_month_range" CHECK(start_month IS NULL OR (start_month BETWEEN 1 AND 12 AND start_year BETWEEN 1900 AND 2100)),
	CONSTRAINT "education_end_month_range" CHECK(end_month IS NULL OR (end_month BETWEEN 1 AND 12 AND end_year BETWEEN 1900 AND 2100)),
	CONSTRAINT "education_end_not_before_start" CHECK(start_year IS NULL OR end_year IS NULL OR (end_year * 12 + end_month) >= (start_year * 12 + start_month))
);
--> statement-breakpoint
CREATE TABLE `employment` (
	`id` text PRIMARY KEY,
	`profile_id` text NOT NULL,
	`employer_name` text NOT NULL,
	`role` text NOT NULL,
	`location` text,
	`start_year` integer,
	`start_month` integer,
	`end_year` integer,
	`end_month` integer,
	`is_current` integer DEFAULT false NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_employment_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `employment_profile_id_id_unique` UNIQUE(`profile_id`,`id`),
	CONSTRAINT "employment_employer_name_not_blank" CHECK(trim(employer_name) <> ''),
	CONSTRAINT "employment_role_not_blank" CHECK(trim(role) <> ''),
	CONSTRAINT "employment_start_month_pair" CHECK((start_year IS NULL) = (start_month IS NULL)),
	CONSTRAINT "employment_end_month_pair" CHECK((end_year IS NULL) = (end_month IS NULL)),
	CONSTRAINT "employment_start_month_range" CHECK(start_month IS NULL OR (start_month BETWEEN 1 AND 12 AND start_year BETWEEN 1900 AND 2100)),
	CONSTRAINT "employment_end_month_range" CHECK(end_month IS NULL OR (end_month BETWEEN 1 AND 12 AND end_year BETWEEN 1900 AND 2100)),
	CONSTRAINT "employment_end_not_before_start" CHECK(start_year IS NULL OR end_year IS NULL OR (end_year * 12 + end_month) >= (start_year * 12 + start_month))
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY,
	`display_name` text NOT NULL,
	`headline` text,
	`summary` text,
	`about_me` text,
	`email` text,
	`phone` text,
	`location` text,
	`preferences` text DEFAULT '{}' NOT NULL,
	`links` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "profiles_display_name_not_blank" CHECK(trim(display_name) <> '')
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY,
	`profile_id` text NOT NULL,
	`employment_id` text,
	`name` text NOT NULL,
	`description` text,
	`url` text,
	`start_year` integer,
	`start_month` integer,
	`end_year` integer,
	`end_month` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_projects_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `projects_employment_fk` FOREIGN KEY (`profile_id`,`employment_id`) REFERENCES `employment`(`profile_id`,`id`) ON DELETE RESTRICT,
	CONSTRAINT `projects_profile_id_id_unique` UNIQUE(`profile_id`,`id`),
	CONSTRAINT "projects_name_not_blank" CHECK(trim(name) <> ''),
	CONSTRAINT "projects_start_month_pair" CHECK((start_year IS NULL) = (start_month IS NULL)),
	CONSTRAINT "projects_end_month_pair" CHECK((end_year IS NULL) = (end_month IS NULL)),
	CONSTRAINT "projects_start_month_range" CHECK(start_month IS NULL OR (start_month BETWEEN 1 AND 12 AND start_year BETWEEN 1900 AND 2100)),
	CONSTRAINT "projects_end_month_range" CHECK(end_month IS NULL OR (end_month BETWEEN 1 AND 12 AND end_year BETWEEN 1900 AND 2100)),
	CONSTRAINT "projects_end_not_before_start" CHECK(start_year IS NULL OR end_year IS NULL OR (end_year * 12 + end_month) >= (start_year * 12 + start_month))
);
--> statement-breakpoint
CREATE TABLE `skill_employment` (
	`profile_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`employment_id` text NOT NULL,
	CONSTRAINT `skill_employment_pk` PRIMARY KEY(`skill_id`, `employment_id`),
	CONSTRAINT `skill_employment_skill_fk` FOREIGN KEY (`profile_id`,`skill_id`) REFERENCES `skills`(`profile_id`,`id`) ON DELETE CASCADE,
	CONSTRAINT `skill_employment_role_fk` FOREIGN KEY (`profile_id`,`employment_id`) REFERENCES `employment`(`profile_id`,`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `skill_projects` (
	`profile_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`project_id` text NOT NULL,
	CONSTRAINT `skill_projects_pk` PRIMARY KEY(`skill_id`, `project_id`),
	CONSTRAINT `skill_projects_skill_fk` FOREIGN KEY (`profile_id`,`skill_id`) REFERENCES `skills`(`profile_id`,`id`) ON DELETE CASCADE,
	CONSTRAINT `skill_projects_project_fk` FOREIGN KEY (`profile_id`,`project_id`) REFERENCES `projects`(`profile_id`,`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` text PRIMARY KEY,
	`profile_id` text NOT NULL,
	`display_name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`category` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_skills_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `skills_profile_id_normalized_name_unique` UNIQUE(`profile_id`,`normalized_name`),
	CONSTRAINT `skills_profile_id_id_unique` UNIQUE(`profile_id`,`id`),
	CONSTRAINT "skills_display_name_not_blank" CHECK(trim(display_name) <> ''),
	CONSTRAINT "skills_normalized_name_not_blank" CHECK(trim(normalized_name) <> '')
);
--> statement-breakpoint
CREATE INDEX `document_revisions_profile_id_document_id_created_at_idx` ON `document_revisions` (`profile_id`,`document_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `generation_runs_profile_id_application_id_created_at_idx` ON `generation_runs` (`profile_id`,`application_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `jobs_profile_id_updated_at_idx` ON `jobs` (`profile_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `achievement_skills_profile_id_skill_id_idx` ON `achievement_skills` (`profile_id`,`skill_id`);--> statement-breakpoint
CREATE INDEX `achievements_profile_id_employment_id_idx` ON `achievements` (`profile_id`,`employment_id`);--> statement-breakpoint
CREATE INDEX `achievements_profile_id_project_id_idx` ON `achievements` (`profile_id`,`project_id`);--> statement-breakpoint
CREATE INDEX `education_profile_id_idx` ON `education` (`profile_id`);--> statement-breakpoint
CREATE INDEX `projects_profile_id_employment_id_idx` ON `projects` (`profile_id`,`employment_id`);--> statement-breakpoint
CREATE INDEX `skill_employment_profile_role_idx` ON `skill_employment` (`profile_id`,`employment_id`);--> statement-breakpoint
CREATE INDEX `skill_projects_profile_project_idx` ON `skill_projects` (`profile_id`,`project_id`);