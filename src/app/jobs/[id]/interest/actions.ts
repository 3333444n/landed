"use server";
import { revalidatePath } from "next/cache";
import { deps, requireProfile } from "@/app/current-profile";
import { errorState, type ActionState } from "@/app/form-state";
import { getApplicationForJob, updateInterest } from "@/modules/applications";
export async function saveInterest(
  jobId: string,
  previous: ActionState,
  data: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const application = await getApplicationForJob(deps(), profile.id, jobId);
  if (!application)
    return errorState(previous, data, { kind: "not_found", message: "Application not found" });
  const result = await updateInterest(deps(), profile.id, application.id, {
    expectedUpdatedAt: data.get("expectedUpdatedAt"),
    interest: String(data.get("interest") ?? "").trim() || null,
  });
  if (!result.ok) return errorState(previous, data, result.error);
  revalidatePath(`/jobs/${jobId}`, "layout");
  return { status: "saved", recordId: application.id };
}
