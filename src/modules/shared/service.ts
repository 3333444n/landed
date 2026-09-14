/*
 * Server-side helpers every module's service.ts uses: dependency shape, result constructors,
 * timestamps, ids and the mapping from PostgreSQL errors to typed results.
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
