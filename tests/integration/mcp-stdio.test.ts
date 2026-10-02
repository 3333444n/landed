/*
 * The bundled stdio entry (pnpm mcp) spawned as its own process, as a harness launches it,
 * against a fresh database file. It also renders a PDF, the part of the bundle most likely to
 * break (React PDF loads fonts and WebAssembly at run time).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { afterAll, beforeAll, expect, it } from "vitest";
import { demo, seedDemoProfile, unwrap } from "../helpers/demo-seed";
import { openTestDatabase } from "../helpers/test-database";
import { pursueJob } from "@/app/jobs/pursue-job";

const dir = mkdtempSync(join(tmpdir(), "landed-stdio-"));
let client: Client;

async function call<T = Record<string, unknown>>(name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args });
  const text = (result.content as { text: string }[])[0]!.text;
  if (result.isError) throw new Error(`${name} failed: ${text}`);
  return JSON.parse(text) as T;
}

beforeAll(async () => {
  execFileSync("node", ["desktop/build.mjs", "mcp"]);
  const connection = openTestDatabase(join(dir, "landed.db"));
  await seedDemoProfile(() => connection);
  unwrap(await pursueJob(connection, demo.profileId, { id: demo.jobId, ...demo.job }));
  connection.close();
  client = new Client({ name: "stdio-test", version: "1" });
  await client.connect(
    new StdioClientTransport({
      command: "node",
      args: ["dist-desktop/mcp.cjs"],
      env: {
        PATH: process.env.PATH!,
        LANDED_DATABASE_PATH: join(dir, "landed.db"),
        LANDED_ARTIFACT_DIR: join(dir, "artifacts"),
      },
    }),
  );
}, 60_000);
afterAll(async () => {
  await client?.close();
  rmSync(dir, { recursive: true, force: true });
});

it("serves every tool over stdio, saves a job and renders a PDF to a file path", async () => {
  expect((await client.listTools()).tools).toHaveLength(43);

  const added = await call<{ job_id: string }>("add_job", {
    title: "Example Engineer",
    description: "Build fictional things.",
  });
  const { jobs } = await call<{ jobs: { id: string }[] }>("list_jobs", {});
  expect(jobs.map((job) => job.id)).toEqual(expect.arrayContaining([demo.jobId, added.job_id]));

  const brief = await call<{ run_id: string }>("get_document_brief", {
    job_id: demo.jobId,
    type: "resume",
  });
  await call("submit_document", {
    run_id: brief.run_id,
    content: JSON.parse(readFileSync("examples/generation/fixtures/resume.json", "utf8")),
  });
  const pdf = await call<{ path: string; pages: number }>("render_pdf", {
    job_id: demo.jobId,
    type: "resume",
  });
  expect(pdf.pages).toBe(1);
  expect(pdf.path.startsWith(join(dir, "artifacts"))).toBe(true);
  expect(readFileSync(pdf.path).subarray(0, 5).toString()).toBe("%PDF-");
});
