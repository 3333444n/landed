"use server";
import { revalidatePath } from "next/cache";
import { deps, requireProfile } from "@/app/current-profile";
import { errorState, formDataToObject, type ActionState } from "@/app/form-state";
import { updateJobCompany, setJobFindingSelection } from "@/modules/jobs";
export async function saveJobCompanyAction(
  jobId: string,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await updateJobCompany(deps(), profile.id, jobId, {
    companyId: formData.get("companyId") || null,
    expectedUpdatedAt: formData.get("expectedUpdatedAt"),
  });
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  return { status: "saved", recordId: result.value.id };
}
export async function saveFindingSelectionAction(
  jobId: string,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await setJobFindingSelection(
    deps(),
    profile.id,
    jobId,
    formDataToObject(formData, ["findingIds"]),
  );
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  return { status: "saved", recordId: result.value.id };
}
