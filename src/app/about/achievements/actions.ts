"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { errorState, formDataToObject, type ActionState } from "@/app/form-state";
import { createAchievement, deleteAchievement, updateAchievement } from "@/modules/profile";

const list = "/about/achievements";

/** Bound with the record id on the edit column; undefined creates a new achievement and opens it. */
export async function saveAchievementAction(
  existingId: string | undefined,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const input = formDataToObject(formData, ["skillIds"]);
  const result = existingId
    ? await updateAchievement(deps(), profile.id, existingId, input)
    : await createAchievement(deps(), profile.id, input);
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  if (!existingId) redirect(`${list}/${result.value.id}`);
  return { status: "saved", recordId: result.value.id };
}

export async function deleteAchievementAction(
  id: string,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await deleteAchievement(deps(), profile.id, id);
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  redirect(list);
}
