ALTER TABLE "jobs" ADD COLUMN "logo_storage_key" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "logo_content_type" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_logo_pair" CHECK ((logo_storage_key IS NULL) = (logo_content_type IS NULL));--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_logo_content_type_valid" CHECK (logo_content_type IS NULL OR logo_content_type IN ('image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'));