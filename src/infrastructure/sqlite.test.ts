import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createSqliteDatabase, openSqlite, type SqliteDatabase } from "./sqlite";

const notes = sqliteTable("notes", {
  id: integer("id").primaryKey(),
  body: text("body").notNull(),
});
const schema = { notes };

let dir: string;
let database: SqliteDatabase<typeof schema>;

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 1));
const bodies = async () =>
  (await database.db.select().from(notes).orderBy(notes.id)).map((n) => n.body);

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "landed-sqlite-"));
  database = createSqliteDatabase(join(dir, "landed.db"), schema);
  database.writer.run(sql`CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL)`);
});

afterEach(() => {
  database.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("openSqlite", () => {
  it("opens the writer in WAL mode with foreign keys and a busy timeout", () => {
    const client = database.writer.$client;
    expect(client.prepare("PRAGMA journal_mode").get()).toEqual({ journal_mode: "wal" });
    expect(client.prepare("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
    expect(client.prepare("PRAGMA busy_timeout").get()).toEqual({ timeout: 5000 });
    expect(client.prepare("PRAGMA synchronous").get()).toEqual({ synchronous: 1 });
  });

  it("gives the reader foreign keys and a busy timeout too", () => {
    const client = database.db.$client;
    expect(client.prepare("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
    expect(client.prepare("PRAGMA busy_timeout").get()).toEqual({ timeout: 5000 });
  });

  it("works on an in-memory database", () => {
    const client = openSqlite(":memory:");
    expect(client.prepare("SELECT 1 AS one").get()).toEqual({ one: 1 });
    client.close();
  });
});

describe("runInTransaction", () => {
  it("commits the callback's writes and returns its value", async () => {
    const value = await database.runInTransaction(async (tx) => {
      await tx.insert(notes).values({ id: 1, body: "first" });
      await tick();
      await tx.insert(notes).values({ id: 2, body: "second" });
      return "done";
    });
    expect(value).toBe("done");
    expect(await bodies()).toEqual(["first", "second"]);
  });

  it("rolls back every write when the callback throws, and rethrows", async () => {
    await expect(
      database.runInTransaction(async (tx) => {
        await tx.insert(notes).values({ id: 1, body: "lost" });
        await tick();
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await bodies()).toEqual([]);
    expect(database.writer.$client.isTransaction).toBe(false);
  });

  it("rolls a failed nested call back to its savepoint and keeps the outer writes", async () => {
    await database.runInTransaction(async (tx) => {
      await tx.insert(notes).values({ id: 1, body: "outer" });
      await expect(
        database.runInTransaction(async (inner) => {
          await inner.insert(notes).values({ id: 2, body: "inner" });
          await tick();
          throw new Error("inner failed");
        }),
      ).rejects.toThrow("inner failed");
      await database.runInTransaction(async (inner) => {
        await inner.insert(notes).values({ id: 3, body: "kept" });
      });
    });
    expect(await bodies()).toEqual(["outer", "kept"]);
  });

  it("rolls nested writes back with the outer transaction", async () => {
    await expect(
      database.runInTransaction(async () => {
        await database.runInTransaction(async (inner) => {
          await inner.insert(notes).values({ id: 1, body: "nested" });
        });
        throw new Error("outer failed");
      }),
    ).rejects.toThrow("outer failed");
    expect(await bodies()).toEqual([]);
  });

  it("serializes concurrent transactions without interleaving their statements", async () => {
    const log: string[] = [];
    const work = (name: string) =>
      database.runInTransaction(async (tx) => {
        for (let step = 0; step < 3; step++) {
          log.push(`${name}${step}`);
          await tx.run(sql`INSERT INTO notes (body) VALUES (${`${name}${step}`})`);
          await tick();
        }
      });
    await Promise.all([work("a"), work("b"), work("c")]);
    expect(log).toEqual(["a0", "a1", "a2", "b0", "b1", "b2", "c0", "c1", "c2"]);
    expect(await bodies()).toEqual(log);
  });

  it("serializes a call from another async context instead of nesting it", async () => {
    const log: string[] = [];
    let unrelated: Promise<void> | undefined;
    await Promise.all([
      database.runInTransaction(async () => {
        log.push("outer start");
        await tick();
        await tick();
        log.push("outer end");
      }),
      (async () => {
        await tick();
        unrelated = database.runInTransaction(async () => {
          log.push("unrelated");
        });
        await unrelated;
      })(),
    ]);
    expect(log).toEqual(["outer start", "outer end", "unrelated"]);
  });
});

describe("connections", () => {
  it("refuses writes through the read-only reader", () => {
    expect(() => database.db.insert(notes).values({ id: 1, body: "stray" }).run()).toThrow(
      /readonly/,
    );
  });

  it("hides uncommitted writes from another connection and shows committed ones", async () => {
    const other = openSqlite(join(dir, "landed.db"), { readonly: true });
    const count = () => (other.prepare("SELECT count(*) AS n FROM notes").get() as { n: number }).n;
    try {
      await database.runInTransaction(async (tx) => {
        await tx.insert(notes).values({ id: 1, body: "pending" });
        expect(count()).toBe(0);
        expect(await bodies()).toEqual([]);
      });
      expect(count()).toBe(1);
      expect(await bodies()).toEqual(["pending"]);
    } finally {
      other.close();
    }
  });
});
