/*
 * Applies the bundled migrations to the desktop database (ADR 013), copying the file to a backup
 * first when an existing database has migrations pending, and refusing a database that carries a
 * migration this build does not know (Drizzle's migrator would silently skip it).
 */
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";

const KEPT_BACKUPS = 5;

export class NewerDatabaseError extends Error {}

export function migrateWithBackup(options: {
  dbPath: string;
  migrationsDir: string;
  backupDir: string;
  appVersion: string;
}): void {
  const existed = existsSync(options.dbPath);
  const client = new DatabaseSync(options.dbPath);
  try {
    const local = readMigrationFiles({ migrationsFolder: options.migrationsDir }).map(
      (m) => m.name,
    );
    const applied = appliedMigrations(client);
    const unknown = applied.find((name) => !local.includes(name));
    if (unknown) throw new NewerDatabaseError(`Unknown migration ${unknown}`);
    if (existed && local.some((name) => !applied.includes(name))) {
      backUp(client, options.backupDir, options.appVersion);
    }
    migrate(drizzle({ client }), { migrationsFolder: options.migrationsDir });
  } finally {
    client.close();
  }
}

function appliedMigrations(client: DatabaseSync): string[] {
  const table = client
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'")
    .get();
  if (!table) return [];
  return client
    .prepare("SELECT name FROM __drizzle_migrations")
    .all()
    .map((row) => String(row.name));
}

function backUp(client: DatabaseSync, backupDir: string, appVersion: string): void {
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  client.prepare("VACUUM INTO ?").run(join(backupDir, `landed-${appVersion}-${stamp}.db`));
  const backups = readdirSync(backupDir)
    .filter((name) => name.startsWith("landed-") && name.endsWith(".db"))
    .map((name) => join(backupDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  for (const old of backups.slice(KEPT_BACKUPS)) rmSync(old);
}
