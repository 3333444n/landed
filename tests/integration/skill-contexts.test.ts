import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { DatabaseConnection } from "@/infrastructure/database";
import {
  createProfile,
  deleteEmployment,
  deleteProject,
  deleteSkill,
  getSkill,
  listSkills,
  patchSkill,
  saveEmployment,
  saveProject,
  saveSkill,
} from "@/modules/profile";
import { unwrap } from "../helpers/demo-seed";
import { openTestDatabase, truncateAll } from "../helpers/test-database";
let connection: DatabaseConnection;
let profileId: string;
const deps = () => ({ db: connection.db });
const failure = (kind: string) => ({ ok: false, error: expect.objectContaining({ kind }) });
beforeAll(async () => {
  connection = await openTestDatabase();
});
afterAll(async () => {
  await connection.close();
});
beforeEach(async () => {
  await truncateAll(connection);
  profileId = unwrap(await createProfile(deps(), { displayName: "Alex Example" })).id;
});
async function contexts() {
  const role = unwrap(
    await saveEmployment(deps(), profileId, {
      employerName: "Example Workshop",
      role: "Developer",
    }),
  );
  const project = unwrap(await saveProject(deps(), profileId, { name: "Catalogue" }));
  return { role, project };
}
it("creates, reads, replays and patches skill links atomically, preserving omitted lists", async () => {
  const { role, project } = await contexts();
  const input = {
    id: crypto.randomUUID(),
    displayName: "SQL",
    employmentIds: [role.id, role.id],
    projectIds: [project.id],
  };
  const skill = unwrap(await saveSkill(deps(), profileId, input));
  expect(skill.employmentIds).toEqual([role.id]);
  expect(await getSkill(deps(), profileId, skill.id)).toEqual(skill);
  expect(await listSkills(deps(), profileId)).toEqual([skill]);
  expect(unwrap(await saveSkill(deps(), profileId, { ...input, employmentIds: [] }))).toEqual(
    skill,
  );
  const changed = unwrap(
    await patchSkill(deps(), profileId, skill.id, {
      expectedUpdatedAt: skill.updatedAt.toISOString(),
      category: "Database",
    }),
  );
  expect(changed.employmentIds).toEqual([role.id]);
  expect(changed.projectIds).toEqual([project.id]);
  expect(
    await patchSkill(deps(), profileId, skill.id, {
      expectedUpdatedAt: skill.updatedAt.toISOString(),
      employmentIds: [],
    }),
  ).toEqual(failure("stale"));
  const cleared = unwrap(
    await patchSkill(deps(), profileId, skill.id, {
      expectedUpdatedAt: changed.updatedAt.toISOString(),
      employmentIds: [],
      projectIds: [],
    }),
  );
  expect(cleared.employmentIds).toEqual([]);
  expect(cleared.projectIds).toEqual([]);
});
it("refuses invalid owners without changing the row or its existing links", async () => {
  const { role } = await contexts();
  const skill = unwrap(
    await saveSkill(deps(), profileId, { displayName: "SQL", employmentIds: [role.id] }),
  );
  const foreignOwner = crypto.randomUUID();
  // Separate profile inserted solely to exercise the database's owner-aware foreign keys.
  const { profiles, employment, skillEmployment } = await import("@/modules/profile/schema");
  await connection.db
    .insert(profiles)
    .values({ id: foreignOwner, displayName: "Other fictional profile" });
  const foreignRole = crypto.randomUUID();
  await connection.db.insert(employment).values({
    id: foreignRole,
    profileId: foreignOwner,
    employerName: "Other Workshop",
    role: "Engineer",
  });
  expect(
    await patchSkill(deps(), profileId, skill.id, {
      expectedUpdatedAt: skill.updatedAt.toISOString(),
      displayName: "Changed",
      employmentIds: [foreignRole],
    }),
  ).toEqual(failure("validation"));
  expect(await getSkill(deps(), profileId, skill.id)).toEqual(skill);
  await expect(
    connection.db
      .insert(skillEmployment)
      .values({ profileId, skillId: skill.id, employmentId: foreignRole }),
  ).rejects.toThrow();
  expect(
    await saveSkill(deps(), profileId, {
      displayName: "Unknown",
      projectIds: [crypto.randomUUID()],
    }),
  ).toEqual(failure("validation"));
});
it("protects linked roles and projects; deleting a skill only removes its associations", async () => {
  const { role, project } = await contexts();
  const skill = unwrap(
    await saveSkill(deps(), profileId, {
      displayName: "SQL",
      employmentIds: [role.id],
      projectIds: [project.id],
    }),
  );
  expect(await deleteEmployment(deps(), profileId, role.id)).toEqual(failure("conflict"));
  expect(await deleteProject(deps(), profileId, project.id)).toEqual(failure("conflict"));
  unwrap(await deleteSkill(deps(), profileId, skill.id, skill.updatedAt.toISOString()));
  unwrap(await deleteEmployment(deps(), profileId, role.id));
  unwrap(await deleteProject(deps(), profileId, project.id));
});
it("permits only one concurrent link edit of a given skill version", async () => {
  const { role, project } = await contexts();
  const skill = unwrap(await saveSkill(deps(), profileId, { displayName: "SQL" }));
  const edits = await Promise.all([
    patchSkill(deps(), profileId, skill.id, {
      expectedUpdatedAt: skill.updatedAt.toISOString(),
      employmentIds: [role.id],
    }),
    patchSkill(deps(), profileId, skill.id, {
      expectedUpdatedAt: skill.updatedAt.toISOString(),
      projectIds: [project.id],
    }),
  ]);
  expect(edits.filter((edit) => edit.ok)).toHaveLength(1);
  expect(edits.filter((edit) => !edit.ok)).toEqual([failure("stale")]);
});
