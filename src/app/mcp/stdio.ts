/*
 * The assistant surface over stdio (ADR 013): the harness launches Landed with `--mcp` and talks
 * to this process alone, so no token is needed. stdout carries the protocol; anything else goes
 * to stderr. Pending migrations run first, so an assistant works before the app was ever opened.
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Readable } from "node:stream";
import { serveStdio, StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { migrateWithBackup, NewerDatabaseError } from "@/infrastructure/migrate";
import { createDatabase } from "@/infrastructure/database";
import { createMcpServer } from "./server";

export function serveLandedStdio(options: {
  dbPath: string;
  artifactDir: string;
  migrationsDir: string;
  backupDir: string;
  appVersion: string;
  /** Where requests arrive; defaults to process.stdin (see desktop/main.ts for Windows). */
  input?: Readable;
}): void {
  mkdirSync(dirname(options.dbPath), { recursive: true });
  try {
    migrateWithBackup(options);
  } catch (error) {
    if (!(error instanceof NewerDatabaseError)) throw error;
    console.error("Landed was updated; restart your assistant so it uses the new version.");
    process.exit(1);
  }
  const deps = createDatabase(options.dbPath);
  serveStdio(
    () => createMcpServer({ deps, artifactDir: resolve(options.artifactDir), userAgent: "stdio" }),
    { transport: new StdioServerTransport(options.input, process.stdout) },
  );
}
