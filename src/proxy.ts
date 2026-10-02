/*
 * Runs before every request, including Server Function POSTs, route handlers and /mcp: refuses
 * requests whose Host or Origin does not name this computer (see src/infrastructure/host-guard.ts
 * for why) and, when LANDED_SESSION_SECRET is set, requests without the per-launch session cookie
 * (src/infrastructure/session-guard.ts). It reads the environment directly and imports only the
 * guards, as Next asks of a proxy, and never touches the response body, because the MCP route
 * streams its answer.
 */
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedHost } from "@/infrastructure/host-guard";
import { hasValidSession } from "@/infrastructure/session-guard";

export function proxy(request: NextRequest) {
  const allowed = (process.env.LANDED_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  if (!isAllowedHost(request.headers.get("host"), request.headers.get("origin"), allowed)) {
    return forbidden("Forbidden: this Landed installation answers only its own address");
  }
  if (!hasValidSession(request.headers.get("cookie"), process.env.LANDED_SESSION_SECRET)) {
    return forbidden("Forbidden: this Landed installation answers only its own window");
  }
  return NextResponse.next();
}

function forbidden(message: string) {
  return new NextResponse(message, {
    status: 403,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
