import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-sqlite";
import { openSqlite } from "@/infrastructure/sqlite";
import { mapDatabaseError, sqliteError } from "./service";

// Real constraint violations against an in-memory database, through Drizzle as services will
// run them after the move to SQLite. Drizzle wraps errors from raw `sql` statements in a
// DrizzleError whose `cause` is the SQLite error, so both shapes are exercised.
let db: ReturnType<typeof drizzle>;

beforeEach(() => {
  db = drizzle({ client: openSqlite(":memory:") });
  db.$client.exec(`
    CREATE TABLE profiles (id TEXT PRIMARY KEY);
    CREATE TABLE jobs (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      title TEXT NOT NULL CONSTRAINT jobs_title_not_blank CHECK (trim(title) <> ''),
      UNIQUE (profile_id, id)
    );
    CREATE TABLE skills (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      name TEXT NOT NULL,
      UNIQUE (profile_id, name)
    );
    INSERT INTO profiles VALUES ('p1');
    INSERT INTO jobs VALUES ('j1', 'p1', 'Engineer');
    INSERT INTO skills VALUES ('s1', 'p1', 'SQL');
  `);
});

afterEach(() => db.$client.close());

async function violation(statement: ReturnType<typeof sql>): Promise<unknown> {
  try {
    await db.run(statement);
  } catch (error) {
    return error;
  }
  throw new Error("expected a constraint violation");
}

const noReplay = async () => null;

describe("mapDatabaseError", () => {
  it("answers a duplicate primary key (1555) with the replay", async () => {
    const error = await violation(sql`INSERT INTO skills VALUES ('s1', 'p1', 'Go')`);
    expect(sqliteError(error)?.errcode).toBe(1555);
    const replay = { ok: true as const, value: "existing" };
    expect(await mapDatabaseError(error, async () => replay)).toBe(replay);
  });

  it("reports a conflict when a duplicate id is not a replay", async () => {
    const error = await violation(sql`INSERT INTO skills VALUES ('s1', 'p1', 'Go')`);
    expect(await mapDatabaseError(error, noReplay)).toEqual({
      ok: false,
      error: { kind: "conflict", message: "This record id is already used by another record" },
    });
  });

  it("takes the replay path for a composite unique conflict that names the id (2067)", async () => {
    const error = await violation(sql`INSERT INTO jobs VALUES ('j1', 'p1', 'Designer')`);
    expect(sqliteError(error)?.errcode).toBe(2067);
    expect(sqliteError(error)?.message).toContain("jobs.profile_id, jobs.id");
    const replay = { ok: true as const, value: "existing job" };
    expect(await mapDatabaseError(error, async () => replay)).toBe(replay);
  });

  it("maps another unique conflict (2067) to a conflict or the given field errors", async () => {
    const error = await violation(sql`INSERT INTO skills VALUES ('s2', 'p1', 'SQL')`);
    expect(sqliteError(error)?.errcode).toBe(2067);
    expect(await mapDatabaseError(error, noReplay)).toEqual({
      ok: false,
      error: { kind: "conflict", message: "A record with the same value already exists" },
    });
    const fieldErrors = { name: ["This skill already exists"] };
    expect(await mapDatabaseError(error, noReplay, fieldErrors)).toEqual({
      ok: false,
      error: { kind: "validation", fieldErrors },
    });
    const seen: (string | undefined)[] = [];
    await mapDatabaseError(error, noReplay, (columns) => {
      seen.push(columns);
      return fieldErrors;
    });
    expect(seen).toEqual(["skills.profile_id, skills.name"]);
  });

  it("maps a foreign-key violation (787) to a conflict", async () => {
    const error = await violation(sql`INSERT INTO jobs VALUES ('j2', 'missing', 'Engineer')`);
    expect(sqliteError(error)?.errcode).toBe(787);
    expect(await mapDatabaseError(error, noReplay)).toEqual({
      ok: false,
      error: {
        kind: "conflict",
        message: "Other records still reference this one; detach them first",
      },
    });
    const deleting = await violation(sql`DELETE FROM profiles WHERE id = 'p1'`);
    expect(sqliteError(deleting)?.errcode).toBe(787);
    expect(await mapDatabaseError(deleting, noReplay)).toMatchObject({
      ok: false,
      error: { kind: "conflict" },
    });
  });

  it("maps a check violation (275) to a form validation error", async () => {
    const error = await violation(sql`INSERT INTO jobs VALUES ('j2', 'p1', '  ')`);
    expect(sqliteError(error)?.errcode).toBe(275);
    expect(await mapDatabaseError(error, noReplay)).toEqual({
      ok: false,
      error: {
        kind: "validation",
        fieldErrors: { form: ["The record violates a data rule and was not saved"] },
      },
    });
  });

  it("rethrows a NOT NULL violation (1299), as the PostgreSQL mapping does", async () => {
    const error = await violation(sql`INSERT INTO jobs VALUES ('j2', 'p1', NULL)`);
    expect(sqliteError(error)?.errcode).toBe(1299);
    await expect(mapDatabaseError(error, noReplay)).rejects.toBe(error);
  });

  it("reads the SQLite error whether or not Drizzle wraps it", async () => {
    const wrapped = await violation(sql`INSERT INTO skills VALUES ('s1', 'p1', 'Go')`);
    expect(wrapped).not.toHaveProperty("errcode");
    const bare = (() => {
      try {
        db.$client.exec("INSERT INTO skills VALUES ('s1', 'p1', 'Go')");
      } catch (error) {
        return error;
      }
    })();
    expect(bare).toMatchObject({ code: "ERR_SQLITE_ERROR", errcode: 1555 });
    expect(sqliteError(bare)).toBe(bare);
    expect(await mapDatabaseError(bare, noReplay)).toMatchObject({ error: { kind: "conflict" } });
  });

  it("rethrows anything that is not a SQLite error", async () => {
    const error = new Error("network down");
    await expect(mapDatabaseError(error, noReplay)).rejects.toBe(error);
  });
});
