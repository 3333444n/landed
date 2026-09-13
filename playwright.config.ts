import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";

// Browser journeys run against the isolated test database so personal data is never touched.
function testDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const line = readFileSync(".env.test", "utf8")
    .split("\n")
    .find((l) => l.startsWith("DATABASE_URL="));
  if (!line)
    throw new Error("DATABASE_URL missing: set it or create .env.test from .env.test.example");
  return line.slice("DATABASE_URL=".length).trim();
}

const port = 3417;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.CI ? `pnpm start -p ${port}` : `pnpm dev -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    env: { DATABASE_URL: testDatabaseUrl() },
    timeout: 120_000,
  },
});
