/*
 * Shared helpers for tests that need a real database. Each `openTestDatabase()` call opens a fresh
 * SQLite file in the system temp directory with the migrations applied, so a test can never reach
 * personal data.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { createDatabase, type DatabaseConnection } from "@/infrastructure/database";

export function openTestDatabase(
  path = join(mkdtempSync(join(tmpdir(), "landed-test-")), "landed.db"),
): DatabaseConnection {
  const connection = createDatabase(path);
  migrate(connection.writer, { migrationsFolder: "db/migrations" });
  return connection;
}

/** Empties every table; foreign keys are off during the wipe so the order does not matter. */
export function truncateAll(connection: DatabaseConnection): void {
  const client = connection.writer.$client;
  const tables = client
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '__drizzle_migrations'",
    )
    .all() as { name: string }[];
  client.exec("PRAGMA foreign_keys = OFF");
  for (const { name } of tables) client.exec(`DELETE FROM "${name}"`);
  client.exec("PRAGMA foreign_keys = ON");
}
