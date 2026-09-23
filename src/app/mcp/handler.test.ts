import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentProfile } from "@/modules/profile";

vi.mock("@/modules/profile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/profile")>()),
  getCurrentProfile: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(getCurrentProfile).mockReset().mockResolvedValue(null);
});
import { buildMcpHandler } from "./handler";

/** Drives the handler in-process with the SDK client; no database is needed without a profile. */
async function connect() {
  const handler = buildMcpHandler({
    deps: { db: null as never },
    artifactDir: "/tmp/unused",
    origin: "http://127.0.0.1:3000",
    userAgent: "test-client/1",
  });
  const client = new Client({ name: "test", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://127.0.0.1:3000/mcp"), {
      fetch: (input, init) => handler.fetch(new Request(input, init)),
    }),
  );
  return { client, handler };
}

describe("buildMcpHandler", () => {
  it("lists document and profile tools with their annotations", async () => {
    const { client } = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(
      [
        ...["role", "education", "project", "skill", "achievement"].flatMap((kind) =>
          ["add", "update", "delete"].map((verb) => `${verb}_${kind}`),
        ),
        "get_profile",
        "create_profile",
        "update_profile",
        "add_job",
        "add_job_source",
        "update_job_source",
        "list_job_sources",
        "set_job_source",
        "edit_unit",
        "get_document",
        "get_document_brief",
        "get_job",
        "list_jobs",
        "render_pdf",
        "submit_document",
      ].sort(),
    );
    const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
    expect(byName.list_jobs!.annotations).toMatchObject({ readOnlyHint: true });
    expect(byName.submit_document!.annotations).toMatchObject({ destructiveHint: false });
    expect(byName.add_job!.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
    });
    expect(byName.get_document_brief!.inputSchema).toMatchObject({ type: "object" });
    await client.close();
  });

  it("allows reading an empty profile and guides other tools to creation", async () => {
    const { client } = await connect();
    const result = await client.callTool({ name: "list_jobs", arguments: {} });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain("Call create_profile");
    const empty = await client.callTool({ name: "get_profile", arguments: {} });
    expect(empty.isError).not.toBe(true);
    expect(JSON.stringify(empty.content)).toContain("profile");
    await client.close();
  });

  it("does not return private exception messages", async () => {
    vi.mocked(getCurrentProfile).mockRejectedValue(new Error("SECRET_SQL_PARAMETERS"));
    const { client } = await connect();
    for (const name of ["get_profile", "list_jobs"]) {
      const result = await client.callTool({ name, arguments: {} });
      expect(result.isError).toBe(true);
      expect(JSON.stringify(result)).not.toContain("SECRET_SQL_PARAMETERS");
    }
    await client.close();
  });

  it("serves a 2025-era client statelessly: SSE answers, both Accept types required", async () => {
    const { handler } = await connect();
    const post = (headers: Record<string, string>, body: unknown) =>
      handler.fetch(
        new Request("http://127.0.0.1:3000/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
        }),
      );
    const accept = { Accept: "application/json, text/event-stream" };
    const initialize = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "legacy", version: "1" },
      },
    };
    const started = await post(accept, initialize);
    expect(started.status).toBe(200);
    expect(started.headers.get("content-type")).toContain("text/event-stream");
    expect(await started.text()).toContain('"protocolVersion"');

    const listed = await post(accept, { jsonrpc: "2.0", id: 2, method: "tools/list" });
    expect(listed.status).toBe(200);
    expect(await listed.text()).toContain('"list_jobs"');

    const refused = await post({ Accept: "application/json" }, initialize);
    expect(refused.status).toBe(406);
  });

  it("answers GET with 405 on the stateless path", async () => {
    const { handler } = await connect();
    const response = await handler.fetch(new Request("http://127.0.0.1:3000/mcp"));
    expect(response.status).toBe(405);
  });
});
