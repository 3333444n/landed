import { defineConfig, devices } from "@playwright/test";

// Browser journeys run against their own database file so personal data is never touched.
export const e2eDatabasePath = "./data/landed_e2e_test.db";

const port = 3417;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Migrate first: the readiness check loads a page that reads the database.
    command: `node db/migrate.mjs && pnpm ${process.env.CI ? "start" : "dev"} -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    // The fake adapter answers from examples/generation; no key is ever needed (ADR 006).
    env: {
      LANDED_DATABASE_PATH: e2eDatabasePath,
      LANDED_MODEL_PROVIDER: "fake",
      LANDED_ARTIFACT_DIR: "./artifacts-test",
      // Any string of at least 24 characters; assistant.spec.ts presents it on /mcp.
      LANDED_MCP_TOKEN: "test-token-test-token-test-token",
    },
    timeout: 120_000,
  },
});
