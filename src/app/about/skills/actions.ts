"use server";

import { careerRedirect } from "../filter-query";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { errorState, formDataToObject, type ActionState } from "@/app/form-state";
import { deleteSkill, saveSkill } from "@/modules/profile";

const list = "/about/skills";

/** Bound with the record id on the edit column; undefined creates a new skill and opens it. */
export async function saveSkillAction(
  existingId: string | undefined,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await saveSkill(
    deps(),
    profile.id,
    formDataToObject(formData, ["employmentIds", "projectIds"]),
    existingId,
  );
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  if (!existingId) redirect(careerRedirect(`${list}/${result.value.id}`, formData));
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
  revalidatePath("/", "layout");
  redirect(careerRedirect(list, formData));
}
