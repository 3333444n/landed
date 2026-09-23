import { companyInput, findingInput, versionInput } from "./contracts";
import * as repo from "./repository";
import { fieldErrorsFromZod, type Result } from "@/modules/shared/contracts";
import {
  mapDatabaseError,
  notFound,
  now,
  stale,
  stamps,
  validation,
  type BaseDeps,
} from "@/modules/shared/service";
export const listCompanies = (deps: BaseDeps, profileId: string) =>
  repo.listCompanies(deps.db, profileId);
export const getCompany = (deps: BaseDeps, profileId: string, id: string) =>
  repo.findCompany(deps.db, profileId, id);
export const listCompanyFindings = (deps: BaseDeps, profileId: string, companyId: string) =>
  repo.listFindings(deps.db, profileId, companyId);
export const getCompanyFinding = (
  deps: BaseDeps,
  profileId: string,
  companyId: string,
  id: string,
) => repo.findFinding(deps.db, profileId, companyId, id);
export async function saveCompany(
  deps: BaseDeps,
  profileId: string,
  raw: unknown,
  existingId?: string,
): Promise<Result<repo.CompanyRecord>> {
  const parsed = companyInput.safeParse(raw);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  const input = parsed.data;
  const id = existingId ?? input.id;
  if (existingId && !input.expectedUpdatedAt)
    return validation({ expectedUpdatedAt: ["Reload before saving"] });
  const values = {
    name: input.name,
    location: input.location ?? null,
    website: input.website ?? null,
    about: input.about ?? null,
  };
  try {
    return await deps.db.transaction(async (tx) => {
      if (existingId) {
        if (!(await repo.findCompany(tx, profileId, id))) return notFound("Company");
        const record = await repo.updateCompany(
          tx,
          profileId,
          id,
          new Date(input.expectedUpdatedAt!),
          { ...values, updatedAt: now(deps) },
        );
        return record ? { ok: true as const, value: record } : stale();
      }
      return {
        ok: true as const,
        value: await repo.insertCompany(tx, { id, profileId, ...values, ...stamps(deps) }),
      };
    });
  } catch (e) {
    return mapDatabaseError(e, async () => {
      const record = await getCompany(deps, profileId, id);
      return record ? { ok: true as const, value: record } : null;
    });
  }
}
export async function deleteCompany(
  deps: BaseDeps,
  profileId: string,
  id: string,
  raw: unknown,
): Promise<Result<void>> {
  const parsed = versionInput.safeParse(raw);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  try {
    return await deps.db.transaction(async (tx) => {
      if (!(await repo.findCompany(tx, profileId, id))) return notFound("Company");
      return (await repo.deleteCompany(tx, profileId, id, new Date(parsed.data.expectedUpdatedAt)))
        ? { ok: true as const, value: undefined }
        : stale();
    });
  } catch (e) {
    return mapDatabaseError(e, async () => null);
  }
}
export async function saveCompanyFinding(
  deps: BaseDeps,
  profileId: string,
  companyId: string,
  raw: unknown,
  existingId?: string,
): Promise<Result<repo.CompanyFindingRecord>> {
  const parsed = findingInput.safeParse(raw);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  const input = parsed.data;
  const id = existingId ?? input.id;
  if (existingId && !input.expectedUpdatedAt)
    return validation({ expectedUpdatedAt: ["Reload before saving"] });
  const values = {
    text: input.text,
    sourceUrl: input.sourceUrl,
    retrievedAt: input.retrievedAt,
    kind: input.kind,
  };
  try {
    return await deps.db.transaction(async (tx) => {
      if (!(await repo.findCompany(tx, profileId, companyId))) return notFound("Company");
      if (existingId) {
        if (!(await repo.findFinding(tx, profileId, companyId, id))) return notFound("Finding");
        const record = await repo.updateFinding(
          tx,
          profileId,
          companyId,
          id,
          new Date(input.expectedUpdatedAt!),
          { ...values, updatedAt: now(deps) },
        );
        return record ? { ok: true as const, value: record } : stale();
      }
      return {
        ok: true as const,
        value: await repo.insertFinding(tx, {
          id,
          profileId,
          companyId,
          ...values,
          ...stamps(deps),
        }),
      };
    });
  } catch (e) {
    return mapDatabaseError(e, async () => {
      const record = await getCompanyFinding(deps, profileId, companyId, id);
      return record ? { ok: true as const, value: record } : null;
    });
  }
}
export async function deleteCompanyFinding(
  deps: BaseDeps,
  profileId: string,
  companyId: string,
  id: string,
  raw: unknown,
): Promise<Result<void>> {
  const parsed = versionInput.safeParse(raw);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  try {
    return await deps.db.transaction(async (tx) => {
      if (!(await repo.findFinding(tx, profileId, companyId, id))) return notFound("Finding");
      return (await repo.deleteFinding(
        tx,
        profileId,
        companyId,
        id,
        new Date(parsed.data.expectedUpdatedAt),
      ))
        ? { ok: true as const, value: undefined }
        : stale();
    });
  } catch (e) {
    return mapDatabaseError(e, async () => null);
  }
}
