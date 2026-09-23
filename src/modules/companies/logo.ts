/*
 * Company logos (docs/04): one image file per company under the artifact directory, written before
 * the row that references it. The key carries a content hash, so a replaced logo gets a new
 * address and the old one can be cached forever. Reading and removing go through here too.
 */
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Result } from "@/modules/shared/contracts";
import { removeFileQuietly, sha256, writeFileAtomically } from "@/modules/shared/files";
import { validation } from "@/modules/shared/service";
import { logoExtensions, logoMaxBytes, type LogoContentType, type StoredLogo } from "./contracts";
import { detectImageType } from "./rules";

export const logoFieldErrors = {
  tooLarge: "Choose an image under 1 MB",
  notAnImage: "Choose a PNG, JPEG, WebP or SVG image",
} as const;

/**
 * Checks and stores an image for a company. `field` names the form field a refusal is reported on
 * (the file input or the address). The file is written to `<profile>/logos/<company>-<upload-id>-<hash>.<ext>`.
 */
export async function storeLogo(
  artifactDir: string,
  profileId: string,
  companyId: string,
  bytes: Uint8Array,
  field: "logoFile" | "logoUrl" = "logoFile",
): Promise<Result<StoredLogo>> {
  if (bytes.byteLength > logoMaxBytes) return validation({ [field]: [logoFieldErrors.tooLarge] });
  const contentType = detectImageType(bytes);
  if (!contentType) return validation({ [field]: [logoFieldErrors.notAnImage] });
  const storageKey = path.join(
    profileId,
    "logos",
    `${companyId}-${randomUUID()}-${sha256(bytes).slice(0, 8)}.${logoExtensions[contentType]}`,
  );
  await writeFileAtomically(path.join(artifactDir, storageKey), bytes);
  return { ok: true, value: { storageKey, contentType } };
}

/** The stored bytes of a company's logo, or null when the file is missing. */
export async function readLogo(
  artifactDir: string,
  logo: StoredLogo,
): Promise<{ bytes: Buffer; contentType: LogoContentType } | null> {
  try {
    const bytes = await readFile(path.join(artifactDir, logo.storageKey));
    return { bytes, contentType: logo.contentType };
  } catch {
    return null;
  }
}

/** Best-effort removal of a logo file no row references any more (docs/04). */
export async function removeLogoFile(artifactDir: string, storageKey: string): Promise<void> {
  await removeFileQuietly(path.join(artifactDir, storageKey));
}
