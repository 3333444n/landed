import { randomUUID } from "node:crypto";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildMcpHandler } from "@/app/mcp/handler";
import type { DatabaseConnection } from "@/infrastructure/database";
import { getAchievement, getCurrentProfile, updateAchievement } from "@/modules/profile";
import { getRun } from "@/modules/documents";
import { demo, seedDemoProfile, unwrap } from "../helpers/demo-seed";
import { pursueJob } from "@/app/jobs/pursue-job";
import { openTestDatabase, truncateAll } from "../helpers/test-database";

let db: DatabaseConnection;
let client: Client;
const deps = () => ({ db: db.db });
type Row = { id: string; updated_at: string; [key: string]: unknown };
async function result(name: string, args: Record<string, unknown> = {}) {
  return client.callTool({ name, arguments: args });
}
async function call<T = { record: Row }>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const response = await result(name, args);
  if (response.isError) throw new Error(JSON.stringify(response.content));
  const content = response.content as { type: string; text: string }[];
  return JSON.parse(content[0]!.text) as T;
}
async function rejects(name: string, args: Record<string, unknown>, text: string) {
  const response = await result(name, args);
  expect(response.isError).toBe(true);
  expect(JSON.stringify(response.content)).toContain(text);
}
beforeAll(async () => {
  db = await openTestDatabase();
});
afterAll(async () => {
  await client?.close();
  await db?.close();
});
beforeEach(async () => {
  await client?.close();
  await truncateAll(db);
  const handler = buildMcpHandler({
    deps: deps(),
    artifactDir: "/tmp/unused-profile-test",
    origin: "http://127.0.0.1:3417",
    userAgent: "profile-test",
  });
  client = new Client({ name: "profile-test", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://127.0.0.1:3417/mcp"), {
      fetch: (input, init) => handler.fetch(new Request(input, init)),
    }),
  );
});
async function bootstrap() {
  return (await call("create_profile", { profile_id: randomUUID(), display_name: "Alex Example" }))
    .record;
}

describe("profile MCP contracts", () => {
  it("bootstraps on the same client, replays creation, and selectively reads sections", async () => {
    expect(await call("get_profile")).toMatchObject({ profile: null });
    const id = randomUUID();
    const input = { profile_id: id, display_name: "Alex Example" };
    expect((await call("create_profile", input)).record.id).toBe(id);
    expect((await call("create_profile", input)).record.id).toBe(id);
    await rejects("create_profile", { ...input, profile_id: randomUUID() }, "conflict");
    expect(await call("get_profile", { sections: ["skills"] })).toEqual({ skills: [] });
    const saved = (await call("add_skill", { record_id: randomUUID(), display_name: "PostgreSQL" }))
      .record;
    expect(await call("get_profile", { sections: ["skills"] })).toEqual({ skills: [saved] });
    expect(await call("list_jobs")).toEqual({ jobs: [] });
  });

  it("preserves omitted profile fields, clears explicitly, rejects unknown fields and stale edits", async () => {
    const original = await bootstrap();
    const populated = (
      await call("update_profile", {
        expected_updated_at: original.updated_at,
        changes: {
          headline: "Software engineer",
          email: "alex@example.test",
          desired_roles: ["Engineer"],
          github_url: "https://example.test/alex",
        },
      })
    ).record;
    const updated = (
      await call("update_profile", {
        expected_updated_at: populated.updated_at,
        changes: { headline: "Platform engineer" },
      })
    ).record;
    expect(updated).toMatchObject({
      email: "alex@example.test",
      desired_roles: ["Engineer"],
      github_url: "https://example.test/alex",
    });
    await rejects(
      "update_profile",
      { expected_updated_at: original.updated_at, changes: { headline: "stale" } },
      "stale",
    );
    await rejects(
      "update_profile",
      { changes: { headline: "missing version" } },
      "expected_updated_at",
    );
    await rejects(
      "update_profile",
      { expected_updated_at: updated.updated_at, changes: {} },
      "changed field",
    );
    await rejects(
      "update_profile",
      { expected_updated_at: updated.updated_at, changes: { typo: "wrong" } },
      "typo",
    );
    const cleared = (
      await call("update_profile", {
        expected_updated_at: updated.updated_at,
        changes: { email: null, desired_roles: [], github_url: null },
      })
    ).record;
    expect(cleared).toMatchObject({
      email: null,
      desired_roles: [],
      github_url: null,
      headline: "Platform engineer",
    });
  });

  it.each([
    [
      "role",
      { employer_name: "Example Labs", role: "Engineer", description: "Original description" },
      { role: "Senior engineer" },
      "description",
    ],
    [
      "education",
      { institution: "Example College", status: "in_progress", subject: "Computing" },
      { status: "completed" },
      "subject",
    ],
    [
      "project",
      { name: "Example project", description: "Original description" },
      { name: "Renamed project" },
      "description",
    ],
    [
      "skill",
      { display_name: "TypeScript", category: "Language" },
      { display_name: "JavaScript" },
      "category",
    ],
    [
      "achievement",
      { statement: "Built an internal dashboard", source_note: "User statement" },
      { statement: "Maintained an internal dashboard" },
      "source_note",
    ],
  ] as const)(
    "creates, replays, patches and deletes one %s with version checks",
    async (kind, fields, changes, preserved) => {
      await bootstrap();
      const args = { record_id: randomUUID(), ...fields };
      const original = (await call(`add_${kind}`, args)).record;
      expect((await call(`add_${kind}`, args)).record.id).toBe(original.id);
      const updated = (
        await call(`update_${kind}`, {
          record_id: original.id,
          expected_updated_at: original.updated_at,
          changes,
        })
      ).record;
      expect(updated[preserved]).toBe(original[preserved]);
      await rejects(
        `update_${kind}`,
        { record_id: original.id, expected_updated_at: original.updated_at, changes },
        "stale",
      );
      await rejects(
        `delete_${kind}`,
        { record_id: original.id, expected_updated_at: original.updated_at },
        "stale",
      );
      expect(
        await call(`delete_${kind}`, {
          record_id: updated.id,
          expected_updated_at: updated.updated_at,
        }),
      ).toEqual({ deleted: true, record_id: updated.id });
      await rejects(
        `delete_${kind}`,
        { record_id: updated.id, expected_updated_at: updated.updated_at },
        "not_found",
      );
    },
  );

  it("preserves achievement links and review, restricts parent deletes, and invalidates versions on skill deletion", async () => {
    await bootstrap();
    const role = (
      await call("add_role", {
        record_id: randomUUID(),
        employer_name: "Example Labs",
        role: "Engineer",
      })
    ).record;
    const skill = (await call("add_skill", { record_id: randomUUID(), display_name: "PostgreSQL" }))
      .record;
    const achievement = (
      await call("add_achievement", {
        record_id: randomUUID(),
        statement: "Improved database queries",
        role_id: role.id,
        skill_ids: [skill.id],
      })
    ).record;
    const profile = (await getCurrentProfile(deps()))!;
    const current = (await getAchievement(deps(), profile.id, achievement.id))!;
    unwrap(
      await updateAchievement(deps(), profile.id, current.id, {
        ...current,
        employmentId: current.employmentId ?? undefined,
        projectId: undefined,
        problem: undefined,
        action: undefined,
        result: undefined,
        metric: undefined,
        sourceNote: undefined,
        sourceUrl: undefined,
        expectedUpdatedAt: current.updatedAt.toISOString(),
        reviewed: true,
      }),
    );
    const read = await call<{ achievements: Row[] }>("get_profile", { sections: ["achievements"] });
    const reviewed = read.achievements[0]!;
    const patched = (
      await call("update_achievement", {
        record_id: reviewed.id,
        expected_updated_at: reviewed.updated_at,
        changes: { source_note: "User clarification" },
      })
    ).record;
    expect(patched).toMatchObject({ reviewed: true, role_id: role.id, skill_ids: [skill.id] });
    await rejects(
      "delete_role",
      { record_id: role.id, expected_updated_at: role.updated_at },
      "conflict",
    );
    await call("delete_skill", { record_id: skill.id, expected_updated_at: skill.updated_at });
    await rejects(
      "update_achievement",
      {
        record_id: patched.id,
        expected_updated_at: patched.updated_at,
        changes: { source_note: "stale" },
      },
      "stale",
    );
    const fresh = (
      await call<{ achievements: Row[] }>("get_profile", { sections: ["achievements"] })
    ).achievements[0]!;
    const detached = (
      await call("update_achievement", {
        record_id: fresh.id,
        expected_updated_at: fresh.updated_at,
        changes: { role_id: null, statement: "Optimized database queries" },
      })
    ).record;
    expect(detached).toMatchObject({ reviewed: false, role_id: null, skill_ids: [] });
    await call("delete_role", { record_id: role.id, expected_updated_at: role.updated_at });
  });

  it("uses tool parameter names in errors and refuses invalid links and duplicate skills", async () => {
    await bootstrap();
    await call("add_skill", { record_id: randomUUID(), display_name: " PostgreSQL " });
    await rejects(
      "add_skill",
      { record_id: randomUUID(), display_name: "postgresql" },
      "display_name",
    );
    await rejects(
      "add_achievement",
      { record_id: randomUUID(), statement: "Built a tool", role_id: randomUUID() },
      "role_id",
    );
    await rejects(
      "add_achievement",
      { record_id: randomUUID(), statement: "Built a tool", skill_ids: [randomUUID()] },
      "skill_ids",
    );
    await rejects(
      "add_role",
      {
        record_id: randomUUID(),
        employer_name: "Example Labs",
        role: "Engineer",
        start_year: 2020,
      },
      "start_month",
    );
  });

  it("leaves frozen generation evidence unchanged after a live record edit and deletion", async () => {
    await seedDemoProfile(deps);
    unwrap(await pursueJob(deps(), demo.profileId, { id: demo.jobId, ...demo.job }));
    const brief = await call<{ run_id: string }>("get_document_brief", {
      job_id: demo.jobId,
      type: "resume",
    });
    const before = (await getRun(deps(), demo.profileId, brief.run_id))!.snapshot;
    const current = (
      await call<{ achievements: Row[] }>("get_profile", { sections: ["achievements"] })
    ).achievements[0]!;
    const changed = (
      await call("update_achievement", {
        record_id: current.id,
        expected_updated_at: current.updated_at,
        changes: { statement: "Built a revised fictional tool" },
      })
    ).record;
    await call("delete_achievement", {
      record_id: changed.id,
      expected_updated_at: changed.updated_at,
    });
    expect((await getRun(deps(), demo.profileId, brief.run_id))!.snapshot).toEqual(before);
  });
});

it("exposes direct skill role_ids/project_ids and preserves omitted links on patches", async () => {
  await bootstrap();
  const role = (
    await call("add_role", {
      record_id: randomUUID(),
      employer_name: "Example Workshop",
      role: "Developer",
    })
  ).record;
  const project = (await call("add_project", { record_id: randomUUID(), name: "Catalogue" }))
    .record;
  const skill = (
    await call("add_skill", {
      record_id: randomUUID(),
      display_name: "SQL",
      role_ids: [role.id],
      project_ids: [project.id],
    })
  ).record;
  expect(skill).toMatchObject({ role_ids: [role.id], project_ids: [project.id] });
  const renamed = (
    await call("update_skill", {
      record_id: skill.id,
      expected_updated_at: skill.updated_at,
      changes: { display_name: "PostgreSQL" },
    })
  ).record;
  expect(renamed).toMatchObject({ role_ids: [role.id], project_ids: [project.id] });
  const cleared = (
    await call("update_skill", {
      record_id: skill.id,
      expected_updated_at: renamed.updated_at,
      changes: { role_ids: [], project_ids: [] },
    })
  ).record;
  expect(cleared).toMatchObject({ role_ids: [], project_ids: [] });
});
