/*
 * Process-wide database connection for the Next.js server. Created lazily on first use and
 * reused across requests; in development the module is re-evaluated on hot reload, so the
 * connection is cached on globalThis to avoid leaking pools.
 */
import { loadConfig } from "./config";
import { createDatabase, type DatabaseConnection } from "./database";

const globalRef = globalThis as typeof globalThis & { __landedDatabase?: DatabaseConnection };

export function getDatabase(): DatabaseConnection {
  if (!globalRef.__landedDatabase) {
    globalRef.__landedDatabase = createDatabase(loadConfig().DATABASE_URL);
  }
  return globalRef.__landedDatabase;
}
