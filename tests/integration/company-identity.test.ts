import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { DatabaseConnection } from "@/infrastructure/database";
import { createProfile } from "@/modules/profile";
import { saveCompany } from "@/modules/companies";
import { pursueJob } from "@/app/jobs/pursue-job";
import { getJob, listJobs } from "@/app/jobs/company-job";
import { prepareGeneration } from "@/app/jobs/generate-document";
import { openTestDatabase, truncateAll } from "../helpers/test-database";
let connection: DatabaseConnection;
const deps = () => ({ db: connection.db });
function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.value;
}
beforeAll(async () => {
  connection = await openTestDatabase();
});
afterAll(async () => {
  await connection.close();
});
beforeEach(async () => {
  await truncateAll(connection);
});
it("company renames flow to all linked jobs and new generation without changing an old snapshot", async () => {
  const profile = unwrap(await createProfile(deps(), { displayName: "Alex Example" }));
  const c = unwrap(
    await saveCompany(deps(), profile.id, { id: randomUUID(), name: "Original Company" }),
  );
  const a = unwrap(
    await pursueJob(deps(), profile.id, {
      title: "Developer",
      companyId: c.id,
      rawDescription: "Build tools.",
    }),
  );
  const b = unwrap(
    await pursueJob(deps(), profile.id, {
      title: "Designer",
      companyId: c.id,
      rawDescription: "Design tools.",
    }),
  );
  const old = unwrap(await prepareGeneration(deps(), profile.id, a.id, "resume")).snapshot;
  unwrap(
    await saveCompany(
      deps(),
      profile.id,
      { id: c.id, expectedUpdatedAt: c.updatedAt.toISOString(), name: "Renamed Company" },
      c.id,
    ),
  );
  expect((await getJob(deps(), profile.id, a.id))?.companyName).toBe("Renamed Company");
  expect((await getJob(deps(), profile.id, b.id))?.companyName).toBe("Renamed Company");
  expect(
    (await listJobs(deps(), profile.id)).every((j) => j.companyName === "Renamed Company"),
  ).toBe(true);
  expect(
    unwrap(await prepareGeneration(deps(), profile.id, a.id, "cover_letter")).snapshot.job
      .companyName,
  ).toBe("Renamed Company");
  expect(old.job.companyName).toBe("Original Company");
});
