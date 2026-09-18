import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { schema, type DatabaseConnection } from "@/infrastructure/database";
import {
  createAchievement,
  createProfile,
  deleteAchievement,
  deleteEducation,
  deleteEmployment,
  deleteProject,
  deleteSkill,
  getAchievement,
  getCurrentProfile,
  getSkill,
  listAchievements,
  patchAchievement,
  patchEducation,
  patchEmployment,
  patchProfile,
  patchProject,
  patchSkill,
  saveEducation,
  saveEmployment,
  saveProject,
  saveSkill,
  updateAchievement,
  updateProfile,
  type Result,
} from "@/modules/profile";
import { openTestDatabase, testDatabaseUrl, truncateAll } from "../helpers/test-database";

let connection: DatabaseConnection;
let profileId: string;
const deps = () => ({ db: connection.db });
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}
const version = (record: { updatedAt: Date }) => ({
  expectedUpdatedAt: record.updatedAt.toISOString(),
});
const failure = (kind: string) => ({ ok: false, error: expect.objectContaining({ kind }) });

beforeAll(async () => {
  connection = await openTestDatabase();
});
afterAll(async () => {
  await connection.close();
});
beforeEach(async () => {
  await truncateAll(connection);
  profileId = unwrap(await createProfile(deps(), { displayName: "Alex Rivera" })).id;
});

describe("conversational profile patches", () => {
  it("merges profile fields, preferences and links, and clears only explicit values", async () => {
    const original = unwrap(
      await updateProfile(deps(), profileId, {
        displayName: "Alex Rivera",
        email: "alex@example.com",
        headline: "Developer",
        desiredRoles: ["Developer"],
        locations: ["Lisbon"],
        workArrangement: ["remote"],
        constraints: "Part time",
        linkedinUrl: "https://example.com/alex",
        githubUrl: "https://example.com/code",
      }),
    );
    const changed = unwrap(
      await patchProfile(deps(), profileId, {
        ...version(original),
        headline: "Backend developer",
        locations: [],
        constraints: null,
        linkedinUrl: null,
      }),
    );
    expect(changed.email).toBe(original.email);
    expect(changed.headline).toBe("Backend developer");
    expect(changed.preferences).toEqual({
      desiredRoles: ["Developer"],
      locations: [],
      workArrangement: ["remote"],
    });
    expect(changed.links).toEqual([{ label: "GitHub", url: "https://example.com/code" }]);
    expect(await patchProfile(deps(), profileId, { ...version(original), phone: "123" })).toEqual(
      failure("stale"),
    );
    expect(await patchProfile(deps(), profileId, { headline: "Missing version" })).toEqual(
      failure("validation"),
    );
  });

  it("preserves omitted role dates and rejects invalid merged dates without writing", async () => {
    const original = unwrap(
      await saveEmployment(deps(), profileId, {
        employerName: "Example Workshop",
        role: "Developer",
        startYear: 2022,
        startMonth: 3,
        endYear: 2024,
        endMonth: 7,
        location: "Lisbon",
        isCurrent: false,
      }),
    );
    const changed = unwrap(
      await patchEmployment(deps(), profileId, original.id, {
        ...version(original),
        role: "Engineer",
      }),
    );
    expect(changed.startYear).toBe(2022);
    expect(changed.endMonth).toBe(7);
    expect(changed.location).toBe("Lisbon");
    expect(
      await patchEmployment(deps(), profileId, original.id, {
        ...version(changed),
        startYear: null,
      }),
    ).toEqual(failure("validation"));
    const cleared = unwrap(
      await patchEmployment(deps(), profileId, original.id, {
        ...version(changed),
        startYear: null,
        startMonth: null,
      }),
    );
    expect(cleared.startYear).toBeNull();
    expect(cleared.startMonth).toBeNull();
  });

  it("patches education, projects and skills with existing ownership and normalization rules", async () => {
    const education = unwrap(
      await saveEducation(deps(), profileId, {
        institution: "Example Institute",
        qualification: "Certificate",
        status: "completed",
      }),
    );
    const editedEducation = unwrap(
      await patchEducation(deps(), profileId, education.id, {
        ...version(education),
        subject: "Computing",
      }),
    );
    expect(editedEducation.qualification).toBe("Certificate");
    expect(editedEducation.status).toBe("completed");
    const role = unwrap(
      await saveEmployment(deps(), profileId, {
        employerName: "Example Workshop",
        role: "Developer",
      }),
    );
    const project = unwrap(
      await saveProject(deps(), profileId, {
        name: "Tool Library",
        employmentId: role.id,
        url: "https://example.com/tools",
      }),
    );
    const editedProject = unwrap(
      await patchProject(deps(), profileId, project.id, {
        ...version(project),
        description: "A library catalogue",
      }),
    );
    expect(editedProject.employmentId).toBe(role.id);
    expect(editedProject.url).toBe(project.url);
    expect(
      await patchProject(deps(), profileId, project.id, {
        ...version(editedProject),
        employmentId: crypto.randomUUID(),
      }),
    ).toEqual(failure("validation"));
    const skill = unwrap(
      await saveSkill(deps(), profileId, { displayName: "SQL", category: "Database" }),
    );
    const editedSkill = unwrap(
      await patchSkill(deps(), profileId, skill.id, {
        ...version(skill),
        displayName: " PostgreSQL ",
      }),
    );
    expect(editedSkill.normalizedName).toBe("postgresql");
    expect(editedSkill.category).toBe("Database");
    unwrap(await saveSkill(deps(), profileId, { displayName: "JavaScript" }));
    expect(
      await patchSkill(deps(), profileId, skill.id, {
        ...version(editedSkill),
        displayName: "javascript",
      }),
    ).toEqual(failure("validation"));
  });

  it("preserves achievement links and reviewed state until the statement changes", async () => {
    const skill = unwrap(await saveSkill(deps(), profileId, { displayName: "SQL" }));
    const created = unwrap(
      await createAchievement(deps(), profileId, {
        statement: "Built a catalogue.",
        skillIds: [skill.id],
      }),
    );
    const reviewed = unwrap(
      await updateAchievement(deps(), profileId, created.id, {
        ...version(created),
        statement: created.statement,
        skillIds: [skill.id],
        reviewed: true,
      }),
    );
    const annotated = unwrap(
      await patchAchievement(deps(), profileId, created.id, {
        ...version(reviewed),
        sourceNote: "Fictional example",
      }),
    );
    expect(annotated.reviewed).toBe(true);
    expect(annotated.skillIds).toEqual([skill.id]);
    expect(
      await patchAchievement(deps(), profileId, created.id, {
        ...version(annotated),
        reviewed: false,
      }),
    ).toEqual(failure("validation"));
    const changed = unwrap(
      await patchAchievement(deps(), profileId, created.id, {
        ...version(annotated),
        statement: "Built a searchable catalogue.",
        skillIds: [],
      }),
    );
    expect(changed.reviewed).toBe(false);
    expect(changed.skillIds).toEqual([]);
  });

  it("allows only one concurrent edit of the same version, including with a fixed clock", async () => {
    const fixedDeps = { ...deps(), now: () => new Date("2026-01-01T00:00:00.000Z") };
    const skill = unwrap(await saveSkill(fixedDeps, profileId, { displayName: "SQL" }));
    const edits = await Promise.all([
      patchSkill(fixedDeps, profileId, skill.id, { ...version(skill), displayName: "PostgreSQL" }),
      patchSkill(fixedDeps, profileId, skill.id, { ...version(skill), category: "Database" }),
    ]);
    expect(edits.filter((result) => result.ok)).toHaveLength(1);
    expect(edits.filter((result) => !result.ok)).toEqual([failure("stale")]);
  });
});

describe("version-checked individual deletion", () => {
  it("rejects stale deletes for every career record type", async () => {
    const rows = [
      [
        unwrap(
          await saveEmployment(deps(), profileId, {
            employerName: "Example Workshop",
            role: "Developer",
          }),
        ),
        deleteEmployment,
      ],
      [
        unwrap(
          await saveEducation(deps(), profileId, {
            institution: "Example Institute",
            status: "completed",
          }),
        ),
        deleteEducation,
      ],
      [unwrap(await saveProject(deps(), profileId, { name: "Catalogue" })), deleteProject],
      [unwrap(await saveSkill(deps(), profileId, { displayName: "SQL" })), deleteSkill],
      [
        unwrap(await createAchievement(deps(), profileId, { statement: "Built a catalogue." })),
        deleteAchievement,
      ],
    ] as const;
    for (const [row, remove] of rows) {
      expect(await remove(deps(), profileId, row.id, "2020-01-01T00:00:00.000Z")).toEqual(
        failure("stale"),
      );
      expect(await remove(deps(), profileId, row.id, row.updatedAt.toISOString())).toEqual({
        ok: true,
        value: undefined,
      });
    }
  });

  it("invalidates affected achievements on skill deletion and rejects stale link restoration", async () => {
    const skill = unwrap(await saveSkill(deps(), profileId, { displayName: "SQL" }));
    const achievement = unwrap(
      await createAchievement(deps(), profileId, {
        statement: "Built a catalogue.",
        skillIds: [skill.id],
      }),
    );
    expect(await deleteSkill(deps(), profileId, skill.id, "2020-01-01T00:00:00.000Z")).toEqual(
      failure("stale"),
    );
    expect((await getAchievement(deps(), profileId, achievement.id))?.updatedAt).toEqual(
      achievement.updatedAt,
    );
    unwrap(await deleteSkill(deps(), profileId, skill.id, skill.updatedAt.toISOString()));
    const after = await getAchievement(deps(), profileId, achievement.id);
    expect(after?.skillIds).toEqual([]);
    expect(after!.updatedAt.getTime()).toBeGreaterThan(achievement.updatedAt.getTime());
    expect(
      await patchAchievement(deps(), profileId, achievement.id, {
        ...version(achievement),
        sourceNote: "New note",
      }),
    ).toEqual(failure("stale"));
    expect(await getSkill(deps(), profileId, skill.id)).toBeNull();
  });

  it("preserves dependency restrictions with a fresh version", async () => {
    const role = unwrap(
      await saveEmployment(deps(), profileId, {
        employerName: "Example Workshop",
        role: "Developer",
      }),
    );
    const project = unwrap(
      await saveProject(deps(), profileId, { name: "Catalogue", employmentId: role.id }),
    );
    const achievement = unwrap(
      await createAchievement(deps(), profileId, {
        statement: "Built a catalogue.",
        projectId: project.id,
      }),
    );
    expect(
      await deleteEmployment(deps(), profileId, role.id, role.updatedAt.toISOString()),
    ).toEqual(failure("conflict"));
    expect(
      await deleteProject(deps(), profileId, project.id, project.updatedAt.toISOString()),
    ).toEqual(failure("conflict"));
    expect(await getAchievement(deps(), profileId, achievement.id)).not.toBeNull();
  });
});

it("serializes first-profile creation and permits a retry with the original id", async () => {
  await truncateAll(connection);
  const ids = [crypto.randomUUID(), crypto.randomUUID()];
  const results = await Promise.all(
    ids.map((id) => createProfile(deps(), { id, displayName: "Alex Rivera" })),
  );
  expect(results.filter((result) => result.ok)).toHaveLength(1);
  expect(results.filter((result) => !result.ok)).toEqual([failure("conflict")]);
  const current = await getCurrentProfile(deps());
  expect(current).not.toBeNull();
  expect(
    unwrap(await createProfile(deps(), { id: current!.id, displayName: "Alex Rivera" })).id,
  ).toBe(current!.id);
});

it("reads achievement versions and skill links in one statement snapshot", async () => {
  const skills = [
    unwrap(await saveSkill(deps(), profileId, { displayName: "SQL" })),
    unwrap(await saveSkill(deps(), profileId, { displayName: "Testing" })),
  ];
  const linked = unwrap(
    await createAchievement(deps(), profileId, {
      statement: "Built a searchable catalogue.",
      skillIds: skills.map((skill) => skill.id),
    }),
  );
  const unlinked = unwrap(
    await createAchievement(deps(), profileId, {
      statement: "Documented the catalogue.",
    }),
  );
  const statements: string[] = [];
  const pool = new Pool({ connectionString: testDatabaseUrl() });
  const db = drizzle({
    client: pool,
    schema,
    logger: {
      logQuery(query) {
        statements.push(query);
      },
    },
  });
  try {
    const listed = await listAchievements({ db }, profileId);
    // A single PostgreSQL statement guarantees one MVCC snapshot for rows and linked ids.
    // Splitting this into parallel queries can combine fresh versions with obsolete links.
    expect(statements).toHaveLength(1);
    expect(listed.find((row) => row.id === linked.id)).toEqual({
      ...linked,
      skillIds: skills.map((skill) => skill.id).sort(),
    });
    expect(listed.find((row) => row.id === unlinked.id)?.skillIds).toEqual([]);
    statements.length = 0;
    expect(await getAchievement({ db }, profileId, linked.id)).toEqual({
      ...linked,
      skillIds: skills.map((skill) => skill.id).sort(),
    });
    expect(statements).toHaveLength(1);
    statements.length = 0;
    expect(await getAchievement({ db }, crypto.randomUUID(), linked.id)).toBeNull();
    expect(statements).toHaveLength(1);
  } finally {
    await pool.end();
  }
});
