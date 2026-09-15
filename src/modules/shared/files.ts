/*
 * File helpers for module-owned artifacts (docs/04): a file is written under a temporary name
 * and renamed into place, so a reader never sees a partial file, and its checksum names it.
 */
import { createHash } from "node:crypto";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Writes `bytes` to `target` atomically, creating the directory first. */
export async function writeFileAtomically(target: string, bytes: Uint8Array): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, target);
}

/** Removes a file that no row references any more; a missing file is not an error. */
export async function removeFileQuietly(target: string): Promise<void> {
  try {
    await unlink(target);
  } catch {
    // Already gone, or unreadable: the row is the source of truth and it no longer points here.
  }
}
