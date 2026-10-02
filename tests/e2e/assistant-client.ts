import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { e2eDatabasePath } from "../../playwright.config";

/** An assistant over stdio on the browser server's database, as a harness runs `pnpm mcp`. */
export async function connectAssistant(name: string): Promise<Client> {
  const client = new Client({ name, version: "1" });
  await client.connect(
    new StdioClientTransport({
      command: "node",
      args: ["dist-desktop/mcp.cjs"],
      env: {
        PATH: process.env.PATH!,
        LANDED_DATABASE_PATH: e2eDatabasePath,
        LANDED_ARTIFACT_DIR: "./artifacts-test",
      },
    }),
  );
  return client;
}
