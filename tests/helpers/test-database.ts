/*
 * Shared helpers for tests that need real PostgreSQL. They read DATABASE_URL from the
 * environment or from .env.test and refuse to run against a database not named for testing.
 */
import { readFileSync } from "node:fs";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { createDatabase, type DatabaseConnection } from "@/infrastructure/database";

export function testDatabaseUrl(): string {
  let url = process.env.DATABASE_URL;
  if (!url) {
    const line = readFileSync(".env.test", "utf8")
      .split("\n")
      .find((l) => l.startsWith("DATABASE_URL="));
    url = line?.slice("DATABASE_URL=".length).trim();
  }
  if (!url) throw new Error("DATABASE_URL is not set; copy .env.test.example to .env.test");
  if (!/_test(\?|$)/.test(url)) {
    throw new Error(`Refusing to run tests against a database not named *_test: ${url}`);
  }
  return url;
}

export async function openTestDatabase(): Promise<DatabaseConnection> {
  const connection = createDatabase(testDatabaseUrl());
  await migrate(connection.db, { migrationsFolder: "db/migrations" });
  return connection;
}

const phase0Tables = [
  "achievement_skills",
  "achievements",
  "projects",
  "employment",
  "education",
  "skills",
  "profiles",
];

export async function truncateAll(connection: DatabaseConnection): Promise<void> {
  await connection.db.execute(
    sql.raw(`TRUNCATE TABLE ${phase0Tables.map((t) => `"${t}"`).join(", ")} CASCADE`),
  );
}
