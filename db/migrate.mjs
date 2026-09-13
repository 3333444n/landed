// Applies db/migrations to DATABASE_URL using only production dependencies (drizzle-orm, pg),
// so the release image needs no drizzle-kit. Contributors keep using `pnpm db:migrate`.
// Usage: DATABASE_URL=postgres://... node db/migrate.mjs
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const db = drizzle({ client: pool });

async function appliedCount() {
  // Drizzle records applied migrations here; the table does not exist before the first run.
  const result = await pool.query(
    "SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations",
  );
  return result.rows[0].count;
}

try {
  const before = await appliedCount().catch(() => 0);
  await migrate(db, { migrationsFolder: "./db/migrations" });
  const after = await appliedCount();
  console.log(`Migrations: ${after - before} applied, ${after} total`);
} catch (error) {
  // drizzle wraps the driver error; the cause carries the useful part ("password authentication
  // failed", "ECONNREFUSED"), so print both.
  const message = error instanceof Error ? error.message : String(error);
  const cause =
    error instanceof Error && error.cause instanceof Error ? ` (${error.cause.message})` : "";
  console.error(`Migration failed: ${message}${cause}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
