import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import type { DatabaseConnection } from "@/infrastructure/database";
import { createAchievement, createProfile, listAchievements } from "@/modules/profile";
import * as repo from "@/modules/profile/repository";
import { skills } from "@/modules/profile/schema";
import { openTestDatabase, testDatabaseUrl, truncateAll } from "../helpers/test-database";
import { createDatabase } from "@/infrastructure/database";

vi.mock("@/modules/profile/repository", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/modules/profile/repository")>();
  return { ...original, insertAchievementSkills: vi.fn(original.insertAchievementSkills) };
});

// Values from examples/demo-profile.json (fictional).
const demo = {
  profileId: "10000000-0000-4000-8000-000000000001",
  displayName: "Alex Rivera",
  achievementId: "50000000-0000-4000-8000-000000000003",
  statement: "Documented a local development setup for a volunteer team.",
  sourceNote: "Fictional standalone contribution.",
  skillId: "60000000-0000-4000-8000-000000000001",
};

let connection: DatabaseConnection;

beforeAll(async () => {
  connection = await openTestDatabase();
});

afterAll(async () => {
  await connection.close();
});

beforeEach(async () => {
  await truncateAll(connection);
  vi.mocked(repo.insertAchievementSkills).mockClear();
});

async function seedProfileAndSkill() {
  const profile = await createProfile(
    { db: connection.db },
    { id: demo.profileId, displayName: demo.displayName },
  );
  if (!profile.ok) throw new Error("profile seed failed");
  await connection.db.insert(skills).values({
    id: demo.skillId,
    profileId: demo.profileId,
    displayName: "PostgreSQL",
    normalizedName: "postgresql",
  });
}

describe("createAchievement", () => {
  it("saves the achievement with its skill link and reads it back on a fresh connection", async () => {
    await seedProfileAndSkill();

    const result = await createAchievement({ db: connection.db }, demo.profileId, {
      id: demo.achievementId,
      statement: demo.statement,
      sourceNote: demo.sourceNote,
      skillIds: [demo.skillId],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.statement).toBe(demo.statement);
    expect(result.value.reviewed).toBe(false);
    expect(result.value.skillIds).toEqual([demo.skillId]);

    // A new pool stands in for a restarted process: only committed rows are visible.
    const fresh = createDatabase(testDatabaseUrl());
    try {
      const list = await listAchievements({ db: fresh.db }, demo.profileId);
      expect(list).toHaveLength(1);
      expect(list[0]?.id).toBe(demo.achievementId);
      expect(list[0]?.skillIds).toEqual([demo.skillId]);
    } finally {
      await fresh.close();
    }
  });

  it("rejects a blank statement with a field error and writes nothing", async () => {
    await seedProfileAndSkill();
    const result = await createAchievement({ db: connection.db }, demo.profileId, {
      statement: "   ",
    });
    expect(result).toEqual({
      ok: false,
      error: { kind: "validation", fieldErrors: { statement: ["Write the factual statement"] } },
    });
    expect(await listAchievements({ db: connection.db }, demo.profileId)).toHaveLength(0);
  });

  it("rejects two context links before touching the database", async () => {
    await seedProfileAndSkill();
    const result = await createAchievement({ db: connection.db }, demo.profileId, {
      statement: demo.statement,
      employmentId: "20000000-0000-4000-8000-000000000001",
      projectId: "40000000-0000-4000-8000-000000000001",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation");
    if (result.error.kind !== "validation") return;
    expect(result.error.fieldErrors.projectId).toEqual([
      "Link the achievement to a job or a project, not both",
    ]);
  });

  it("rejects a context link that belongs to no record in the profile", async () => {
    await seedProfileAndSkill();
    const result = await createAchievement({ db: connection.db }, demo.profileId, {
      statement: demo.statement,
      employmentId: "20000000-0000-4000-8000-000000000009",
    });
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "validation",
        fieldErrors: { employmentId: ["That job is not in your profile"] },
      },
    });
  });

  it("rolls back the achievement row when the skill links fail to write", async () => {
    await seedProfileAndSkill();
    vi.mocked(repo.insertAchievementSkills).mockImplementationOnce(async () => {
      throw new Error("simulated failure while writing skill links");
    });
    await expect(
      createAchievement({ db: connection.db }, demo.profileId, {
        statement: demo.statement,
        skillIds: [demo.skillId],
      }),
    ).rejects.toThrow("simulated failure");
    const count = await connection.db.execute(sql`SELECT count(*)::int AS n FROM achievements`);
    expect(count.rows[0]?.n).toBe(0);
  });

  it("returns the same record and keeps one row when a create is retried with the same id", async () => {
    await seedProfileAndSkill();
    const input = { id: demo.achievementId, statement: demo.statement, skillIds: [demo.skillId] };
    const first = await createAchievement({ db: connection.db }, demo.profileId, input);
    const second = await createAchievement({ db: connection.db }, demo.profileId, input);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.value.id).toBe(first.value.id);
    expect(second.value.skillIds).toEqual([demo.skillId]);
    expect(await listAchievements({ db: connection.db }, demo.profileId)).toHaveLength(1);
  });
});

describe("createProfile", () => {
  it("creates the single profile and refuses a second one", async () => {
    const first = await createProfile({ db: connection.db }, { displayName: "Alex Rivera" });
    expect(first.ok).toBe(true);
    const second = await createProfile({ db: connection.db }, { displayName: "Someone Else" });
    expect(second).toEqual({
      ok: false,
      error: { kind: "conflict", message: "A profile already exists in this installation" },
    });
  });

  it("rejects a blank name", async () => {
    const result = await createProfile({ db: connection.db }, { displayName: "  " });
    expect(result).toEqual({
      ok: false,
      error: { kind: "validation", fieldErrors: { displayName: ["Enter your name"] } },
    });
  });
});
