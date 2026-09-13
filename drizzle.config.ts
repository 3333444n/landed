import { defineConfig } from "drizzle-kit";

// Migrations are generated SQL files committed to the repository and reviewed like code (ADR 004).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/modules/*/schema.ts",
  out: "./db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://landed:landed@localhost:5432/landed",
  },
  strict: true,
  verbose: true,
});
