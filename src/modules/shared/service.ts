/*
 * Server-side helpers every module's service.ts uses: dependency shape, result constructors,
 * timestamps, ids and the mapping from SQLite errors to typed results.
 */
import type { Database, DatabaseConnection } from "@/infrastructure/database";
import type { FieldErrors, ModuleError, Result } from "./contracts";

/**
 * Dependencies arrive as a parameter; nothing here is a singleton. `now` and `newId` are for tests.
 * `db` is the read-only reader; every write goes through `runInTransaction(async (tx) => ...)`,
 * and reads inside it use `tx`. A nested call becomes a savepoint, so a composition can pass
 * `{ ...deps, db: tx }` to another module's operation.
 */
export interface BaseDeps {
  db: Database;
  runInTransaction: DatabaseConnection["runInTransaction"];
  now?: () => Date;
  newId?: () => string;
}

export const fail = (error: ModuleError): Result<never> => ({ ok: false, error });
export const validation = (fieldErrors: FieldErrors): Result<never> =>
  fail({ kind: "validation", fieldErrors });
export const notFound = (what: string): Result<never> =>
  fail({ kind: "not_found", message: `${what} not found` });
export const stale = (): Result<never> =>
  fail({
    kind: "stale",
    message: "This record changed since you opened it. Reload to see the latest version.",
  });

export function newId(deps: BaseDeps): string {
  return deps.newId ? deps.newId() : crypto.randomUUID();
}

export function now(deps: BaseDeps): Date {
  return deps.now ? deps.now() : new Date();
}

export function stamps(deps: BaseDeps) {
  const at = now(deps);
  return { createdAt: at, updatedAt: at };
}

export function expected(iso: string | undefined): Date | undefined {
  return iso ? new Date(iso) : undefined;
}

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** A `node:sqlite` error; Drizzle passes it through unwrapped, but a `cause` is honoured too. */
export function sqliteError(error: unknown): (Error & { errcode: number }) | null {
  const isSqlite = (e: unknown): e is Error & { errcode: number } =>
    e instanceof Error &&
    (e as { code?: unknown }).code === "ERR_SQLITE_ERROR" &&
    typeof (e as { errcode?: unknown }).errcode === "number";
  if (isSqlite(error)) return error;
  if (error instanceof Error && isSqlite(error.cause)) return error.cause;
  return null;
}

/** The `table.column` list SQLite names in "UNIQUE constraint failed: a.x, a.y". */
function uniqueColumns(message: string): string | undefined {
  return /UNIQUE constraint failed: (.+)$/.exec(message)?.[1];
}

/**
 * Maps a constraint error to a typed result. A primary-key conflict is treated as a replay of a
 * client-minted id (docs/05) and answered by `onDuplicatePrimaryKey`.
 * Extended result codes: 1555 primary key, 2067 unique, 787 foreign key, 275 check.
 * SQLite checks the unique indexes in reverse declaration order and reports the first failure, so
 * schemas declare the `(profile_id, id)` unique last: a retried id then surfaces as 2067 on it,
 * and a unique conflict naming an `id` column takes the replay path too. SQLite names no unique
 * constraint, so a `uniqueMessage` function receives the column list.
 * NOT NULL (1299) and anything else is rethrown.
 */
export async function mapDatabaseError<T>(
  thrown: unknown,
  onDuplicatePrimaryKey: () => Promise<Result<T> | null>,
  uniqueMessage?: FieldErrors | ((columns: string | undefined) => FieldErrors | undefined),
): Promise<Result<T>> {
  const error = sqliteError(thrown);
  if (error) {
    const columns = error.errcode === 2067 ? uniqueColumns(error.message) : undefined;
    const namesId = columns?.split(", ").some((column) => column.split(".").pop() === "id");
    if (error.errcode === 1555 || namesId) {
      const replay = await onDuplicatePrimaryKey();
      if (replay) return replay;
      return fail({
        kind: "conflict",
        message: "This record id is already used by another record",
      });
    }
    if (error.errcode === 2067) {
      const message = typeof uniqueMessage === "function" ? uniqueMessage(columns) : uniqueMessage;
      if (message) return validation(message);
      return fail({ kind: "conflict", message: "A record with the same value already exists" });
    }
    if (error.errcode === 787) {
      return fail({
        kind: "conflict",
        message: "Other records still reference this one; detach them first",
      });
    }
    if (error.errcode === 275) {
      return validation({ form: ["The record violates a data rule and was not saved"] });
    }
  }
  throw thrown;
}
