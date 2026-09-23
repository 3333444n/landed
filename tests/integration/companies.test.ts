import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { DatabaseConnection } from "@/infrastructure/database";
import { createProfile } from "@/modules/profile";
import {
  saveCompany,
  getCompany,
  deleteCompany,
  saveCompanyFinding,
  listCompanyFindings,
} from "@/modules/companies";
import {
  getJob,
  saveJob,
  updateJobCompany,
  setJobFindingSelection,
  getSelectedFindingIds,
} from "@/modules/jobs";
import { removeCompanyFinding, getSelectedJobFindings } from "@/app/jobs/company-context";
import { openTestDatabase, truncateAll } from "../helpers/test-database";
let connection: DatabaseConnection;
const deps = () => ({ db: connection.db });
let profileId: string;
const unwrap = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.value;
};
beforeAll(async () => {
  connection = await openTestDatabase();
});
afterAll(async () => {
  await connection.close();
});
beforeEach(async () => {
  await truncateAll(connection);
  profileId = unwrap(
    await createProfile(deps(), { id: randomUUID(), displayName: "Alex Example" }),
  ).id;
});
const company = () =>
  saveCompany(deps(), profileId, {
    id: randomUUID(),
    name: "Example Labs",
    location: "Remote",
    website: "https://example.com",
    about: "Builds public tools.",
  });
const job = (companyId: string | null) =>
  saveJob(deps(), profileId, {
    id: randomUUID(),
    companyId,
    title: "Developer",
    companyName: "Original posting employer",
    rawDescription: "Build helpful tools.",
  });
const finding = (companyId: string) =>
  saveCompanyFinding(deps(), profileId, companyId, {
    id: randomUUID(),
    text: "Released a tool in 2026",
    sourceUrl: "https://example.com/news",
    retrievedAt: "2026-09-23",
    kind: "statement",
  });
it("replays creates, rejects stale edits, and clears optional company fields", async () => {
  const c = unwrap(await company());
  const replay = unwrap(await saveCompany(deps(), profileId, { id: c.id, name: "Retry" }));
  expect(replay.name).toBe(c.name);
  const changed = unwrap(
    await saveCompany(
      { ...deps(), now: () => new Date(c.updatedAt.getTime() + 1000) },
      profileId,
      { id: c.id, name: c.name, expectedUpdatedAt: c.updatedAt.toISOString() },
      c.id,
    ),
  );
  expect(changed.about).toBeNull();
  const stale = await saveCompany(
    deps(),
    profileId,
    { id: c.id, name: "Stale", expectedUpdatedAt: c.updatedAt.toISOString() },
    c.id,
  );
  expect(stale).toMatchObject({ ok: false, error: { kind: "stale" } });
  expect(await getCompany(deps(), profileId, c.id)).toMatchObject({ name: c.name });
});
it("keeps legacy posting text and clears selections when changing the linked company", async () => {
  const c = unwrap(await company());
  const f = unwrap(await finding(c.id));
  const j = unwrap(await job(c.id));
  const selected = unwrap(
    await setJobFindingSelection(deps(), profileId, j.id, {
      findingIds: [f.id],
      expectedUpdatedAt: j.updatedAt.toISOString(),
    }),
  );
  expect(await getSelectedJobFindings(deps(), profileId, j.id)).toHaveLength(1);
  const linked = unwrap(
    await updateJobCompany(deps(), profileId, j.id, {
      companyId: null,
      expectedUpdatedAt: selected.updatedAt.toISOString(),
    }),
  );
  expect(linked.companyName).toBe(j.companyName);
  expect(await getSelectedFindingIds(deps(), profileId, j.id)).toEqual([]);
  expect(unwrap(await job(null)).companyId).toBeNull();
});
it("refuses linked company deletion and cross-company or cross-owner selections", async () => {
  const c = unwrap(await company());
  const other = unwrap(await company());
  const f = unwrap(await finding(other.id));
  const j = unwrap(await job(c.id));
  expect(
    await deleteCompany(deps(), profileId, c.id, { expectedUpdatedAt: c.updatedAt.toISOString() }),
  ).toMatchObject({ ok: false, error: { kind: "conflict" } });
  expect(
    (
      await setJobFindingSelection(deps(), profileId, j.id, {
        findingIds: [f.id],
        expectedUpdatedAt: j.updatedAt.toISOString(),
      })
    ).ok,
  ).toBe(false);
  expect(await getSelectedFindingIds(deps(), profileId, j.id)).toEqual([]);
  expect(await getCompany(deps(), randomUUID(), c.id)).toBeNull();
  const foreign = await saveJob(deps(), randomUUID(), {
    title: "No",
    companyName: "No",
    rawDescription: "No",
    companyId: c.id,
  });
  expect(foreign.ok).toBe(false);
});
it("removes a finding's live selections and invalidates open selection forms", async () => {
  const c = unwrap(await company());
  const f = unwrap(await finding(c.id));
  const j = unwrap(await job(c.id));
  const selected = unwrap(
    await setJobFindingSelection(deps(), profileId, j.id, {
      findingIds: [f.id],
      expectedUpdatedAt: j.updatedAt.toISOString(),
    }),
  );
  unwrap(
    await removeCompanyFinding(
      { ...deps(), now: () => new Date(selected.updatedAt.getTime() + 1000) },
      profileId,
      c.id,
      f.id,
      { expectedUpdatedAt: f.updatedAt.toISOString() },
    ),
  );
  expect(await listCompanyFindings(deps(), profileId, c.id)).toEqual([]);
  expect(await getSelectedFindingIds(deps(), profileId, j.id)).toEqual([]);
  expect((await getJob(deps(), profileId, j.id))?.updatedAt.toISOString()).not.toBe(
    selected.updatedAt.toISOString(),
  );
  expect(
    await setJobFindingSelection(deps(), profileId, j.id, {
      findingIds: [],
      expectedUpdatedAt: selected.updatedAt.toISOString(),
    }),
  ).toMatchObject({ ok: false, error: { kind: "stale" } });
});
it("caps selection at five and keeps prior selections on validation failure", async () => {
  const c = unwrap(await company());
  const j = unwrap(await job(c.id));
  const fs = await Promise.all(Array.from({ length: 6 }, () => finding(c.id).then(unwrap)));
  expect(
    (
      await setJobFindingSelection(deps(), profileId, j.id, {
        findingIds: fs.map((f) => f.id),
        expectedUpdatedAt: j.updatedAt.toISOString(),
      })
    ).ok,
  ).toBe(false);
  expect(await getSelectedFindingIds(deps(), profileId, j.id)).toEqual([]);
});
