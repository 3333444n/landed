"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { errorState, formDataToObject, type ActionState } from "@/app/form-state";
import { deleteEmployment, saveEmployment } from "@/modules/profile";

const list = "/about/work-history";

/**
 * Bound with the record id on the edit column; undefined creates a new role and opens it so the
 * list beside it shows the new card selected. Employment records are "Work history" in the UI.
 */
export async function saveEmploymentAction(
  existingId: string | undefined,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await saveEmployment(deps(), profile.id, formDataToObject(formData), existingId);
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  if (!existingId) redirect(`${list}/${result.value.id}`);
  return { status: "saved", recordId: result.value.id };
}

export async function deleteEmploymentAction(
  id: string,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await deleteEmployment(deps(), profile.id, id);
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  redirect(list);
}
