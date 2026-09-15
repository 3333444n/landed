/*
 * Composition for a job's logo (docs/03): the form carries either a chosen file, a pasted image
 * address, or a request to remove the logo. The file wins over the address. A pasted address is
 * fetched once through the guarded fetcher and stored like an upload, so the interface never
 * hotlinks another site (ADR 007).
 */
import { fetchImage } from "@/infrastructure/fetch/fetch-image";
import { logoMaxBytes, storeLogo, type JobInput, type LogoChange } from "@/modules/jobs";
import type { Result } from "@/modules/shared/contracts";
import { validation } from "@/modules/shared/service";

export async function resolveLogo(
  formData: FormData,
  input: Pick<JobInput, "logoUrl" | "removeLogo">,
  profileId: string,
  jobId: string,
  artifactDir: string,
): Promise<Result<LogoChange>> {
  const file = formData.get("logoFile");
  if (file instanceof File && file.size > 0) {
    return storeLogo(artifactDir, profileId, jobId, new Uint8Array(await file.arrayBuffer()));
  }
  if (input.logoUrl) {
    const fetched = await fetchImage(input.logoUrl, { maxBytes: logoMaxBytes });
    if (!fetched.ok) return validation({ logoUrl: [fetched.message] });
    return storeLogo(artifactDir, profileId, jobId, fetched.bytes, "logoUrl");
  }
  if (input.removeLogo) return { ok: true, value: null };
  return { ok: true, value: undefined };
}
