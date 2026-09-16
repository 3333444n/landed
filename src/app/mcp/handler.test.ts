import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";
import { buildMcpHandler } from "./handler";

/** Drives the handler in-process with the SDK client; no database is needed without a profile. */
async function connect(profile: null) {
  const handler = buildMcpHandler({
    deps: { db: null as never },
    artifactDir: "/tmp/unused",
    profile,
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
  it("lists the seven tools with their annotations", async () => {
    const { client } = await connect(null);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "edit_unit",
      "get_document",
      "get_document_brief",
      "get_job",
      "list_jobs",
      "render_pdf",
      "submit_document",
    ]);
    const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
    expect(byName.list_jobs!.annotations).toMatchObject({ readOnlyHint: true });
    expect(byName.submit_document!.annotations).toMatchObject({ destructiveHint: false });
    expect(byName.get_document_brief!.inputSchema).toMatchObject({ type: "object" });
    await client.close();
  });

  it("answers every tool with an error when no profile exists yet", async () => {
    const { client } = await connect(null);
    const result = await client.callTool({ name: "list_jobs", arguments: {} });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain("Create your profile in the browser first");
    await client.close();
  });

  it("serves a 2025-era client statelessly: SSE answers, both Accept types required", async () => {
    const { handler } = await connect(null);
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
    const { handler } = await connect(null);
    const response = await handler.fetch(new Request("http://127.0.0.1:3000/mcp"));
    expect(response.status).toBe(405);
  });
});
