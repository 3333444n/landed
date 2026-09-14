import { NextResponse } from "next/server";
import { deps } from "@/app/current-profile";
import { loadConfig } from "@/infrastructure/config";
import { getOrRenderPdf } from "@/modules/documents";
import { loadDocument } from "../../documents/load";

export const dynamic = "force-dynamic";

/** Downloads the latest revision as PDF. Rendering never calls a model (docs/01). */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { profile, job, view } = await loadDocument(id, "resume");
  if (!view.revision) return new NextResponse("Nothing generated yet", { status: 404 });
  const result = await getOrRenderPdf(
    deps(),
    profile.id,
    view.revision.id,
    loadConfig().LANDED_ARTIFACT_DIR,
    job.companyName,
  );
  if (!result.ok) return new NextResponse(result.error.kind, { status: 404 });
  return new NextResponse(new Uint8Array(result.value.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.value.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
