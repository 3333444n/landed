/*
 * Runs before every request, including Server Function POSTs and /mcp: refuses requests whose
 * Host or Origin does not name this computer (see src/infrastructure/host-guard.ts for why). It
 * reads the environment directly and imports nothing shared, as Next asks of a proxy, and never
 * touches the response body, because the MCP route streams its answer.
 */
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedHost } from "@/infrastructure/host-guard";

export function proxy(request: NextRequest) {
  const allowed = (process.env.LANDED_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  if (!isAllowedHost(request.headers.get("host"), request.headers.get("origin"), allowed)) {
    return new NextResponse("Forbidden: this Landed installation answers only its own address", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.next();
}
