/*
 * SQLite access through Node's built-in `node:sqlite` and Drizzle's node-sqlite driver (ADR 013).
 * One writer connection carries every write, inside a transaction serialized by an in-process
 * async mutex and opened with BEGIN IMMEDIATE; nested calls become savepoints. A separate
 * read-only connection serves reads outside transactions, so a stray write there throws.
 *
 * Drizzle's own `transaction()` on a synchronous driver commits before an async callback
 * finishes, so callers use `runInTransaction` instead.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { DatabaseSync } from "node:sqlite";
import { drizzle, type NodeSQLiteDatabase } from "drizzle-orm/node-sqlite";

const BUSY_TIMEOUT_MS = 5000;

/** Opens one connection. The writer switches the file to WAL; the reader cannot write at all. */
export function openSqlite(path: string, options: { readonly?: boolean } = {}): DatabaseSync {
  const readonly = options.readonly ?? false;
  const client = new DatabaseSync(path, { readOnly: readonly });
  if (!readonly) {
    client.exec("PRAGMA journal_mode = WAL");
    client.exec("PRAGMA synchronous = NORMAL");
  }
  client.exec("PRAGMA foreign_keys = ON");
  client.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
  return client;
}

export type SqliteHandle<TSchema extends Record<string, unknown>> = NodeSQLiteDatabase<TSchema> & {
  $client: DatabaseSync;
};

export interface SqliteDatabase<TSchema extends Record<string, unknown>> {
  /** Reads outside a transaction. Read-only: a write through it throws. */
  db: SqliteHandle<TSchema>;
  /** The single writing connection; write through `runInTransaction`, which hands it over. */
  writer: SqliteHandle<TSchema>;
  runInTransaction: <T>(fn: (tx: SqliteHandle<TSchema>) => Promise<T>) => Promise<T>;
  close: () => void;
}

/** Runs callbacks one at a time, in call order. */
function createMutex() {
  let tail: Promise<void> = Promise.resolve();
  return async function exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const previous = tail;
    let release!: () => void;
    tail = new Promise<void>((resolve) => (release = resolve));
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  };
}

/**
 * Opens the writer (creating the file and switching it to WAL) and then the reader. `path` must be
 * a file: a second connection to `:memory:` would open a different, empty database.
 */
export function createSqliteDatabase<
  TSchema extends Record<string, unknown> = Record<string, never>,
>(path: string, schema?: TSchema): SqliteDatabase<TSchema> {
  const writerClient = openSqlite(path);
  const readerClient = openSqlite(path, { readonly: true });
  const writer = drizzle({ client: writerClient, schema });
  const db = drizzle({ client: readerClient, schema });
  const exclusive = createMutex();
  // The savepoint depth of the transaction the current async context runs inside.
  const depth = new AsyncLocalStorage<number>();

  async function runInTransaction<T>(fn: (tx: SqliteHandle<TSchema>) => Promise<T>): Promise<T> {
    const parent = depth.getStore();
    if (parent !== undefined) {
      const name = `sp${parent + 1}`;
      writerClient.exec(`SAVEPOINT ${name}`);
      try {
        const result = await depth.run(parent + 1, () => fn(writer));
        writerClient.exec(`RELEASE ${name}`);
        return result;
      } catch (error) {
        writerClient.exec(`ROLLBACK TO ${name}`);
        writerClient.exec(`RELEASE ${name}`);
        throw error;
      }
    }
    return exclusive(async () => {
      writerClient.exec("BEGIN IMMEDIATE");
      try {
        const result = await depth.run(0, () => fn(writer));
        writerClient.exec("COMMIT");
        return result;
      } catch (error) {
        // SQLite may already have rolled back on its own (for example on SQLITE_FULL).
        if (writerClient.isTransaction) writerClient.exec("ROLLBACK");
        throw error;
      }
    });
  }

  return {
    db,
    writer,
    runInTransaction,
    close: () => {
      readerClient.close();
      writerClient.close();
    },
  };
}
