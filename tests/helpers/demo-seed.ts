/*
 * The fictional demo profile from examples/demo-profile.json, written through the Profile module
 * so integration tests start from the same facts the fixtures cite.
 */
import {
  createAchievement,
  createProfile,
  saveEducation,
  saveEmployment,
  saveProject,
  saveSkill,
  updateProfile,
} from "@/modules/profile";
import type { BaseDeps } from "@/modules/shared/service";

// Values from examples/demo-profile.json (fictional); the fixtures cite these ids.
export const demo = {
  profileId: "10000000-0000-4000-8000-000000000001",
  employmentId: "20000000-0000-4000-8000-000000000001",
  educationId: "30000000-0000-4000-8000-000000000001",
  projectId: "40000000-0000-4000-8000-000000000001",
  achievementIds: [
    "50000000-0000-4000-8000-000000000001",
    "50000000-0000-4000-8000-000000000002",
    "50000000-0000-4000-8000-000000000003",
  ],
  skillIds: ["60000000-0000-4000-8000-000000000001", "60000000-0000-4000-8000-000000000002"],
  jobId: "70000000-0000-4000-8000-000000000001",
  job: {
    title: "Full-stack developer",
    companyName: "Example Analytics",
    location: "Remote",
    rawDescription:
      "Example Analytics is looking for a full-stack developer to build internal reporting tools.\n\nYou will work with PostgreSQL and TypeScript.",
  },
};

export function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

export async function seedDemoProfile(deps: () => BaseDeps): Promise<void> {
  unwrap(await createProfile(deps(), { id: demo.profileId, displayName: "Alex Rivera" }));
  unwrap(
    await updateProfile(deps(), demo.profileId, {
      displayName: "Alex Rivera",
      headline: "Software developer",
      email: "alex@example.com",
      location: "Mexico City",
      summary: "Builds internal tools and accessible web interfaces.",
    }),
  );
  unwrap(
    await saveEmployment(deps(), demo.profileId, {
      id: demo.employmentId,
      employerName: "Example Workshop",
      role: "Software developer",
      startYear: "2023",
      startMonth: "4",
      endYear: "2025",
      endMonth: "6",
    }),
  );
  unwrap(
    await saveEducation(deps(), demo.profileId, {
      id: demo.educationId,
      institution: "Example Learning Institute",
      qualification: "Web development certificate",
      subject: "Software development",
      status: "completed",
    }),
  );
  unwrap(
    await saveProject(deps(), demo.profileId, {
      id: demo.projectId,
      name: "Community Tool Library",
      description: "A volunteer project for tracking borrowed tools.",
    }),
  );
  unwrap(
    await saveSkill(deps(), demo.profileId, { id: demo.skillIds[0], displayName: "PostgreSQL" }),
  );
  unwrap(
    await saveSkill(deps(), demo.profileId, {
      id: demo.skillIds[1],
      displayName: "Web accessibility",
    }),
  );
  unwrap(
    await createAchievement(deps(), demo.profileId, {
      id: demo.achievementIds[0],
      employmentId: demo.employmentId,
      statement:
        "Reduced weekly report preparation from four hours to one by building a PostgreSQL-backed reporting tool.",
      problem: "Manual preparation of weekly reports.",
      action: "Built a reporting tool with reusable SQL queries.",
      result: "Weekly preparation took one hour.",
      metric: "4 hours to 1 hour per week",
      skillIds: [demo.skillIds[0]],
    }),
  );
  unwrap(
    await createAchievement(deps(), demo.profileId, {
      id: demo.achievementIds[1],
      projectId: demo.projectId,
      statement: "Implemented keyboard-accessible forms for recording tool loans.",
      skillIds: [demo.skillIds[1]],
    }),
  );
  unwrap(
    await createAchievement(deps(), demo.profileId, {
      id: demo.achievementIds[2],
      statement: "Documented a local development setup for a volunteer team.",
    }),
  );
}
