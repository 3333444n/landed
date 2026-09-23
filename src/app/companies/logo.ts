/*
 * Composition for a company's logo (docs/03): the form carries either a chosen file, a pasted image
 * address, or a request to remove the logo. The file wins over the address. A pasted address is
 * fetched once through the guarded fetcher and stored like an upload, so the interface never
 * hotlinks another site (ADR 007).
 */
import { fetchImage } from "@/infrastructure/fetch/fetch-image";
import {
  companyInput,
  getCompany,
  saveCompany,
  type CompaniesDeps,
  logoMaxBytes,
  logoFieldErrors,
  storeLogo,
  type CompanyInput,
  type LogoChange,
} from "@/modules/companies";
import { fieldErrorsFromZod, type Result } from "@/modules/shared/contracts";
import { validation, notFound, stale } from "@/modules/shared/service";

export async function resolveLogo(
  formData: FormData,
  input: Pick<CompanyInput, "logoUrl" | "removeLogo">,
  profileId: string,
  companyId: string,
  artifactDir: string,
): Promise<Result<LogoChange>> {
  const file = formData.get("logoFile");
  if (file instanceof File && file.size > 0) {
    if (file.size > logoMaxBytes) return validation({ logoFile: [logoFieldErrors.tooLarge] });
    return storeLogo(artifactDir, profileId, companyId, new Uint8Array(await file.arrayBuffer()));
  }
  if (input.logoUrl) {
    const fetched = await fetchImage(input.logoUrl, { maxBytes: logoMaxBytes });
    if (!fetched.ok) return validation({ logoUrl: [fetched.message] });
    return storeLogo(artifactDir, profileId, companyId, fetched.bytes, "logoUrl");
  }
  if (input.removeLogo) return { ok: true, value: null };
  return { ok: true, value: undefined };
}

/** MCP image addresses use the same bounded, guarded fetch and byte inspection as uploads. */
export async function saveCompanyWithLogoUrl(
  deps: CompaniesDeps & { artifactDir: string },
  profileId: string,
  raw: unknown,
  existingId?: string,
  logoUrl?: string | null,
) {
  const parsed = companyInput.safeParse({
    ...(raw && typeof raw === "object" ? raw : {}),
    logoUrl: logoUrl ?? undefined,
  });
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  const current = await getCompany(deps, profileId, existingId ?? parsed.data.id);
  if (!existingId && current) return { ok: true as const, value: current };
  if (existingId) {
    if (!current) return notFound("Company");
    if (current.updatedAt.toISOString() !== parsed.data.expectedUpdatedAt) return stale();
  }
  const resolved = await resolveLogo(
    new FormData(),
    { logoUrl: parsed.data.logoUrl, removeLogo: logoUrl === null },
    profileId,
    existingId ?? parsed.data.id,
    deps.artifactDir,
  );
  if (!resolved.ok) return resolved;
  return saveCompany(deps, profileId, parsed.data, existingId, resolved.value);
}
