// Release smoke test: starts the packaged app with --mcp on a throwaway data folder and checks
// that the tools answer over stdio. Run after `pnpm desktop:dist`; Linux needs `xvfb-run -a`.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const command = {
  darwin: `release/${process.arch === "arm64" ? "mac-arm64" : "mac"}/Landed.app/Contents/MacOS/Landed`,
  win32: "release/win-unpacked/Landed.exe",
  linux: "release/linux-unpacked/landed",
}[process.platform];
const userData = mkdtempSync(join(tmpdir(), "landed-smoke-"));
const args = ["--mcp", `--user-data-dir=${userData}`];
// GitHub's Ubuntu runners refuse Chromium's sandbox helper; no page is ever loaded here.
if (process.platform === "linux") args.push("--no-sandbox");

const client = new Client({ name: "smoke", version: "1" });
await client.connect(new StdioClientTransport({ command, args, stderr: "inherit" }));
const { tools } = await client.listTools();
await client.close();
console.log(`${tools.length} tools`);
if (tools.length !== 43) process.exit(1);
