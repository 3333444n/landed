import { randomUUID } from "node:crypto";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { buildMcpHandler } from "@/app/mcp/handler";
import type { DatabaseConnection } from "@/infrastructure/database";
import { openTestDatabase, truncateAll } from "../helpers/test-database";
let connection: DatabaseConnection;
let client: Client;
type Row = { id: string; updated_at: string; [key: string]: unknown };
async function call<T = Row>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) throw new Error(JSON.stringify(result.content));
  return JSON.parse((result.content as { text: string }[])[0]!.text) as T;
}
async function refuses(name: string, args: Record<string, unknown>, text: string) {
  const result = await client.callTool({ name, arguments: args });
  expect(result.isError).toBe(true);
  expect(JSON.stringify(result.content)).toContain(text);
}
beforeAll(async () => {
  connection = await openTestDatabase();
});
afterAll(async () => {
  await client?.close();
  await connection?.close();
});
beforeEach(async () => {
  await client?.close();
  await truncateAll(connection);
  const handler = buildMcpHandler({
    deps: { db: connection.db },
    artifactDir: "/tmp/unused-company-test",
    origin: "http://127.0.0.1:3417",
    userAgent: "company-test",
  });
  client = new Client({ name: "company-test", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://127.0.0.1:3417/mcp"), {
      fetch: (input, init) => handler.fetch(new Request(input, init)),
    }),
  );
  await call("create_profile", { profile_id: randomUUID(), display_name: "Alex Example" });
});
async function company() {
  return call("create_company", {
    company_id: randomUUID(),
    name: "Example Labs",
    location: "Remote",
    website: "https://example.com",
    about: "Builds public tools.",
  });
}
async function finding(companyId: string) {
  return call("create_company_finding", {
    company_id: companyId,
    finding_id: randomUUID(),
    text: "Released a public tool in 2026",
    source_url: "https://example.com/news",
    retrieved_at: "2026-09-23",
    kind: "statement",
  });
}
async function job(companyId: string) {
  return call<{ job_id: string }>("add_job", {
    job_id: randomUUID(),
    company_id: companyId,
    title: "Developer",
    company: "Original posting name",
    description: "Build public tools.",
  });
}
it("MCP company fields preserve omissions, clear optional values, and use retry and version contracts", async () => {
  const c = await company();
  expect(await call("create_company", { company_id: c.id, name: "Retry" })).toEqual(c);
  const list = await call<{ companies: Row[] }>("list_companies");
  expect(list.companies).toEqual([c]);
  expect(c).not.toHaveProperty("profile_id");
  const updated = await call("update_company", {
    company_id: c.id,
    expected_updated_at: c.updated_at,
    name: "Example Tools",
    location: null,
    about: null,
  });
  expect(updated).toMatchObject({
    name: "Example Tools",
    location: null,
    about: null,
    website: "https://example.com",
  });
  await refuses(
    "update_company",
    { company_id: c.id, expected_updated_at: c.updated_at, name: "Stale" },
    "stale",
  );
  await refuses("delete_company", { company_id: c.id, expected_updated_at: c.updated_at }, "stale");
  expect(await call("get_company", { company_id: c.id })).toMatchObject({
    ...updated,
    findings: [],
  });
  await call("delete_company", { company_id: c.id, expected_updated_at: updated.updated_at });
  expect(await call("list_companies")).toEqual({ companies: [] });
});
it("MCP findings retain provenance, update in place, and reject stale deletes", async () => {
  const c = await company();
  const f = await finding(c.id);
  const original = await call("get_company", { company_id: c.id });
  expect(original).toMatchObject({ findings: [f] });
  expect(
    await call("create_company_finding", {
      company_id: c.id,
      finding_id: f.id,
      text: "Retry",
      source_url: "https://example.com/retry",
      retrieved_at: "2026-09-23",
      kind: "interpretation",
    }),
  ).toEqual(f);
  const updated = await call("update_company_finding", {
    company_id: c.id,
    finding_id: f.id,
    expected_updated_at: f.updated_at,
    text: "May need help onboarding developers",
    kind: "interpretation",
  });
  expect(updated).toMatchObject({
    text: "May need help onboarding developers",
    kind: "interpretation",
    source_url: f.source_url,
    retrieved_at: f.retrieved_at,
  });
  await refuses(
    "delete_company_finding",
    { company_id: c.id, finding_id: f.id, expected_updated_at: f.updated_at },
    "stale",
  );
  await call("delete_company_finding", {
    company_id: c.id,
    finding_id: f.id,
    expected_updated_at: updated.updated_at,
  });
  expect(await call("get_company", { company_id: c.id })).toMatchObject({ findings: [] });
});
it("MCP job linking, selection, deletion, and read projections agree", async () => {
  const c = await company();
  const f = await finding(c.id);
  const j = await job(c.id);
  const detail = await call("get_job", { job_id: j.job_id });
  expect(detail).toMatchObject({ company_id: c.id, selected_finding_ids: [] });
  const selected = await call("select_job_findings", {
    job_id: j.job_id,
    finding_ids: [f.id],
    expected_updated_at: detail.updated_at,
  });
  expect(await call("get_job_company_context", { job_id: j.job_id })).toMatchObject({
    company: { id: c.id },
    selected_finding_ids: [f.id],
    findings: [f],
    updated_at: selected.updated_at,
  });
  await refuses(
    "delete_company",
    { company_id: c.id, expected_updated_at: c.updated_at },
    "conflict",
  );
  await call("delete_company_finding", {
    company_id: c.id,
    finding_id: f.id,
    expected_updated_at: f.updated_at,
  });
  const after = await call("get_job", { job_id: j.job_id });
  expect(after).toMatchObject({ selected_finding_ids: [] });
  expect(after.updated_at).not.toBe(selected.updated_at);
  await refuses(
    "select_job_findings",
    { job_id: j.job_id, finding_ids: [], expected_updated_at: selected.updated_at },
    "stale",
  );
  await call("link_job_company", {
    job_id: j.job_id,
    company_id: null,
    expected_updated_at: after.updated_at,
  });
  expect(await call("get_job_company_context", { job_id: j.job_id })).toMatchObject({
    company: null,
    findings: [],
    selected_finding_ids: [],
  });
  await call("delete_company", { company_id: c.id, expected_updated_at: c.updated_at });
});
