/*
 * The assistant surface end to end, in process: the handler from src/app/mcp/handler.ts is
 * driven by the SDK client through a custom fetch, against the test database. The route's own
 * checks (token, bearer) are unit tested; the Host guard runs in src/proxy.ts, outside this test.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildMcpHandler } from "@/app/mcp/handler";
import { pursueJob } from "@/app/jobs/pursue-job";
import type { DatabaseConnection } from "@/infrastructure/database";
import { getRun } from "@/modules/documents";
import { documentArtifacts, documentRevisions, generationRuns } from "@/modules/documents/schema";
import { applications } from "@/modules/applications/schema";
import { jobs } from "@/modules/jobs/schema";
import { getCurrentProfile } from "@/modules/profile";
import { demo, seedDemoProfile, unwrap } from "../helpers/demo-seed";
import { openTestDatabase, truncateAll } from "../helpers/test-database";

let connection: DatabaseConnection;
let artifactDir: string;
let client: Client;
const deps = () => ({ db: connection.db });
const fixture = (name: string) =>
  JSON.parse(readFileSync(`examples/generation/fixtures/${name}.json`, "utf8")) as Record<
    string,
    unknown
  >;

const origin = "http://127.0.0.1:3000";
const userAgent = "claude-code/2.1.0";

async function connect(): Promise<Client> {
  const profile = await getCurrentProfile(deps());
  const handler = buildMcpHandler({ deps: deps(), artifactDir, profile, origin, userAgent });
  const c = new Client({ name: "landed-test", version: "1" });
  await c.connect(
    new StreamableHTTPClientTransport(new URL(`${origin}/mcp`), {
      fetch: (input, init) => handler.fetch(new Request(input, init)),
      requestInit: { headers: { Authorization: "Bearer not-checked-by-the-handler-itself" } },
    }),
  );
  return c;
}

/** Calls a tool and parses its JSON text; throws on `isError` so a failure reads clearly. */
async function call<T = Record<string, unknown>>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const result = await client.callTool({ name, arguments: args });
  const text = textOf(result);
  if (result.isError) throw new Error(`${name} failed: ${text}`);
  return JSON.parse(text) as T;
}

async function callExpectingError(name: string, args: Record<string, unknown>): Promise<string> {
  const result = await client.callTool({ name, arguments: args });
  expect(result.isError).toBe(true);
  return textOf(result);
}

function textOf(result: { content?: unknown }): string {
  const content = result.content as { type: string; text?: string }[];
  return content.map((c) => c.text ?? "").join("");
}

beforeAll(async () => {
  connection = await openTestDatabase();
  artifactDir = await mkdtemp(path.join(os.tmpdir(), "landed-mcp-"));
});
afterAll(async () => {
  await connection.close();
  await rm(artifactDir, { recursive: true, force: true });
});
beforeEach(async () => {
  await truncateAll(connection);
  await seedDemoProfile(deps);
  unwrap(await pursueJob(deps(), demo.profileId, { id: demo.jobId, ...demo.job }));
  client = await connect();
});

describe("list_jobs and get_job", () => {
  it("list the job with its derived status and the state of each document", async () => {
    const { jobs } = await call<{ jobs: Record<string, unknown>[] }>("list_jobs");
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      id: demo.jobId,
      title: demo.job.title,
      company: demo.job.companyName,
      status: "Preparing",
      availability: "active",
      application_status: "preparing",
      latest_run_state: null,
      has_unreviewed_drafts: false,
    });
    const attention = await call<{ jobs: unknown[] }>("list_jobs", { filter: "needs_attention" });
    expect(attention.jobs).toHaveLength(1);

    const job = await call("get_job", { job_id: demo.jobId });
    expect(job).toMatchObject({
      id: demo.jobId,
      description: demo.job.rawDescription,
      location: "Remote",
      application: { status: "preparing", notes: null },
      documents: {
        resume: { state: "none", revision_id: null, warnings_count: 0 },
        cover_letter: { state: "none" },
        recruiter_message: { state: "none" },
      },
    });
    expect(await callExpectingError("get_job", { job_id: crypto.randomUUID() })).toContain(
      "not_found",
    );
  });
});

describe("add_job", () => {
  it("creates the job and its application together, and replays on the same id", async () => {
    const jobId = crypto.randomUUID();
    const posting = {
      job_id: jobId,
      title: "Data engineer",
      company: "Example Logistics",
      description: "Example Logistics needs a data engineer for its reporting pipeline.",
      location: "Monterrey",
      salary: "MXN 60,000 a month",
      source_url: "https://example.com/jobs/data-engineer",
    };
    const added = await call<{ job_id: string; application_id: string }>("add_job", posting);
    expect(added.job_id).toBe(jobId);
    expect(added.application_id).toMatch(/^[0-9a-f-]{36}$/);

    const jobRows = await connection.db.select().from(jobs);
    expect(jobRows).toHaveLength(2);
    expect(jobRows.find((j) => j.id === jobId)).toMatchObject({
      title: "Data engineer",
      companyName: "Example Logistics",
      rawDescription: posting.description,
      location: "Monterrey",
      salary: "MXN 60,000 a month",
      sourceUrl: posting.source_url,
      source: "pasted",
    });
    const applicationRows = await connection.db.select().from(applications);
    expect(applicationRows).toHaveLength(2);
    expect(applicationRows.find((a) => a.jobId === jobId)).toMatchObject({
      id: added.application_id,
      status: "preparing",
    });

    const again = await call<{ job_id: string; application_id: string }>("add_job", posting);
    expect(again).toEqual(added);
    expect(await connection.db.select().from(jobs)).toHaveLength(2);
    expect(await connection.db.select().from(applications)).toHaveLength(2);

    const { jobs: listed } = await call<{ jobs: { id: string; title: string }[] }>("list_jobs");
    expect(listed.map((j) => j.id).sort()).toEqual([demo.jobId, jobId].sort());
    expect(listed.find((j) => j.id === jobId)).toMatchObject({
      title: "Data engineer",
      company: "Example Logistics",
      status: "Preparing",
    });
    const detail = await call("get_job", { job_id: jobId });
    expect(detail).toMatchObject({ source_url: posting.source_url, salary: "MXN 60,000 a month" });
  });

  it("refuses a posting without a title, naming the field, and writes nothing", async () => {
    const text = await callExpectingError("add_job", {
      title: "   ",
      company: "Example Logistics",
      description: "A posting with no title.",
    });
    expect(text).toContain("validation");
    expect(text).toContain("title: Enter the job title");
    expect(text).not.toContain("company:");
    expect(await connection.db.select().from(jobs)).toHaveLength(1);
    expect(await connection.db.select().from(applications)).toHaveLength(1);

    const badUrl = await callExpectingError("add_job", {
      title: "Data engineer",
      company: "Example Logistics",
      description: "A posting with a bad address.",
      source_url: "ftp://example.com/posting",
    });
    expect(badUrl).toContain("source_url: Enter a full web address");
  });
});

describe("get_document_brief and submit_document", () => {
  it("opens a queued assistant run, records the harness, and supersedes the previous brief", async () => {
    const first = await call<{
      run_id: string;
      instructions: string;
      input: string;
      schema: Record<string, unknown>;
      rules: string[];
    }>("get_document_brief", {
      job_id: demo.jobId,
      type: "resume",
      assistant: "claude-code/claude-opus-5",
    });
    const run = (await getRun(deps(), demo.profileId, first.run_id))!;
    expect(run).toMatchObject({
      mode: "assistant",
      state: "queued",
      provider: userAgent,
      model: "claude-code/claude-opus-5",
      startedAt: null,
    });
    expect(first.instructions).toContain("resume");
    expect(first.input).toContain(demo.job.rawDescription);
    expect(first).toMatchObject({
      document_type: "resume",
      budgets: { totals: { entries: 7, bullets: 12 } },
    });
    expect(first.schema.type).toBe("object");
    expect(JSON.stringify(first.schema)).not.toContain("maxLength");
    expect(first.rules).toHaveLength(7);

    const second = await call<{ run_id: string }>("get_document_brief", {
      job_id: demo.jobId,
      type: "resume",
    });
    expect((await getRun(deps(), demo.profileId, first.run_id))?.state).toBe("cancelled");
    expect(await getRun(deps(), demo.profileId, second.run_id)).toMatchObject({
      state: "queued",
      model: "unreported",
    });
  });

  it("saves a grounded answer as an assistant revision with no warnings", async () => {
    const brief = await call<{ run_id: string }>("get_document_brief", {
      job_id: demo.jobId,
      type: "resume",
    });
    const saved = await call<{ revision_id: string; warnings: unknown[]; units: unknown[] }>(
      "submit_document",
      { run_id: brief.run_id, content: fixture("resume") },
    );
    expect(saved.warnings).toEqual([]);
    expect(saved.units.length).toBeGreaterThan(0);
    const [revision] = await connection.db.select().from(documentRevisions);
    expect(revision).toMatchObject({ id: saved.revision_id, source: "assistant" });
    expect((await getRun(deps(), demo.profileId, brief.run_id))?.state).toBe("succeeded");

    const { jobs } = await call<{ jobs: Record<string, unknown>[] }>("list_jobs");
    expect(jobs[0]).toMatchObject({ status: "Needs review", has_unreviewed_drafts: true });
    const job = await call<{ documents: { resume: Record<string, unknown> } }>("get_job", {
      job_id: demo.jobId,
    });
    expect(job.documents.resume).toMatchObject({ state: "draft", revision_id: saved.revision_id });

    // A string body is accepted too, including code fences an assistant may add.
    const letter = await call<{ run_id: string }>("get_document_brief", {
      job_id: demo.jobId,
      type: "cover_letter",
    });
    const savedLetter = await call<{ revision_id: string }>("submit_document", {
      run_id: letter.run_id,
      content: "```json\n" + JSON.stringify(fixture("cover-letter")) + "\n```",
    });
    expect(savedLetter.revision_id).toBeDefined();
  });

  it("keeps an ungrounded answer with its warnings", async () => {
    const brief = await call<{ run_id: string }>("get_document_brief", {
      job_id: demo.jobId,
      type: "resume",
    });
    const saved = await call<{ warnings: { kind: string }[] }>("submit_document", {
      run_id: brief.run_id,
      content: fixture("resume.ungrounded"),
    });
    expect(saved.warnings.length).toBeGreaterThan(0);
    expect(new Set(saved.warnings.map((w) => w.kind))).toContain("unknown_evidence");
  });

  it("fails the run on an invalid answer and hands back a fresh run id", async () => {
    const brief = await call<{ run_id: string }>("get_document_brief", {
      job_id: demo.jobId,
      type: "resume",
    });
    const text = await callExpectingError("submit_document", {
      run_id: brief.run_id,
      content: "Sure! Here is the resume.",
    });
    expect(text).toContain("not valid JSON");
    const newRunId = /new_run_id: (\S+)/.exec(text)?.[1];
    expect(newRunId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await getRun(deps(), demo.profileId, brief.run_id)).toMatchObject({
      state: "failed",
      failureKind: "pasted_invalid",
    });
    expect(await getRun(deps(), demo.profileId, newRunId!)).toMatchObject({
      state: "queued",
      mode: "assistant",
    });

    const wrongShape = await callExpectingError("submit_document", {
      run_id: newRunId!,
      content: fixture("cover-letter"),
    });
    expect(wrongShape).toContain("does not match the document shape");
    const retryId = /new_run_id: (\S+)/.exec(wrongShape)?.[1];
    const saved = await call<{ revision_id: string }>("submit_document", {
      run_id: retryId!,
      content: fixture("resume"),
    });
    expect(saved.revision_id).toBeDefined();

    // An answered run is refused without opening another one.
    const again = await callExpectingError("submit_document", {
      run_id: retryId!,
      content: fixture("resume"),
    });
    expect(again).toContain("get_document_brief again");
    expect(again).not.toContain("new_run_id");
    expect(await connection.db.select().from(generationRuns)).toHaveLength(3);
    expect(await connection.db.select().from(documentRevisions)).toHaveLength(1);
  });
});

describe("get_document, edit_unit and render_pdf", () => {
  it("edit one unit, refuse a stale revision, and render the PDF once", async () => {
    const brief = await call<{ run_id: string }>("get_document_brief", {
      job_id: demo.jobId,
      type: "resume",
    });
    const saved = await call<{ revision_id: string }>("submit_document", {
      run_id: brief.run_id,
      content: fixture("resume"),
    });

    type Detail = {
      revision_id: string;
      reviewed: boolean;
      units: { path: string; text: string; evidence_ids: string[] }[];
      warnings: unknown[];
      latest_run: { mode: string; state: string; provider: string; model: string };
    };
    const before = await call<Detail>("get_document", { job_id: demo.jobId, type: "resume" });
    expect(before.revision_id).toBe(saved.revision_id);
    expect(before.reviewed).toBe(false);
    expect(before.latest_run).toMatchObject({ mode: "assistant", state: "succeeded" });
    const bullet = before.units.find((u) => u.path.endsWith(".bullets.0"))!;
    expect(bullet.evidence_ids.length).toBeGreaterThan(0);

    const edited = await call<{ revision_id: string; warnings: unknown[] }>("edit_unit", {
      revision_id: before.revision_id,
      path: bullet.path,
      text: "Built a reporting tool that cut weekly preparation from 4 hours to 1.",
    });
    expect(edited.revision_id).not.toBe(before.revision_id);
    expect(edited.warnings).toEqual([]);
    const after = await call<Detail>("get_document", { job_id: demo.jobId, type: "resume" });
    expect(after.revision_id).toBe(edited.revision_id);
    expect(after.units.find((u) => u.path === bullet.path)?.text).toContain("cut weekly");

    const stale = await callExpectingError("edit_unit", {
      revision_id: before.revision_id,
      path: bullet.path,
      text: "An edit from an old view",
    });
    expect(stale).toContain("get_document again");
    const unknown = await callExpectingError("edit_unit", {
      revision_id: edited.revision_id,
      path: "sections.9.entries.0.bullets.0",
      text: "x",
    });
    expect(unknown).toContain("no longer exists");

    const pdf = await call<{
      filename: string;
      pages: number;
      size_bytes: number;
      download_url: string;
      reused: boolean;
    }>("render_pdf", { job_id: demo.jobId, type: "resume" });
    expect(pdf).toMatchObject({
      filename: "alex-rivera-example-analytics-resume.pdf",
      pages: 1,
      download_url: `${origin}/jobs/${demo.jobId}/resume/pdf`,
      reused: false,
    });
    expect(pdf.size_bytes).toBeGreaterThan(1000);
    const again = await call<{ reused: boolean }>("render_pdf", {
      job_id: demo.jobId,
      type: "resume",
    });
    expect(again.reused).toBe(true);
    expect(await connection.db.select().from(documentArtifacts)).toHaveLength(1);

    expect(
      await callExpectingError("render_pdf", { job_id: demo.jobId, type: "cover_letter" }),
    ).toContain("Nothing generated yet");
  });
});
