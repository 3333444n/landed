/*
 * The per-launch session check (ADR 013). When LANDED_SESSION_SECRET is set (the desktop app sets
 * it and puts the same value in an HttpOnly cookie on its own window), every request must carry
 * that cookie, so other programs and browsers on the computer cannot drive the server. Next 16 runs
 * the proxy on Node.js, so node:crypto is available; hashing both sides first means the compare
 * leaks neither matching characters nor the secret's length.
 */
import { createHash, timingSafeEqual } from "node:crypto";

export const sessionCookieName = "landed_session";

/**
 * True when no secret is configured, or when the Cookie header carries `landed_session` with
 * exactly the secret. The first cookie of that name counts, as browsers send the most specific
 * first. Values are compared raw, so the desktop app mints a hex secret.
 */
export function hasValidSession(cookieHeader: string | null, secret: string | undefined): boolean {
  const expected = secret?.trim();
  if (!expected) return true;
  const presented = cookieValue(cookieHeader, sessionCookieName);
  if (presented === null) return false;
  return timingSafeEqual(digest(presented), digest(expected));
}

/** The value of the first cookie named `name` in a Cookie header; malformed pairs are skipped. */
export function cookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(";")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    if (pair.slice(0, eq).trim() !== name) continue;
    return pair.slice(eq + 1).trim();
  }
  return null;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}
