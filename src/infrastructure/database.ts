import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as applicationsSchema from "@/modules/applications/schema";
import * as documentsSchema from "@/modules/documents/schema";
import * as companiesSchema from "@/modules/companies/schema";
import * as jobsSchema from "@/modules/jobs/schema";
import * as profileSchema from "@/modules/profile/schema";

export const schema = {
  ...profileSchema,
  ...jobsSchema,
  ...companiesSchema,
  ...applicationsSchema,
  ...documentsSchema,
};

export type Database = NodePgDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Either the pool-backed database or a transaction handle; repository functions accept both. */
export type DbHandle = Database | Transaction;

export interface DatabaseConnection {
  db: Database;
  close: () => Promise<void>;
}

/** Opens a connection pool. The pool is a live resource, so it is the one thing here that holds state. */
export function createDatabase(url: string): DatabaseConnection {
  const pool = new Pool({ connectionString: url });
  const db = drizzle({ client: pool, schema });
  return { db, close: () => pool.end() };
}
