// Writes a consistent copy of the database to backups/ (safe while the app runs). Usage: pnpm db:backup
import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const path = process.env.LANDED_DATABASE_PATH || "./data/landed.db";
const file = `backups/landed-${new Date().toISOString().replace(/[-:]|\.\d+/g, "")}.db`;
mkdirSync("backups", { recursive: true });
const db = new DatabaseSync(path, { readOnly: true });
db.exec(`VACUUM INTO '${file}'`);
db.close();
console.log(`Backup written to ${file}`);
