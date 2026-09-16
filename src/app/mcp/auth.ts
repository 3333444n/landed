/*
 * The bearer check for /mcp. The token is a shared secret from the environment file (ADR 008),
 * compared in constant time so response timing never leaks how many leading characters matched.
 */
import { timingSafeEqual } from "node:crypto";

/** True when the Authorization header carries exactly the configured token. */
export function bearerMatches(header: string | null, token: string): boolean {
  if (!header) return false;
  const match = /^Bearer\s+(.+?)\s*$/i.exec(header);
  if (!match) return false;
  const presented = Buffer.from(match[1]!, "utf8");
  const expected = Buffer.from(token, "utf8");
  if (presented.byteLength !== expected.byteLength) return false;
  return timingSafeEqual(presented, expected);
}
