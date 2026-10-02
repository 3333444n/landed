import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { openTestDatabase, truncateAll } from "../helpers/test-database";
import { e2eDatabasePath } from "../../playwright.config";

/** Browser journeys start from an empty test database, never from personal data. */
export default async function globalSetup() {
  mkdirSync(dirname(e2eDatabasePath), { recursive: true });
  const connection = openTestDatabase(e2eDatabasePath);
  try {
    truncateAll(connection);
  } finally {
    connection.close();
  }
}
