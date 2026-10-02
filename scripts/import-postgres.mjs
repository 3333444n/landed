// One-time copy of a Docker/PostgreSQL installation into the SQLite file. Reads PostgreSQL only.
// Usage: pnpm import:postgres -- --from postgres://user:password@localhost:5432/landed [--to ./data/landed.db]
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import pg from "pg";

// Parents before children, so every foreign key finds its row.
const tables = [
  "profiles",
  "employment",
  "projects",
  "skills",
  "education",
  "achievements",
  "achievement_skills",
  "skill_employment",
  "skill_projects",
  "job_source_options",
  "companies",
  "company_findings",
  "jobs",
  "job_finding_selections",
  "applications",
  "generation_runs",
  "documents",
  "document_revisions",
  "document_artifacts",
];

const { values } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== "--"), // pnpm passes the separator through
  options: { from: { type: "string" }, to: { type: "string" } },
});
if (!values.from) {
  console.error("Usage: pnpm import:postgres -- --from <postgres url> [--to <sqlite file>]");
  process.exit(1);
}
const to = values.to ?? "./data/landed.db";

// date columns stay 'YYYY-MM-DD' text; numeric (cost_usd) becomes a number.
pg.types.setTypeParser(1082, (value) => value);
pg.types.setTypeParser(1700, Number);

function toSqlite(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value !== null && typeof value === "object") return JSON.stringify(value);
  return value;
}

mkdirSync(dirname(to), { recursive: true });
const sqlite = new DatabaseSync(to);
sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA foreign_keys = ON");
migrate(drizzle({ client: sqlite }), { migrationsFolder: "./db/migrations" });
if (sqlite.prepare("select count(*) as n from profiles").get().n > 0) {
  console.error(`${to} already has a profile; refusing to overwrite it.`);
  process.exit(1);
}

const source = new pg.Client({ connectionString: values.from });
await source.connect();
await source.query("set default_transaction_read_only = on");

const counts = [];
sqlite.exec("BEGIN");
try {
  for (const table of tables) {
    const { rows } = await source.query(`select * from ${table}`);
    for (const row of rows) {
      const columns = Object.keys(row);
      sqlite
        .prepare(
          `insert into ${table} (${columns.join(", ")}) values (${columns.map(() => "?").join(", ")})`,
        )
        .run(...columns.map((column) => toSqlite(row[column])));
    }
    counts.push({ table, postgres: rows.length });
  }
  sqlite.exec("COMMIT");
} catch (error) {
  sqlite.exec("ROLLBACK");
  throw error;
} finally {
  await source.end();
}

let mismatch = false;
for (const row of counts) {
  row.sqlite = sqlite.prepare(`select count(*) as n from ${row.table}`).get().n;
  mismatch ||= row.sqlite !== row.postgres;
}
sqlite.close();
console.table(counts);
if (mismatch) {
  console.error("Row counts differ; do not use the imported file.");
  process.exit(1);
}
console.log(`Imported into ${to}`);
