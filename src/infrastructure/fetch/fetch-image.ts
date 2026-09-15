/*
 * A guarded fetch for one user-supplied image address (ADR 007, docs/06). The address must be
 * https; its host is resolved and refused when any answer is a loopback, private, link-local or
 * unique-local address; redirects are followed by hand so every hop passes the same check; the
 * body is read as a stream and abandoned past the size cap; the answer must be an image.
 *
 * Node's fetch resolves the name again when it connects, so a host whose answer changes between
 * the check and the connection could still reach a private address. The window is small and the
 * only consumer is a logo the user chose; documented in ADR 007 rather than papered over.
 */
import { isIP } from "node:net";
import { lookup as dnsLookup } from "node:dns/promises";

export interface FetchImageOptions {
  maxBytes: number;
  timeoutMs?: number;
  maxRedirects?: number;
  /** Injected for tests; default to the real ones. */
  fetch?: typeof globalThis.fetch;
  resolve?: (host: string) => Promise<string[]>;
}

export type FetchImageResult =
  { ok: true; bytes: Uint8Array; contentType: string } | { ok: false; message: string };

export async function fetchImage(
  address: string,
  options: FetchImageOptions,
): Promise<FetchImageResult> {
  const doFetch = options.fetch ?? globalThis.fetch;
  const resolve = options.resolve ?? resolveAddresses;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxRedirects = options.maxRedirects ?? 3;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let current = address;
    for (let hop = 0; hop <= maxRedirects; hop += 1) {
      const url = parseHttps(current);
      if (!url) return { ok: false, message: "Enter an https address of an image" };
      if (!(await isPublicHost(url.hostname, resolve))) {
        return { ok: false, message: "That address points at a private network" };
      }
      const response = await doFetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: { accept: "image/*" },
      });
      if (isRedirect(response.status)) {
        const location = response.headers.get("location");
        await response.body?.cancel().catch(() => undefined);
        if (!location) return { ok: false, message: "That address redirects nowhere" };
        current = new URL(location, url).toString();
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        return { ok: false, message: `That address answered ${response.status}` };
      }
      const contentType = (response.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
      if (!contentType.startsWith("image/")) {
        await response.body?.cancel().catch(() => undefined);
        return { ok: false, message: "That address is not an image" };
      }
      const bytes = await readCapped(response, options.maxBytes);
      if (!bytes) return { ok: false, message: "That image is larger than 1 MB" };
      return { ok: true, bytes, contentType };
    }
    return { ok: false, message: "That address redirects too many times" };
  } catch (error) {
    if (controller.signal.aborted) return { ok: false, message: "That address took too long" };
    return { ok: false, message: `Could not fetch that address (${describe(error)})` };
  } finally {
    clearTimeout(timer);
  }
}

function parseHttps(address: string): URL | null {
  try {
    const url = new URL(address);
    return url.protocol === "https:" && url.hostname ? url : null;
  } catch {
    return null;
  }
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

async function resolveAddresses(host: string): Promise<string[]> {
  const answers = await dnsLookup(host, { all: true });
  return answers.map((a) => a.address);
}

async function isPublicHost(
  host: string,
  resolve: (host: string) => Promise<string[]>,
): Promise<boolean> {
  const literal = host.startsWith("[") ? host.slice(1, -1) : host;
  if (literal === "localhost" || literal.endsWith(".localhost")) return false;
  const addresses = isIP(literal) ? [literal] : await resolve(literal).catch(() => []);
  return addresses.length > 0 && addresses.every(isPublicAddress);
}

/** True for a globally routable address; every loopback, private, link-local or ULA range is false. */
export function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPublicV4(address.split(".").map(Number));
  if (version === 6) {
    const lower = address.toLowerCase();
    if (lower === "::1" || lower === "::") return false;
    if (
      lower.startsWith("fe8") ||
      lower.startsWith("fe9") ||
      lower.startsWith("fea") ||
      lower.startsWith("feb")
    )
      return false;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return false;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped?.[1]) return isPublicV4(mapped[1].split(".").map(Number));
    return true;
  }
  return false;
}

function isPublicV4(parts: number[]): boolean {
  const [a = 0, b = 0] = parts;
  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a >= 224) return false;
  return true;
}

async function readCapped(response: Response, maxBytes: number): Promise<Uint8Array | null> {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return null;
  if (!response.body) return new Uint8Array(await response.arrayBuffer());
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
