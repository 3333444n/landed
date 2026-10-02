/*
 * Server-side helpers every module's service.ts uses: dependency shape, result constructors,
 * timestamps, ids and the mapping from PostgreSQL (and, for the move, SQLite) errors to typed results.
 */
import { DatabaseError } from "pg";
import type { Database } from "@/infrastructure/database";
import type { FieldErrors, ModuleError, Result } from "./contracts";

/** Dependencies arrive as a parameter; nothing here is a singleton. `now` and `newId` are for tests. */
export interface BaseDeps {
  db: Database;
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

/** Drizzle wraps driver errors; the PostgreSQL error sits in `cause`. */
export function postgresError(error: unknown): DatabaseError | null {
  if (error instanceof DatabaseError) return error;
  if (error instanceof Error && error.cause instanceof DatabaseError) return error.cause;
  return null;
}

/**
 * PostgreSQL error codes: 23505 unique, 23503 foreign key, 23514 check. A primary-key conflict is
 * treated as a replay of a client-minted id (docs/05) and answered by `onDuplicatePrimaryKey`.
 */
export async function mapDatabaseError<T>(
  thrown: unknown,
  onDuplicatePrimaryKey: () => Promise<Result<T> | null>,
  uniqueMessage?: FieldErrors | ((constraint: string | undefined) => FieldErrors | undefined),
): Promise<Result<T>> {
  const error = postgresError(thrown);
  if (error) {
    if (error.code === "23505" && error.constraint?.endsWith("_pkey")) {
      const replay = await onDuplicatePrimaryKey();
      if (replay) return replay;
      return fail({
        kind: "conflict",
        message: "This record id is already used by another record",
      });
    }
    if (error.code === "23505") {
      const message =
        typeof uniqueMessage === "function" ? uniqueMessage(error.constraint) : uniqueMessage;
      if (message) return validation(message);
      return fail({ kind: "conflict", message: "A record with the same value already exists" });
    }
    if (error.code === "23503") {
      return fail({
        kind: "conflict",
        message: "Other records still reference this one; detach them first",
      });
    }
    if (error.code === "23514") {
      return validation({ form: ["The record violates a data rule and was not saved"] });
    }
  }
  throw thrown;
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
 * The SQLite counterpart of `mapDatabaseError`, with the same contract, for the move to SQLite
 * (ADR 013). Extended result codes: 1555 primary key, 2067 unique, 787 foreign key, 275 check.
 * SQLite reports a duplicate id as 2067 when the id also sits in a composite unique index
 * (`jobs.profile_id, jobs.id`), so a unique conflict naming an `id` column takes the replay path
 * too. SQLite names no unique constraint, so a `uniqueMessage` function receives the column list.
 * NOT NULL (1299) is rethrown, as `mapDatabaseError` rethrows PostgreSQL's 23502.
 */
export async function mapSqliteError<T>(
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
