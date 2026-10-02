// Replaces the database with a backup. Stop the app first. Usage: pnpm db:restore backups/landed-<timestamp>.db
import { copyFileSync, rmSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: pnpm db:restore <backup file>   (stop the app first)");
  process.exit(1);
}
const path = process.env.LANDED_DATABASE_PATH || "./data/landed.db";
rmSync(`${path}-wal`, { force: true });
rmSync(`${path}-shm`, { force: true });
copyFileSync(file, path);
console.log(`Restored ${file} into ${path}`);
