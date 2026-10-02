import { mkdirSync, mkdtempSync, readdirSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { migrateWithBackup, NewerDatabaseError } from "./migrate";

let dir: string;
let options: Parameters<typeof migrateWithBackup>[0];

function addMigration(name: string, sql: string) {
  mkdirSync(join(options.migrationsDir, name), { recursive: true });
  writeFileSync(join(options.migrationsDir, name, "migration.sql"), sql);
}

function backups() {
  return readdirSync(options.backupDir).sort();
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "landed-migrate-"));
  options = {
    dbPath: join(dir, "landed.db"),
    migrationsDir: join(dir, "migrations"),
    backupDir: join(dir, "backups"),
    appVersion: "1.2.3",
  };
  addMigration("20260101000000_first", "CREATE TABLE notes (id text PRIMARY KEY);");
});

describe("migrateWithBackup", () => {
  it("creates a fresh database without a backup", () => {
    migrateWithBackup(options);
    const db = new DatabaseSync(options.dbPath);
    expect(db.prepare("SELECT count(*) AS n FROM notes").get()).toEqual({ n: 0 });
    db.close();
    expect(readdirSync(dir)).not.toContain("backups");
  });

  it("backs up an existing database before pending migrations and keeps the newest five", () => {
    migrateWithBackup(options);
    mkdirSync(options.backupDir);
    for (let i = 0; i < 5; i++) {
      const old = join(options.backupDir, `landed-1.0.0-old${i}.db`);
      writeFileSync(old, "");
      utimesSync(old, 1000 + i, 1000 + i);
    }
    addMigration("20260201000000_second", "ALTER TABLE notes ADD body text;");

    migrateWithBackup(options);

    const kept = backups();
    expect(kept).toHaveLength(5);
    expect(kept).not.toContain("landed-1.0.0-old0.db");
    const fresh = kept.find((name) => name.startsWith("landed-1.2.3-"));
    expect(fresh).toBeDefined();
    // The backup holds the database as it was before the pending migration.
    const copy = new DatabaseSync(join(options.backupDir, fresh!));
    expect(copy.prepare("SELECT name FROM pragma_table_info('notes')").all()).toEqual([
      { name: "id" },
    ]);
    copy.close();
  });

  it("refuses a database carrying a migration this build does not know", () => {
    addMigration("20260201000000_second", "ALTER TABLE notes ADD body text;");
    migrateWithBackup(options);
    const olderBuild = { ...options, migrationsDir: join(dir, "older") };
    mkdirSync(join(olderBuild.migrationsDir, "20260101000000_first"), { recursive: true });
    writeFileSync(
      join(olderBuild.migrationsDir, "20260101000000_first", "migration.sql"),
      "CREATE TABLE notes (id text PRIMARY KEY);",
    );

    expect(() => migrateWithBackup(olderBuild)).toThrow(NewerDatabaseError);
  });

  it("makes no backup when nothing is pending", () => {
    migrateWithBackup(options);
    migrateWithBackup(options);
    expect(readdirSync(dir)).not.toContain("backups");
  });
});
