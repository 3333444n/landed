// Applies db/migrations to the SQLite file at LANDED_DATABASE_PATH (default ./data/landed.db),
// creating the file and its folder if missing. Usage: pnpm db:migrate
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";

const path = process.env.LANDED_DATABASE_PATH || "./data/landed.db";
mkdirSync(dirname(path), { recursive: true });
const client = new DatabaseSync(path);
client.exec("PRAGMA journal_mode = WAL");
client.exec("PRAGMA foreign_keys = ON");

try {
  migrate(drizzle({ client }), { migrationsFolder: "./db/migrations" });
  console.log(`Migrations applied to ${path}`);
} catch (error) {
  console.error(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  client.close();
}
