import { randomUUID } from "node:crypto";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import type { DatabaseConnection } from "@/infrastructure/database";
import { createProfile } from "@/modules/profile";
import {
  saveCompany,
  deleteCompany,
  storeLogo,
  readLogo,
  logoHref,
  getCompany,
} from "@/modules/companies";
import { saveJob, deleteJob } from "@/modules/jobs";
import { saveCompanyWithLogoUrl } from "@/app/companies/logo";
import { fetchImage } from "@/infrastructure/fetch/fetch-image";
import { openTestDatabase, truncateAll } from "../helpers/test-database";
vi.mock("@/infrastructure/fetch/fetch-image", () => ({ fetchImage: vi.fn() }));
let connection: DatabaseConnection;
let artifactDir: string;
let profileId: string;
let companyId: string;
const deps = () => ({ db: connection.db, artifactDir });
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72]);
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>');
const unwrap = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.value;
};
const exists = (key: string) =>
  access(path.join(artifactDir, key)).then(
    () => true,
    () => false,
  );
const input = () => ({ id: companyId, name: "Example Labs" });
beforeAll(async () => {
  connection = await openTestDatabase();
});
afterAll(async () => {
  await connection?.close();
});
beforeEach(async () => {
  await truncateAll(connection);
  artifactDir = await mkdtemp(path.join(tmpdir(), "landed-company-logo-"));
  profileId = unwrap(
    await createProfile(deps(), { id: randomUUID(), displayName: "Alex Example" }),
  ).id;
  companyId = randomUUID();
  vi.mocked(fetchImage).mockReset();
});
afterEach(async () => {
  await rm(artifactDir, { recursive: true, force: true });
});
it("stores, preserves, replaces, clears, and deletes company logo files with version checks", async () => {
  const first = unwrap(await storeLogo(artifactDir, profileId, companyId, png));
  expect(first.storageKey).toMatch(
    new RegExp(`^${profileId}/logos/${companyId}-[0-9a-f-]{36}-[0-9a-f]{8}\\.png$`),
  );
  expect(await exists(first.storageKey)).toBe(true);
  const company = unwrap(await saveCompany(deps(), profileId, input(), undefined, first));
  expect(logoHref(company)).toMatch(new RegExp(`^/companies/${companyId}/logo\\?k=`));
  expect((await readLogo(artifactDir, first))?.bytes).toEqual(Buffer.from(png));
  const second = unwrap(await storeLogo(artifactDir, profileId, companyId, svg, "logoUrl"));
  const replaced = unwrap(
    await saveCompany(
      deps(),
      profileId,
      { ...input(), expectedUpdatedAt: company.updatedAt.toISOString() },
      companyId,
      second,
    ),
  );
  expect(await exists(first.storageKey)).toBe(false);
  // Restoring the same bytes must not reuse a key a previous save may still be cleaning up.
  const restoredUpload = unwrap(await storeLogo(artifactDir, profileId, companyId, png));
  expect(restoredUpload.storageKey).not.toBe(first.storageKey);
  expect((await readLogo(artifactDir, restoredUpload))?.bytes).toEqual(Buffer.from(png));
  expect(await exists(second.storageKey)).toBe(true);
  const kept = unwrap(
    await saveCompany(
      deps(),
      profileId,
      { ...input(), name: "Renamed", expectedUpdatedAt: replaced.updatedAt.toISOString() },
      companyId,
    ),
  );
  expect(kept.logoStorageKey).toBe(second.storageKey);
  expect(
    await saveCompany(
      deps(),
      profileId,
      { ...input(), expectedUpdatedAt: company.updatedAt.toISOString() },
      companyId,
      null,
    ),
  ).toMatchObject({ ok: false, error: { kind: "stale" } });
  expect(await exists(second.storageKey)).toBe(true);
  const cleared = unwrap(
    await saveCompany(
      deps(),
      profileId,
      { ...input(), expectedUpdatedAt: kept.updatedAt.toISOString() },
      companyId,
      null,
    ),
  );
  expect(cleared.logoStorageKey).toBeNull();
  expect(cleared.logoContentType).toBeNull();
  expect(await exists(second.storageKey)).toBe(false);
  const third = unwrap(await storeLogo(artifactDir, profileId, companyId, png));
  const restored = unwrap(
    await saveCompany(
      deps(),
      profileId,
      { ...input(), expectedUpdatedAt: cleared.updatedAt.toISOString() },
      companyId,
      third,
    ),
  );
  unwrap(
    await deleteCompany(deps(), profileId, companyId, {
      expectedUpdatedAt: restored.updatedAt.toISOString(),
    }),
  );
  expect(await exists(third.storageKey)).toBe(false);
});
it("shared logo survives deletion of a linked job and refused company deletion", async () => {
  const logo = unwrap(await storeLogo(artifactDir, profileId, companyId, png));
  const company = unwrap(await saveCompany(deps(), profileId, input(), undefined, logo));
  const jobs = await Promise.all(
    ["Engineer", "Designer"].map((title) =>
      saveJob(deps(), profileId, {
        id: randomUUID(),
        title,
        companyName: "Example Labs",
        companyId,
        rawDescription: "Build helpful tools.",
      }).then(unwrap),
    ),
  );
  expect(
    await deleteCompany(deps(), profileId, companyId, {
      expectedUpdatedAt: company.updatedAt.toISOString(),
    }),
  ).toMatchObject({ ok: false, error: { kind: "conflict" } });
  expect(await exists(logo.storageKey)).toBe(true);
  unwrap(await deleteJob(deps(), profileId, jobs[0]!.id));
  expect(await exists(logo.storageKey)).toBe(true);
  expect((await getCompany(deps(), profileId, companyId))?.logoStorageKey).toBe(logo.storageKey);
});
it("accepts migrated legacy file keys and rejects invalid image bytes and database pairs", async () => {
  const legacyJobId = randomUUID();
  const legacy = unwrap(await storeLogo(artifactDir, profileId, legacyJobId, png));
  const company = unwrap(await saveCompany(deps(), profileId, input(), undefined, legacy));
  expect(logoHref(company)).toContain(`/companies/${companyId}/logo`);
  expect((await readLogo(artifactDir, legacy))?.contentType).toBe("image/png");
  expect((await storeLogo(artifactDir, profileId, companyId, new Uint8Array(1_048_577))).ok).toBe(
    false,
  );
  expect((await storeLogo(artifactDir, profileId, companyId, Buffer.from("not an image"))).ok).toBe(
    false,
  );
  await expect(
    connection.db.execute(
      sql`UPDATE companies SET logo_content_type = NULL WHERE id = ${companyId}`,
    ),
  ).rejects.toThrow();
  await expect(
    connection.db.execute(
      sql`UPDATE companies SET logo_content_type = 'image/gif' WHERE id = ${companyId}`,
    ),
  ).rejects.toThrow();
});
it("MCP logo composition uses guarded fetch, preserves omission, clears null, and skips stale or retried fetches", async () => {
  vi.mocked(fetchImage).mockResolvedValue({ ok: true, bytes: png, contentType: "image/png" });
  const c = unwrap(
    await saveCompanyWithLogoUrl(
      deps(),
      profileId,
      input(),
      undefined,
      "https://example.com/logo.png",
    ),
  );
  expect(c.logoContentType).toBe("image/png");
  expect(fetchImage).toHaveBeenCalledWith("https://example.com/logo.png", { maxBytes: 1_048_576 });
  unwrap(
    await saveCompanyWithLogoUrl(
      deps(),
      profileId,
      input(),
      undefined,
      "https://example.com/retry.png",
    ),
  );
  expect(fetchImage).toHaveBeenCalledTimes(1);
  const kept = unwrap(
    await saveCompanyWithLogoUrl(
      deps(),
      profileId,
      { ...input(), expectedUpdatedAt: c.updatedAt.toISOString() },
      companyId,
    ),
  );
  expect(kept.logoStorageKey).toBe(c.logoStorageKey);
  expect(
    (
      await saveCompanyWithLogoUrl(
        deps(),
        profileId,
        { ...input(), expectedUpdatedAt: c.updatedAt.toISOString() },
        companyId,
        "https://example.com/stale.png",
      )
    ).ok,
  ).toBe(false);
  expect(fetchImage).toHaveBeenCalledTimes(1);
  vi.mocked(fetchImage).mockResolvedValue({ ok: false, message: "Private networks are refused" });
  expect(
    await saveCompanyWithLogoUrl(
      deps(),
      profileId,
      { ...input(), expectedUpdatedAt: kept.updatedAt.toISOString() },
      companyId,
      "https://127.0.0.1/logo",
    ),
  ).toMatchObject({
    ok: false,
    error: { kind: "validation", fieldErrors: { logoUrl: ["Private networks are refused"] } },
  });
  const cleared = unwrap(
    await saveCompanyWithLogoUrl(
      deps(),
      profileId,
      { ...input(), expectedUpdatedAt: kept.updatedAt.toISOString() },
      companyId,
      null,
    ),
  );
  expect(cleared.logoStorageKey).toBeNull();
  expect(await exists(c.logoStorageKey!)).toBe(false);
});
