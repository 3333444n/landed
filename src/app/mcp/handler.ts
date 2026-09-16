/*
 * The MCP handler for one request: a fresh server with the seven tools bound to the verified
 * profile, the dependencies and the request's origin. No Next imports, so the integration test
 * drives `fetch` directly. `legacy: "stateless"` keeps the 2025-era transport that Claude Code,
 * Codex and Claude Desktop speak today: every POST is answered by a fresh instance, GET and
 * DELETE answer 405, and nothing is held between requests.
 */
import { createMcpHandler, McpServer, type McpHttpHandler } from "@modelcontextprotocol/server";
import { registerTools, type ToolContext } from "./tools";

export const serverInfo = { name: "landed", version: "1" } as const;

export function buildMcpHandler(ctx: ToolContext): McpHttpHandler {
  return createMcpHandler(
    () => {
      const server = new McpServer(serverInfo);
      registerTools(server, ctx);
      return server;
    },
    { legacy: "stateless" },
  );
}
