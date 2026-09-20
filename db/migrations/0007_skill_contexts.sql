CREATE TABLE "skill_employment" (
	"profile_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	CONSTRAINT "skill_employment_skill_id_employment_id_pk" PRIMARY KEY("skill_id","employment_id")
);
--> statement-breakpoint
CREATE TABLE "skill_projects" (
	"profile_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	CONSTRAINT "skill_projects_skill_id_project_id_pk" PRIMARY KEY("skill_id","project_id")
);
--> statement-breakpoint
ALTER TABLE "skill_employment" ADD CONSTRAINT "skill_employment_skill_fk" FOREIGN KEY ("profile_id","skill_id") REFERENCES "public"."skills"("profile_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_employment" ADD CONSTRAINT "skill_employment_role_fk" FOREIGN KEY ("profile_id","employment_id") REFERENCES "public"."employment"("profile_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_projects" ADD CONSTRAINT "skill_projects_skill_fk" FOREIGN KEY ("profile_id","skill_id") REFERENCES "public"."skills"("profile_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_projects" ADD CONSTRAINT "skill_projects_project_fk" FOREIGN KEY ("profile_id","project_id") REFERENCES "public"."projects"("profile_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skill_employment_profile_role_idx" ON "skill_employment" USING btree ("profile_id","employment_id");--> statement-breakpoint
CREATE INDEX "skill_projects_profile_project_idx" ON "skill_projects" USING btree ("profile_id","project_id");