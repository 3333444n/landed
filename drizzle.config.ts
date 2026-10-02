import { defineConfig } from "drizzle-kit";

// Migrations are generated SQL files committed to the repository and reviewed like code (ADR 004).
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/modules/*/schema.ts",
  out: "./db/migrations",
  dbCredentials: {
    url: process.env.LANDED_DATABASE_PATH ?? "./data/landed.db",
  },
  strict: true,
  verbose: true,
});
