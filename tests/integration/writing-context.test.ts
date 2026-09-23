import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { DatabaseConnection } from "@/infrastructure/database";
import { createProfile, patchProfile, updateProfile } from "@/modules/profile";
import { getApplicationForJob, updateApplication, updateInterest } from "@/modules/applications";
import { pursueJob } from "@/app/jobs/pursue-job";
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
it("About me updates preserve general info and stale writes fail", async () => {
  const profile = unwrap(await createProfile(deps(), { displayName: "Alex Rivera" }));
  const saved = unwrap(
    await patchProfile(deps(), profile.id, {
      expectedUpdatedAt: profile.updatedAt.toISOString(),
      aboutMe: "I enjoy making complicated processes understandable.",
    }),
  );
  expect(saved.displayName).toBe(profile.displayName);
  expect(
    (
      await patchProfile(deps(), profile.id, {
        expectedUpdatedAt: profile.updatedAt.toISOString(),
        aboutMe: null,
      })
    ).ok,
  ).toBe(false);
  const general = unwrap(
    await updateProfile(deps(), profile.id, {
      expectedUpdatedAt: saved.updatedAt.toISOString(),
      displayName: "Alex Rivera",
      headline: "Developer",
    }),
  );
  expect(general.aboutMe).toBe(saved.aboutMe);
  const cleared = unwrap(
    await patchProfile(deps(), profile.id, {
      expectedUpdatedAt: general.updatedAt.toISOString(),
      aboutMe: null,
    }),
  );
  expect(cleared.aboutMe).toBeNull();
  expect(cleared.headline).toBe("Developer");
});
it("Interest changes preserve status and notes, and reject stale or foreign writes", async () => {
  const profile = unwrap(await createProfile(deps(), { displayName: "Alex Rivera" }));
  const job = unwrap(
    await pursueJob(deps(), profile.id, {
      title: "Developer",
      companyName: "Example Studio",
      rawDescription: "Build useful tools.",
    }),
  );
  const application = (await getApplicationForJob(deps(), profile.id, job.id))!;
  const status = unwrap(
    await updateApplication(deps(), profile.id, application.id, {
      expectedUpdatedAt: application.updatedAt.toISOString(),
      status: "ready",
      notes: "Review tomorrow",
    }),
  );
  const saved = unwrap(
    await updateInterest(deps(), profile.id, application.id, {
      expectedUpdatedAt: status.updatedAt.toISOString(),
      interest: "Their reporting workflow connects with work I have done.",
    }),
  );
  expect(saved.status).toBe("ready");
  expect(saved.notes).toBe("Review tomorrow");
  expect(
    (
      await updateInterest(deps(), profile.id, application.id, {
        expectedUpdatedAt: status.updatedAt.toISOString(),
        interest: null,
      })
    ).ok,
  ).toBe(false);
  expect(
    (
      await updateInterest(deps(), "10000000-0000-4000-8000-000000000099", application.id, {
        expectedUpdatedAt: saved.updatedAt.toISOString(),
        interest: null,
      })
    ).ok,
  ).toBe(false);
  expect(
    unwrap(
      await updateInterest(deps(), profile.id, application.id, {
        expectedUpdatedAt: saved.updatedAt.toISOString(),
        interest: "  ",
      }),
    ).interest,
  ).toBeNull();
});
