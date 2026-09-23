import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { buildMcpHandler } from "@/app/mcp/handler";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import type { DatabaseConnection } from "@/infrastructure/database";
import { createProfile } from "@/modules/profile";
import {
  createJobSource,
  listJobSources,
  updateJobSource,
  updateJobSourceLink,
  saveJob,
} from "@/modules/jobs";
import { openTestDatabase, truncateAll } from "../helpers/test-database";
let connection: DatabaseConnection;
const profileId = "10000000-0000-4000-8000-000000000001";
const sourceId = "80000000-0000-4000-8000-000000000001";
let clock = 0;
const deps = () => ({
  db: connection.db,
  now: () => new Date(Date.UTC(2026, 8, 23, 0, 0, clock++)),
});
function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}
beforeAll(async () => {
  connection = await openTestDatabase();
});
afterAll(async () => {
  await connection.close();
});
beforeEach(async () => {
  await truncateAll(connection);
  clock = 0;
  unwrap(await createProfile(deps(), { id: profileId, displayName: "Alex Example" }));
});
describe("Job Sources", () => {
  it("starts empty, replays creates, checks versions and preserves archived assignments", async () => {
    expect(await listJobSources(deps(), profileId)).toEqual([]);
    const source = unwrap(
      await createJobSource(deps(), profileId, { id: sourceId, name: "Local board" }),
    );
    expect(
      unwrap(await createJobSource(deps(), profileId, { id: sourceId, name: "Retry" })).name,
    ).toBe("Local board");
    const job = unwrap(
      await saveJob(deps(), profileId, {
        title: "Engineer",
        companyName: "Example",
        rawDescription: "Build useful tools",
        jobSourceId: source.id,
      }),
    );
    const archived = unwrap(
      await updateJobSource(deps(), profileId, source.id, {
        expectedUpdatedAt: source.updatedAt.toISOString(),
        archived: true,
      }),
    );
    expect(
      await updateJobSource(deps(), profileId, source.id, {
        expectedUpdatedAt: source.updatedAt.toISOString(),
        name: "Stale",
      }),
    ).toMatchObject({ ok: false, error: { kind: "stale" } });
    expect(
      await saveJob(deps(), profileId, {
        title: "Other",
        companyName: "Example",
        rawDescription: "Tools",
        jobSourceId: source.id,
      }),
    ).toMatchObject({ ok: false, error: { kind: "validation" } });
    const retained = unwrap(
      await updateJobSourceLink(deps(), profileId, job.id, {
        expectedUpdatedAt: job.updatedAt.toISOString(),
        jobSourceId: source.id,
      }),
    );
    const cleared = unwrap(
      await updateJobSourceLink(deps(), profileId, job.id, {
        expectedUpdatedAt: retained.updatedAt.toISOString(),
        jobSourceId: null,
      }),
    );
    expect(cleared.jobSourceId).toBeNull();
    expect(cleared.source).toBe("pasted");
    expect(
      unwrap(
        await updateJobSource(deps(), profileId, source.id, {
          expectedUpdatedAt: archived.updatedAt.toISOString(),
          archived: false,
          name: "Renamed board",
        }),
      ).name,
    ).toBe("Renamed board");
  });
  it("rejects cross-profile assignment and updates", async () => {
    const source = unwrap(
      await createJobSource(deps(), profileId, { id: sourceId, name: "Local board" }),
    );
    const other = { id: "10000000-0000-4000-8000-000000000002" };
    expect(
      await saveJob(deps(), other.id, {
        title: "Engineer",
        companyName: "Example",
        rawDescription: "Tools",
        jobSourceId: source.id,
      }),
    ).toMatchObject({ ok: false, error: { kind: "validation" } });
    expect(
      await updateJobSource(deps(), other.id, source.id, {
        expectedUpdatedAt: source.updatedAt.toISOString(),
        name: "Changed",
      }),
    ).toMatchObject({ ok: false, error: { kind: "not_found" } });
  });
});

it("exposes source management and assignment through MCP", async () => {
  const handler = buildMcpHandler({
    deps: deps(),
    artifactDir: "/tmp/unused-source-test",
    origin: "http://127.0.0.1:3417",
    userAgent: "source-test",
  });
  const client = new Client({ name: "source-test", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://127.0.0.1:3417/mcp"), {
      fetch: (input, init) => handler.fetch(new Request(input, init)),
    }),
  );
  async function call(name: string, args: Record<string, unknown>) {
    const result = await client.callTool({ name, arguments: args });
    expect(result.isError).not.toBe(true);
    return JSON.parse((result.content as { text: string }[])[0]!.text);
  }
  try {
    expect(await call("list_job_sources", {})).toEqual({ sources: [] });
    const source = await call("add_job_source", { source_id: sourceId, name: "Local board" });
    const job = await call("add_job", {
      title: "Engineer",
      company: "Example",
      description: "Build useful tools",
      job_source_id: sourceId,
    });
    const detail = await call("get_job", { job_id: job.job_id });
    expect(detail.job_source_id).toBe(sourceId);
    await call("set_job_source", {
      job_id: job.job_id,
      expected_updated_at: detail.updated_at,
      job_source_id: null,
    });
    expect((await call("get_job", { job_id: job.job_id })).job_source_id).toBeNull();
    const archived = await call("update_job_source", {
      source_id: sourceId,
      expected_updated_at: source.updated_at,
      archived: true,
    });
    expect(archived.archived).toBe(true);
    const stale = await client.callTool({
      name: "update_job_source",
      arguments: { source_id: sourceId, expected_updated_at: source.updated_at, name: "Stale" },
    });
    expect(stale.isError).toBe(true);
  } finally {
    await client.close();
  }
});
