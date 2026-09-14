"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { errorState, formDataToObject, type ActionState } from "@/app/form-state";
import { deleteProject, saveProject } from "@/modules/profile";

const list = "/about/projects";

/** Bound with the record id on the edit column; undefined creates a new project and opens it. */
export async function saveProjectAction(
  existingId: string | undefined,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await saveProject(deps(), profile.id, formDataToObject(formData), existingId);
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  if (!existingId) redirect(`${list}/${result.value.id}`);
  return { status: "saved", recordId: result.value.id };
}

export async function deleteProjectAction(
  id: string,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await deleteProject(deps(), profile.id, id);
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  redirect(list);
}
