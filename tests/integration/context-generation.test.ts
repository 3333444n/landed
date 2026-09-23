import { randomUUID } from "node:crypto";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { buildMcpHandler } from "@/app/mcp/handler";
import { prepareGeneration, prepareAssistantBrief } from "@/app/jobs/generate-document";
import { getRun } from "@/modules/documents";
import type { DatabaseConnection } from "@/infrastructure/database";
import { openTestDatabase, truncateAll } from "../helpers/test-database";
let connection: DatabaseConnection;
let client: Client;
let profileId: string;
type Row = { id: string; updated_at: string; [key: string]: unknown };
type JobDetail = Row & {
  application: {
    interest: string | null;
    updated_at: string;
    status: string;
    notes: string | null;
  };
};
const deps = () => ({ db: connection.db });
function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.value;
}
async function call<T = Row>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const r = await client.callTool({ name, arguments: args });
  if (r.isError) throw new Error(JSON.stringify(r.content));
  return JSON.parse((r.content as { text: string }[])[0]!.text) as T;
}
async function refuses(name: string, args: Record<string, unknown>, text: string) {
  const r = await client.callTool({ name, arguments: args });
  expect(r.isError).toBe(true);
  expect(JSON.stringify(r.content)).toContain(text);
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
    deps: deps(),
    artifactDir: "/tmp/unused-context-test",
    origin: "http://127.0.0.1:3417",
    userAgent: "context-test",
  });
  client = new Client({ name: "context-test", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://127.0.0.1:3417/mcp"), {
      fetch: (input, init) => handler.fetch(new Request(input, init)),
    }),
  );
  profileId = randomUUID();
  await call("create_profile", { profile_id: profileId, display_name: "Alex Example" });
});
async function profile() {
  return (await call<{ profile: Row }>("get_profile", { sections: ["profile"] })).profile;
}
async function setAbout(text: string | null) {
  const p = await profile();
  return (
    await call<{ record: Row }>("update_profile", {
      expected_updated_at: p.updated_at,
      changes: { about_me: text },
    })
  ).record;
}
async function addJob(companyId?: string) {
  return (
    await call<{ job_id: string }>("add_job", {
      job_id: randomUUID(),
      title: "Tool developer",
      company: "Example Labs posting name",
      description: "Build helpful public tools with TypeScript.",
      ...(companyId ? { company_id: companyId } : {}),
    })
  ).job_id;
}
async function setInterest(jobId: string, interest: string | null) {
  const job = await call<JobDetail>("get_job", { job_id: jobId });
  return call("update_job_interest", {
    job_id: jobId,
    expected_updated_at: job.application.updated_at,
    interest,
  });
}
it("MCP About me and Interest updates preserve other fields, reject stale writes, and clear", async () => {
  const original = await profile();
  const saved = await setAbout("I like making complex processes understandable.");
  expect(saved).toMatchObject({
    display_name: "Alex Example",
    about_me: "I like making complex processes understandable.",
  });
  expect(await call("get_profile", { sections: ["about_me"] })).toEqual({
    about_me: { text: saved.about_me, updated_at: saved.updated_at },
  });
  await refuses(
    "update_profile",
    { expected_updated_at: original.updated_at, changes: { about_me: "Stale text" } },
    "stale",
  );
  await setAbout(null);
  expect(await call("get_profile", { sections: ["about_me"] })).toMatchObject({
    about_me: { text: null },
  });
  const jobId = await addJob();
  const job = await call<JobDetail>("get_job", { job_id: jobId });
  const interest = await call("update_job_interest", {
    job_id: jobId,
    expected_updated_at: job.application.updated_at,
    interest: "I want to work on their public tools.",
  });
  expect(await call("get_job", { job_id: jobId })).toMatchObject({
    application: { interest: interest.interest, status: "preparing", notes: null },
  });
  await refuses(
    "update_job_interest",
    { job_id: jobId, expected_updated_at: job.application.updated_at, interest: null },
    "stale",
  );
  await setInterest(jobId, null);
  expect(await call("get_job", { job_id: jobId })).toMatchObject({
    application: { interest: null, status: "preparing", notes: null },
  });
});
it("cover-letter preparation includes all company fields, posting and user context, and selected findings only", async () => {
  const c = await call("create_company", {
    company_id: randomUUID(),
    name: "Example Labs",
    location: "Remote",
    website: "https://example.com",
    about: "Builds public developer tools.",
  });
  const findingArgs = {
    company_id: c.id,
    source_url: "https://example.com/news",
    retrieved_at: "2026-09-23",
    kind: "interpretation",
  };
  const selected = await call("create_company_finding", {
    ...findingArgs,
    finding_id: randomUUID(),
    text: "Might need onboarding support.",
  });
  await call("create_company_finding", {
    ...findingArgs,
    finding_id: randomUUID(),
    text: "UNSELECTED company finding.",
  });
  const jobId = await addJob(c.id);
  const job = await call<JobDetail>("get_job", { job_id: jobId });
  await call("select_job_findings", {
    job_id: jobId,
    expected_updated_at: job.updated_at,
    finding_ids: [selected.id],
  });
  await setAbout("I enjoy helping developers learn.");
  await setInterest(jobId, "Their public tools connect with my interests.");
  const prepared = unwrap(await prepareGeneration(deps(), profileId, jobId, "cover_letter"));
  expect(prepared.snapshot).toMatchObject({
    profile: { id: profileId, displayName: "Alex Example" },
    job: { id: jobId, rawDescription: "Build helpful public tools with TypeScript." },
    writingContext: {
      aboutMe: { text: "I enjoy helping developers learn." },
      interest: { text: "Their public tools connect with my interests." },
      company: { id: c.id, name: c.name, location: c.location, website: c.website, about: c.about },
      findings: [
        {
          id: selected.id,
          text: selected.text,
          sourceUrl: selected.source_url,
          retrievedAt: selected.retrieved_at,
          kind: "interpretation",
        },
      ],
    },
  });
  expect(JSON.stringify(prepared.snapshot)).not.toContain("UNSELECTED");
  const resume = unwrap(await prepareGeneration(deps(), profileId, jobId, "resume"));
  expect(resume.snapshot).not.toHaveProperty("writingContext");
});
it("saved cover-letter snapshots survive profile/company/finding changes and deletion", async () => {
  const c = await call("create_company", {
    company_id: randomUUID(),
    name: "Example Labs",
    location: "Remote",
    website: "https://example.com",
    about: "Original company context.",
  });
  const f = await call("create_company_finding", {
    company_id: c.id,
    finding_id: randomUUID(),
    text: "Original selected observation.",
    source_url: "https://example.com/news",
    retrieved_at: "2026-09-23",
    kind: "statement",
  });
  const jobId = await addJob(c.id);
  const j = await call<JobDetail>("get_job", { job_id: jobId });
  await call("select_job_findings", {
    job_id: jobId,
    expected_updated_at: j.updated_at,
    finding_ids: [f.id],
  });
  await setAbout("Original personal motivation.");
  await setInterest(jobId, "Original application motivation.");
  const brief = unwrap(
    await prepareAssistantBrief(deps(), profileId, jobId, "cover_letter", {
      provider: "test",
      model: "test",
    }),
  );
  const frozen = JSON.parse(JSON.stringify(brief.run.snapshot));
  await setAbout("Changed personal motivation.");
  await setInterest(jobId, "Changed application motivation.");
  const updatedCompany = await call("update_company", {
    company_id: c.id,
    expected_updated_at: c.updated_at,
    about: "Changed company context.",
  });
  const updatedFinding = await call("update_company_finding", {
    company_id: c.id,
    finding_id: f.id,
    expected_updated_at: f.updated_at,
    text: "Changed selected observation.",
  });
  expect((await getRun(deps(), profileId, brief.run.id))?.snapshot).toEqual(frozen);
  await call("delete_company_finding", {
    company_id: c.id,
    finding_id: f.id,
    expected_updated_at: updatedFinding.updated_at,
  });
  const after = await call<JobDetail>("get_job", { job_id: jobId });
  await call("link_job_company", {
    job_id: jobId,
    company_id: null,
    expected_updated_at: after.updated_at,
  });
  await call("delete_company", {
    company_id: c.id,
    expected_updated_at: updatedCompany.updated_at,
  });
  expect((await getRun(deps(), profileId, brief.run.id))?.snapshot).toEqual(frozen);
  const fresh = unwrap(await prepareGeneration(deps(), profileId, jobId, "cover_letter"));
  expect(fresh.snapshot).toMatchObject({
    writingContext: {
      aboutMe: { text: "Changed personal motivation." },
      interest: { text: "Changed application motivation." },
      company: null,
      findings: [],
    },
  });
});
it("cover letters remain preparable without optional context", async () => {
  const jobId = await addJob();
  const prepared = unwrap(await prepareGeneration(deps(), profileId, jobId, "cover_letter"));
  expect(prepared.snapshot).toMatchObject({
    writingContext: { aboutMe: null, interest: null, company: null, findings: [] },
  });
});
