import type { LogoContentType } from "./contracts";
/** Findings are untrusted research, including when supplied by a user's assistant. */
export function findingKindLabel(kind: "statement" | "interpretation") {
  return kind === "statement" ? "Direct statement" : "Interpretation";
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

/** The address the interface loads a company's logo from, or null when the job has none. */
export function logoHref(company: { id: string; logoStorageKey: string | null }): string | null {
  if (!company.logoStorageKey) return null;
  const version = logoVersion(company.logoStorageKey);
  return version ? `/companies/${company.id}/logo?k=${version}` : null;
}
