/*
 * Pure rules for postings. No database, no framework.
 */
import type { LogoContentType } from "./contracts";

/** The first non-empty line of a pasted description, trimmed to fit a card's metadata line. */
export function jobSummary(rawDescription: string, max = 140): string {
  const line = rawDescription
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) return "";
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

/**
 * The type of an uploaded or fetched image from its bytes (docs/04): PNG, JPEG and WebP by their
 * magic numbers, SVG by its root element. Anything else is refused, whatever its name says.
 */
export function detectImageType(bytes: Uint8Array): LogoContentType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.subarray(0, 1024))
    .replace(/^\uFEFF/, "")
    .trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(head)) {
    return "image/svg+xml";
  }
  return null;
}

function ascii(bytes: Uint8Array, from: number, to: number): string {
  return String.fromCharCode(...bytes.subarray(from, to));
}

/** The short content hash inside a logo's storage key, used as the address's cache breaker. */
export function logoVersion(storageKey: string): string | null {
  const match = /-([0-9a-f]{8})\.[a-z]+$/.exec(storageKey);
  return match?.[1] ?? null;
}

/** The address the interface loads a job's logo from, or null when the job has none. */
export function logoHref(job: { id: string; logoStorageKey: string | null }): string | null {
  if (!job.logoStorageKey) return null;
  const version = logoVersion(job.logoStorageKey);
  return version ? `/jobs/${job.id}/logo?k=${version}` : null;
}
