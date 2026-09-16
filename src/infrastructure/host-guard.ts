/*
 * Host and Origin validation for the whole app (docs/03). Landed listens on the user's computer,
 * so a page on any website could make the browser resolve an attacker's hostname to 127.0.0.1
 * (DNS rebinding) and read whatever the app shows, including the assistant token on the Settings
 * column. Answering only requests whose Host names this computer closes that door; the MCP
 * transport specification requires the same check on Origin. Pure and dependency-free, because
 * the proxy that calls it must not rely on shared modules.
 */

const loopback = new Set(["localhost", "127.0.0.1", "::1"]);

/** True when both headers name this computer or a configured extra hostname. */
export function isAllowedHost(
  hostHeader: string | null,
  originHeader: string | null,
  allowed: readonly string[] = [],
): boolean {
  const host = hostnameOf(hostHeader);
  if (!host || !permitted(host, allowed)) return false;
  if (originHeader === null || originHeader === "") return true;
  // Browsers send "null" for opaque origins (sandboxed frames, file pages); nothing local does.
  if (originHeader === "null") return false;
  const origin = originHostname(originHeader);
  return origin !== null && permitted(origin, allowed);
}

function permitted(hostname: string, allowed: readonly string[]): boolean {
  const name = hostname.toLowerCase();
  return loopback.has(name) || allowed.some((a) => a.toLowerCase() === name);
}

/** The hostname of a Host header: port dropped, IPv6 brackets removed, nothing else parsed. */
export function hostnameOf(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  const value = hostHeader.trim();
  if (value === "") return null;
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    return end > 1 ? value.slice(1, end) : null;
  }
  const name = value.split(":")[0]!;
  return name === "" ? null : name;
}

function originHostname(origin: string): string | null {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    // URL keeps IPv6 brackets in `hostname`; strip them so both headers compare alike.
    return url.hostname.replace(/^\[|\]$/g, "");
  } catch {
    return null;
  }
}
