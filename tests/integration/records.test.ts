import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { DatabaseConnection } from "@/infrastructure/database";
import {
  createAchievement,
  createProfile,
  deleteAchievement,
  deleteEmployment,
  deleteProject,
  deleteSkill,
  getAchievement,
  listEmployment,
  listSkills,
  saveEducation,
  saveEmployment,
  saveProject,
  saveSkill,
  updateAchievement,
  updateProfile,
} from "@/modules/profile";
import { openTestDatabase, truncateAll } from "../helpers/test-database";

// Values from examples/demo-profile.json (fictional).
const demo = {
  profileId: "10000000-0000-4000-8000-000000000001",
  employmentId: "20000000-0000-4000-8000-000000000001",
  projectId: "40000000-0000-4000-8000-000000000001",
  skillId: "60000000-0000-4000-8000-000000000001",
};

let connection: DatabaseConnection;
const deps = () => ({ db: connection.db });

beforeAll(async () => {
  connection = await openTestDatabase();
});
afterAll(async () => {
  await connection.close();
});
beforeEach(async () => {
  await truncateAll(connection);
  const profile = await createProfile(deps(), { id: demo.profileId, displayName: "Alex Rivera" });
  if (!profile.ok) throw new Error("profile seed failed");
});

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

describe("profile", () => {
  it("updates contact details and preferences, and detects a stale form", async () => {
    const first = unwrap(
      await updateProfile(deps(), demo.profileId, {
        displayName: "Alex Rivera",
        headline: "Software developer",
        email: "alex@example.com",
        desiredRoles: "Full-stack developer, Backend developer",
        workArrangement: ["remote"],
      }),
    );
    expect(first.headline).toBe("Software developer");
    expect(first.preferences).toEqual({
      desiredRoles: ["Full-stack developer", "Backend developer"],
      locations: [],
      workArrangement: ["remote"],
    });

    const staleToken = new Date(first.updatedAt.getTime() - 1000).toISOString();
    const stale = await updateProfile(deps(), demo.profileId, {
      displayName: "Alex R.",
      expectedUpdatedAt: staleToken,
    });
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error.kind).toBe("stale");

    const fresh = await updateProfile(deps(), demo.profileId, {
      displayName: "Alex R.",
      expectedUpdatedAt: first.updatedAt.toISOString(),
    });
    expect(fresh.ok).toBe(true);
  });

  it("rejects a malformed email", async () => {
    const result = await updateProfile(deps(), demo.profileId, {
      displayName: "Alex Rivera",
      email: "not-an-email",
    });
    expect(result).toEqual({
      ok: false,
      error: { kind: "validation", fieldErrors: { email: ["Enter a valid email address"] } },
    });
  });
});

describe("employment", () => {
  it("creates, updates in place and lists current roles first", async () => {
    const older = unwrap(
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
    expect(older.startYear).toBe(2023);
    expect(older.isCurrent).toBe(false);

    const current = unwrap(
      await saveEmployment(deps(), demo.profileId, {
        employerName: "Example Studio",
        role: "Developer",
        isCurrent: "on",
      }),
    );
    expect(current.isCurrent).toBe(true);

    const updated = unwrap(
      await saveEmployment(
        deps(),
        demo.profileId,
        { employerName: "Example Workshop", role: "Senior developer" },
        older.id,
      ),
    );
    expect(updated.role).toBe("Senior developer");
    expect(updated.id).toBe(older.id);

    const list = await listEmployment(deps(), demo.profileId);
    expect(list.map((e) => e.employerName)).toEqual(["Example Studio", "Example Workshop"]);
  });

  it("rejects a month without a year before writing", async () => {
    const result = await saveEmployment(deps(), demo.profileId, {
      employerName: "E",
      role: "R",
      startMonth: "4",
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === "validation") {
      expect(result.error.fieldErrors.startMonth).toBeDefined();
    }
    expect(await listEmployment(deps(), demo.profileId)).toHaveLength(0);
  });

  it("refuses to delete a job that achievements still reference", async () => {
    unwrap(
      await saveEmployment(deps(), demo.profileId, {
        id: demo.employmentId,
        employerName: "Example Workshop",
        role: "Software developer",
      }),
    );
    unwrap(
      await createAchievement(deps(), demo.profileId, {
        statement: "Reduced weekly report preparation.",
        employmentId: demo.employmentId,
      }),
    );
    const blocked = await deleteEmployment(deps(), demo.profileId, demo.employmentId);
    expect(blocked).toEqual({
      ok: false,
      error: {
        kind: "conflict",
        message: "Detach the 1 achievement that reference this role before deleting it",
      },
    });
    expect(await listEmployment(deps(), demo.profileId)).toHaveLength(1);
  });
});

describe("education", () => {
  it("stores a completed programme with month-only dates", async () => {
    const record = unwrap(
      await saveEducation(deps(), demo.profileId, {
        institution: "Example Learning Institute",
        qualification: "Web development certificate",
        startYear: "2022",
        startMonth: "1",
        endYear: "2022",
        endMonth: "9",
        status: "completed",
      }),
    );
    expect(record.status).toBe("completed");
    expect(record.endMonth).toBe(9);
  });

  it("rejects an unknown status", async () => {
    const result = await saveEducation(deps(), demo.profileId, {
      institution: "X",
      status: "graduated",
    });
    expect(result.ok).toBe(false);
  });
});

describe("projects", () => {
  it("links a project to a job in the same profile and blocks deleting while referenced", async () => {
    unwrap(
      await saveEmployment(deps(), demo.profileId, {
        id: demo.employmentId,
        employerName: "Example Workshop",
        role: "Software developer",
      }),
    );
    const project = unwrap(
      await saveProject(deps(), demo.profileId, {
        id: demo.projectId,
        name: "Community Tool Library",
        employmentId: demo.employmentId,
        url: "https://example.com/tools",
      }),
    );
    expect(project.employmentId).toBe(demo.employmentId);

    unwrap(
      await createAchievement(deps(), demo.profileId, {
        statement: "Implemented keyboard-accessible forms for recording tool loans.",
        projectId: demo.projectId,
      }),
    );
    const blocked = await deleteProject(deps(), demo.profileId, demo.projectId);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.kind).toBe("conflict");
  });

  it("rejects a job link that is not in the profile", async () => {
    const result = await saveProject(deps(), demo.profileId, {
      name: "X",
      employmentId: "20000000-0000-4000-8000-000000000009",
    });
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "validation",
        fieldErrors: { employmentId: ["That role is not in your profile"] },
      },
    });
  });
});

describe("skills", () => {
  it("normalizes names and refuses a duplicate within the profile", async () => {
    const skill = unwrap(
      await saveSkill(deps(), demo.profileId, {
        id: demo.skillId,
        displayName: "  Web   Accessibility ",
      }),
    );
    expect(skill.displayName).toBe("Web   Accessibility".trim());
    expect(skill.normalizedName).toBe("web accessibility");

    const duplicate = await saveSkill(deps(), demo.profileId, { displayName: "web accessibility" });
    expect(duplicate).toEqual({
      ok: false,
      error: {
        kind: "validation",
        fieldErrors: { displayName: ["You already have a skill with this name"] },
      },
    });
    expect(await listSkills(deps(), demo.profileId)).toHaveLength(1);
  });

  it("deleting a skill removes its links but keeps the achievement", async () => {
    unwrap(
      await saveSkill(deps(), demo.profileId, { id: demo.skillId, displayName: "PostgreSQL" }),
    );
    const achievement = unwrap(
      await createAchievement(deps(), demo.profileId, {
        statement: "Built a reporting tool.",
        skillIds: [demo.skillId],
      }),
    );
    unwrap(await deleteSkill(deps(), demo.profileId, demo.skillId));
    const after = await getAchievement(deps(), demo.profileId, achievement.id);
    expect(after?.skillIds).toEqual([]);
  });
});

describe("achievement edits", () => {
  it("replaces skill links, clears the reviewed flag when the statement changes, and deletes cleanly", async () => {
    unwrap(
      await saveSkill(deps(), demo.profileId, { id: demo.skillId, displayName: "PostgreSQL" }),
    );
    const second = unwrap(await saveSkill(deps(), demo.profileId, { displayName: "SQL" }));
    const created = unwrap(
      await createAchievement(deps(), demo.profileId, {
        statement: "Built a reporting tool.",
        skillIds: [demo.skillId],
      }),
    );

    const reviewed = unwrap(
      await updateAchievement(deps(), demo.profileId, created.id, {
        statement: "Built a reporting tool.",
        reviewed: "on",
        skillIds: [second.id],
      }),
    );
    expect(reviewed.reviewed).toBe(true);
    expect(reviewed.skillIds).toEqual([second.id]);

    const edited = unwrap(
      await updateAchievement(deps(), demo.profileId, created.id, {
        statement: "Built a PostgreSQL-backed reporting tool.",
        reviewed: "on",
        skillIds: [second.id, demo.skillId],
        expectedUpdatedAt: reviewed.updatedAt.toISOString(),
      }),
    );
    expect(edited.reviewed).toBe(false);
    expect(edited.skillIds.sort()).toEqual([second.id, demo.skillId].sort());

    const stale = await updateAchievement(deps(), demo.profileId, created.id, {
      statement: "Something else.",
      expectedUpdatedAt: reviewed.updatedAt.toISOString(),
    });
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error.kind).toBe("stale");

    unwrap(await deleteAchievement(deps(), demo.profileId, created.id));
    expect(await getAchievement(deps(), demo.profileId, created.id)).toBeNull();
    expect(await listSkills(deps(), demo.profileId)).toHaveLength(2);
  });
});
