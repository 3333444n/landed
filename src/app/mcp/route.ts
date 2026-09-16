/*
 * POST /mcp (ADR 008): the assistant surface. Before any tool runs, the route checks the bearer
 * token from the environment file; the Host and Origin check already happened in src/proxy.ts.
 * A wrong token answers 401 without a WWW-Authenticate challenge, because the secret is shared
 * out of band and a challenge would send clients looking for an authorization server.
 */
import { deps } from "@/app/current-profile";
import { loadConfig } from "@/infrastructure/config";
import { getAssistantConfig } from "@/infrastructure/server";
import { getCurrentProfile } from "@/modules/profile";
import { bearerMatches } from "./auth";
import { buildMcpHandler } from "./handler";

export const dynamic = "force-dynamic";

export async function GET() {
  return methodNotAllowed();
}

export async function POST(request: Request) {
  const assistant = getAssistantConfig();
  if (assistant.kind === "unconfigured") {
    return Response.json(
      { error: "Set LANDED_MCP_TOKEN in the environment file and restart Landed" },
      { status: 503 },
    );
  }
  if (!bearerMatches(request.headers.get("authorization"), assistant.token)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const dependencies = deps();
  const profile = await getCurrentProfile(dependencies);
  const handler = buildMcpHandler({
    deps: dependencies,
    artifactDir: loadConfig().LANDED_ARTIFACT_DIR,
    profile,
    origin: originOf(request),
    userAgent: request.headers.get("user-agent"),
  });
  return handler.fetch(request);
}

function methodNotAllowed() {
  return Response.json(
    { error: "method not allowed" },
    { status: 405, headers: { Allow: "POST" } },
  );
}

/** The address the client used, so download links point at the same host and port. */
function originOf(request: Request): string {
  const host = request.headers.get("host");
  const url = new URL(request.url);
  return host ? `${url.protocol}//${host}` : url.origin;
}
