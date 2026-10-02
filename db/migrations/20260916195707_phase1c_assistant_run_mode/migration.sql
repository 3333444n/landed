ALTER TABLE "document_revisions" DROP CONSTRAINT "document_revisions_source_valid";--> statement-breakpoint
ALTER TABLE "generation_runs" DROP CONSTRAINT "generation_runs_mode_valid";--> statement-breakpoint
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_source_valid" CHECK (source IN ('generated', 'pasted', 'assistant', 'edited'));--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_mode_valid" CHECK (mode IN ('adapter', 'pasted', 'assistant'));