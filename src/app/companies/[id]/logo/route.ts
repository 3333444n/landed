import { NextResponse, type NextRequest } from "next/server";
import { deps, requireProfile } from "@/app/current-profile";
import { loadConfig } from "@/infrastructure/config";
import { getCompany, logoVersion, readLogo } from "@/modules/companies";

export const dynamic = "force-dynamic";

/**
 * Serves a company's stored logo. The address carries the file's content hash (`k`), so a stale
 * address answers 404 instead of new bytes and the browser may cache a match forever. The
 * sandbox policy keeps an SVG inert even when opened directly.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const profile = await requireProfile();
  const company = await getCompany(deps(), profile.id, id);
  if (!company?.logoStorageKey || !company.logoContentType)
    return new NextResponse(null, { status: 404 });
  const version = logoVersion(company.logoStorageKey);
  if (!version || request.nextUrl.searchParams.get("k") !== version) {
    return new NextResponse(null, { status: 404 });
  }
  const logo = await readLogo(loadConfig().LANDED_ARTIFACT_DIR, {
    storageKey: company.logoStorageKey,
    contentType: company.logoContentType,
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
