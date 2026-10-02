// `pnpm mcp`: the stdio server from a checkout, for contributors (the installed app runs `--mcp`).
import { loadConfig } from "../src/infrastructure/config";
import { serveLandedStdio } from "../src/app/mcp/stdio";

const config = loadConfig();
serveLandedStdio({
  dbPath: config.LANDED_DATABASE_PATH,
  artifactDir: config.LANDED_ARTIFACT_DIR,
  migrationsDir: "db/migrations",
  backupDir: "data/backups",
  appVersion: "dev",
});
