import * as applicationsSchema from "@/modules/applications/schema";
import * as documentsSchema from "@/modules/documents/schema";
import * as companiesSchema from "@/modules/companies/schema";
import * as jobsSchema from "@/modules/jobs/schema";
import * as profileSchema from "@/modules/profile/schema";
import { createSqliteDatabase, type SqliteDatabase } from "./sqlite";

export const schema = {
  ...profileSchema,
  ...jobsSchema,
  ...companiesSchema,
  ...applicationsSchema,
  ...documentsSchema,
};

export type DatabaseConnection = SqliteDatabase<typeof schema>;
export type Database = DatabaseConnection["db"];
/** The reader or a transaction handle (same type); repository functions accept either. */
export type DbHandle = Database;

/** Opens the database file. The connections are live resources, the one thing here holding state. */
export function createDatabase(path: string): DatabaseConnection {
  return createSqliteDatabase(path, schema);
}
