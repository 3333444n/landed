"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { errorState, formDataToObject, type ActionState } from "@/app/form-state";
import { deleteSkill, saveSkill } from "@/modules/profile";

/** Bound with the record id on edit pages; undefined creates a new skill. */
export async function saveSkillAction(
  existingId: string | undefined,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await saveSkill(deps(), profile.id, formDataToObject(formData), existingId);
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/skills");
  if (existingId) redirect("/skills");
  return { status: "saved", recordId: result.value.id };
}

export async function deleteSkillAction(
  id: string,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await deleteSkill(deps(), profile.id, id);
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/skills");
  return { status: "saved", recordId: id };
}
