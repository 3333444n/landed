import { NextResponse, type NextRequest } from "next/server";
import { deps, requireProfile } from "@/app/current-profile";
import { loadConfig } from "@/infrastructure/config";
import { getJob, logoVersion, readLogo } from "@/modules/jobs";

export const dynamic = "force-dynamic";

/**
 * Serves a job's stored logo. The address carries the file's content hash (`k`), so a stale
 * address answers 404 instead of new bytes and the browser may cache a match forever. The
 * sandbox policy keeps an SVG inert even when opened directly.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const profile = await requireProfile();
  const job = await getJob(deps(), profile.id, id);
  if (!job?.logoStorageKey || !job.logoContentType) return new NextResponse(null, { status: 404 });
  const version = logoVersion(job.logoStorageKey);
  if (!version || request.nextUrl.searchParams.get("k") !== version) {
    return new NextResponse(null, { status: 404 });
  }
  const logo = await readLogo(loadConfig().LANDED_ARTIFACT_DIR, {
    storageKey: job.logoStorageKey,
    contentType: job.logoContentType,
  });
  if (!logo) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(logo.bytes), {
    headers: {
      "Content-Type": logo.contentType,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
