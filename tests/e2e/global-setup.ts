import { openTestDatabase, truncateAll } from "../helpers/test-database";

/** Browser journeys start from an empty test database, never from personal data. */
export default async function globalSetup() {
  const connection = await openTestDatabase();
  try {
    await truncateAll(connection);
  } finally {
    await connection.close();
  }
}
