/*
 * One MCP server with every tool bound to the context. No Next imports, so the stdio entry and
 * the tests build it directly.
 */
import { McpServer } from "@modelcontextprotocol/server";
import { registerTools, type ToolContext } from "./tools";

export function createMcpServer(ctx: ToolContext): McpServer {
  const server = new McpServer({ name: "landed", version: "1" });
  registerTools(server, ctx);
  return server;
}
