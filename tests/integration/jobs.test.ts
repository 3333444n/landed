import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { DatabaseConnection } from "@/infrastructure/database";
import { listJobRows } from "@/app/jobs/list-jobs";
import { pursueJob } from "@/app/jobs/pursue-job";
import { getApplicationForJob, listApplications, updateApplication } from "@/modules/applications";
import { deleteJob, getJob, listJobs, saveJob, storeLogo } from "@/modules/jobs";
import { createProfile } from "@/modules/profile";
import { openTestDatabase, truncateAll } from "../helpers/test-database";

// Values from examples/demo-profile.json (fictional).
const demo = {
  profileId: "10000000-0000-4000-8000-000000000001",
  jobId: "70000000-0000-4000-8000-000000000001",
  title: "Full-stack developer",
  companyName: "Example Analytics",
  location: "Remote",
  rawDescription:
    "Example Analytics is looking for a full-stack developer to build internal reporting tools.\n\nYou will work with PostgreSQL and TypeScript.",
};

let connection: DatabaseConnection;
const deps = () => ({ db: connection.db });

beforeAll(async () => {
  connection = await openTestDatabase();
});
afterAll(async () => {
  await connection.close();
});
beforeEach(async () => {
  await truncateAll(connection);
  const profile = await createProfile(deps(), { id: demo.profileId, displayName: "Alex Rivera" });
  if (!profile.ok) throw new Error("profile seed failed");
});

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

describe("pursueJob", () => {
  it("creates the job and its preparing application together, and replays the same id", async () => {
    const job = unwrap(await pursueJob(deps(), demo.profileId, { id: demo.jobId, ...demo }));
    expect(job.id).toBe(demo.jobId);
    expect(job.source).toBe("pasted");
    expect(job.availability).toBe("active");

    const application = await getApplicationForJob(deps(), demo.profileId, job.id);
    expect(application?.status).toBe("preparing");
    expect(application?.submittedAt).toBeNull();

    const replay = unwrap(await pursueJob(deps(), demo.profileId, { id: demo.jobId, ...demo }));
    expect(replay.id).toBe(demo.jobId);
    expect(await listJobs(deps(), demo.profileId)).toHaveLength(1);
    expect(await listApplications(deps(), demo.profileId)).toHaveLength(1);
  });

  it("rejects a blank title or description before writing anything", async () => {
    const result = await pursueJob(deps(), demo.profileId, {
      title: " ",
      companyName: demo.companyName,
      rawDescription: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === "validation") {
      expect(result.error.fieldErrors.title).toEqual(["Enter the job title"]);
      expect(result.error.fieldErrors.rawDescription).toEqual(["Paste the job description"]);
    }
    expect(await listJobs(deps(), demo.profileId)).toHaveLength(0);
    expect(await listApplications(deps(), demo.profileId)).toHaveLength(0);
  });

  it("rejects a posting address that is not a web address", async () => {
    const result = await pursueJob(deps(), demo.profileId, { ...demo, sourceUrl: "ftp://x" });
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === "validation") {
      expect(result.error.fieldErrors.sourceUrl).toBeDefined();
    }
  });
});

describe("jobs", () => {
  it("edits in place with a stale check and marks availability without touching the application", async () => {
    const job = unwrap(await pursueJob(deps(), demo.profileId, { id: demo.jobId, ...demo }));

    const stale = await saveJob(
      deps(),
      demo.profileId,
      {
        ...demo,
        title: "Senior developer",
        expectedUpdatedAt: new Date(job.updatedAt.getTime() - 1000).toISOString(),
      },
      job.id,
    );
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error.kind).toBe("stale");

    const updated = unwrap(
      await saveJob(
        deps(),
        demo.profileId,
        {
          ...demo,
          availability: "expired",
          expectedUpdatedAt: job.updatedAt.toISOString(),
        },
        job.id,
      ),
    );
    expect(updated.availability).toBe("expired");
    expect((await getApplicationForJob(deps(), demo.profileId, job.id))?.status).toBe("preparing");
  });

  it("keeps the salary as typed and writes null when it is blank", async () => {
    const job = unwrap(
      await pursueJob(deps(), demo.profileId, {
        id: demo.jobId,
        ...demo,
        salary: " $90k to $110k a year ",
      }),
    );
    expect(job.salary).toBe("$90k to $110k a year");
    expect((await getJob(deps(), demo.profileId, job.id))?.salary).toBe("$90k to $110k a year");

    const cleared = unwrap(
      await saveJob(
        deps(),
        demo.profileId,
        { ...demo, salary: "", expectedUpdatedAt: job.updatedAt.toISOString() },
        job.id,
      ),
    );
    expect(cleared.salary).toBeNull();
  });

  it("deleting a job removes its application", async () => {
    const job = unwrap(await pursueJob(deps(), demo.profileId, { id: demo.jobId, ...demo }));
    unwrap(await deleteJob(deps(), demo.profileId, job.id));
    expect(await getJob(deps(), demo.profileId, job.id)).toBeNull();
    expect(await listApplications(deps(), demo.profileId)).toHaveLength(0);
  });
});

describe("applications", () => {
  it("records the submission time on the first entry to applied and keeps it", async () => {
    const job = unwrap(await pursueJob(deps(), demo.profileId, { id: demo.jobId, ...demo }));
    const application = (await getApplicationForJob(deps(), demo.profileId, job.id))!;

    const ready = unwrap(
      await updateApplication(deps(), demo.profileId, application.id, {
        status: "ready",
        notes: "Recruiter: Sam",
        expectedUpdatedAt: application.updatedAt.toISOString(),
      }),
    );
    expect(ready.submittedAt).toBeNull();
    expect(ready.notes).toBe("Recruiter: Sam");

    const applied = unwrap(
      await updateApplication(deps(), demo.profileId, application.id, {
        status: "applied",
        expectedUpdatedAt: ready.updatedAt.toISOString(),
      }),
    );
    expect(applied.submittedAt).not.toBeNull();

    const interviewing = unwrap(
      await updateApplication(deps(), demo.profileId, application.id, {
        status: "interviewing",
        expectedUpdatedAt: applied.updatedAt.toISOString(),
      }),
    );
    expect(interviewing.submittedAt?.getTime()).toBe(applied.submittedAt?.getTime());

    const stale = await updateApplication(deps(), demo.profileId, application.id, {
      status: "offer",
      expectedUpdatedAt: applied.updatedAt.toISOString(),
    });
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error.kind).toBe("stale");
  });

  it("rejects an unknown status", async () => {
    const job = unwrap(await pursueJob(deps(), demo.profileId, { id: demo.jobId, ...demo }));
    const application = (await getApplicationForJob(deps(), demo.profileId, job.id))!;
    const result = await updateApplication(deps(), demo.profileId, application.id, {
      status: "ghosted",
    });
    expect(result).toEqual({
      ok: false,
      error: { kind: "validation", fieldErrors: { status: ["Choose a status"] } },
    });
  });
});

describe("logo", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72]);
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>');
  let artifactDir: string;
  beforeEach(async () => {
    artifactDir = await mkdtemp(path.join(tmpdir(), "landed-logo-"));
  });
  afterAll(async () => {
    await rm(artifactDir, { recursive: true, force: true });
  });
  const exists = (key: string) =>
    access(path.join(artifactDir, key)).then(
      () => true,
      () => false,
    );
  const logoDeps = () => ({ ...deps(), artifactDir });

  it("stores the file before the row, replaces and removes it, and deletes it with the job", async () => {
    const first = unwrap(await storeLogo(artifactDir, demo.profileId, demo.jobId, png));
    expect(first.contentType).toBe("image/png");
    expect(first.storageKey).toMatch(
      new RegExp(`^${demo.profileId}/logos/${demo.jobId}-[0-9a-f]{8}\\.png$`),
    );
    expect(await exists(first.storageKey)).toBe(true);

    const job = unwrap(
      await pursueJob(logoDeps(), demo.profileId, { id: demo.jobId, ...demo }, first),
    );
    expect(job.logoStorageKey).toBe(first.storageKey);
    expect(job.logoContentType).toBe("image/png");

    const second = unwrap(await storeLogo(artifactDir, demo.profileId, demo.jobId, svg, "logoUrl"));
    expect(second.contentType).toBe("image/svg+xml");
    const replaced = unwrap(
      await saveJob(
        logoDeps(),
        demo.profileId,
        { ...demo, expectedUpdatedAt: job.updatedAt.toISOString() },
        job.id,
        second,
      ),
    );
    expect(replaced.logoStorageKey).toBe(second.storageKey);
    expect(await exists(first.storageKey)).toBe(false);
    expect(await exists(second.storageKey)).toBe(true);

    const kept = unwrap(
      await saveJob(
        logoDeps(),
        demo.profileId,
        { ...demo, title: "Renamed", expectedUpdatedAt: replaced.updatedAt.toISOString() },
        job.id,
      ),
    );
    expect(kept.logoStorageKey).toBe(second.storageKey);

    const cleared = unwrap(
      await saveJob(
        logoDeps(),
        demo.profileId,
        { ...demo, expectedUpdatedAt: kept.updatedAt.toISOString() },
        job.id,
        null,
      ),
    );
    expect(cleared.logoStorageKey).toBeNull();
    expect(cleared.logoContentType).toBeNull();
    expect(await exists(second.storageKey)).toBe(false);

    const third = unwrap(await storeLogo(artifactDir, demo.profileId, demo.jobId, png));
    unwrap(
      await saveJob(
        logoDeps(),
        demo.profileId,
        { ...demo, expectedUpdatedAt: cleared.updatedAt.toISOString() },
        job.id,
        third,
      ),
    );
    unwrap(await deleteJob(logoDeps(), demo.profileId, job.id));
    expect(await exists(third.storageKey)).toBe(false);
  });

  it("refuses an oversized file and bytes that are not an image, writing nothing", async () => {
    const big = await storeLogo(artifactDir, demo.profileId, demo.jobId, new Uint8Array(1_048_577));
    expect(!big.ok && big.error.kind === "validation" && big.error.fieldErrors.logoFile).toEqual([
      "Choose an image under 1 MB",
    ]);
    const text = await storeLogo(
      artifactDir,
      demo.profileId,
      demo.jobId,
      Buffer.from("hello there, not an image"),
      "logoUrl",
    );
    expect(!text.ok && text.error.kind === "validation" && text.error.fieldErrors.logoUrl).toEqual([
      "Choose a PNG, JPEG, WebP or SVG image",
    ]);
    expect(await exists(path.join(demo.profileId, "logos"))).toBe(false);
  });

  it("the database refuses a key without a type and a type outside the list", async () => {
    unwrap(await pursueJob(deps(), demo.profileId, { id: demo.jobId, ...demo }));
    await expect(
      connection.db.execute(sql`UPDATE jobs SET logo_storage_key = 'x' WHERE id = ${demo.jobId}`),
    ).rejects.toThrow();
    await expect(
      connection.db.execute(
        sql`UPDATE jobs SET logo_storage_key = 'x', logo_content_type = 'image/gif' WHERE id = ${demo.jobId}`,
      ),
    ).rejects.toThrow();
  });
});

describe("listJobRows", () => {
  it("derives the chip from the stored facts", async () => {
    const job = unwrap(await pursueJob(deps(), demo.profileId, { id: demo.jobId, ...demo }));
    let rows = await listJobRows(deps(), demo.profileId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.derived).toEqual({ chip: { label: "Preparing", tone: "neutral" } });
    expect(rows[0]?.summary).toBe(
      "Example Analytics is looking for a full-stack developer to build internal reporting tools.",
    );

    const application = (await getApplicationForJob(deps(), demo.profileId, job.id))!;
    unwrap(
      await updateApplication(deps(), demo.profileId, application.id, { status: "interviewing" }),
    );
    unwrap(await saveJob(deps(), demo.profileId, { ...demo, availability: "expired" }, job.id));
    rows = await listJobRows(deps(), demo.profileId);
    expect(rows[0]?.derived).toEqual({
      chip: { label: "Interviewing", tone: "success" },
      modifier: { label: "Posting expired", tone: "warning" },
    });
  });
});
