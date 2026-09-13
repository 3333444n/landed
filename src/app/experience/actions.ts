"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { errorState, formDataToObject, type ActionState } from "@/app/form-state";
import {
  deleteEducation,
  deleteEmployment,
  deleteProject,
  saveEducation,
  saveEmployment,
  saveProject,
} from "@/modules/profile";

// Employment ("Jobs" in the UI)

/** Bound with the record id on edit pages; undefined creates a new job. */
export async function saveEmploymentAction(
  existingId: string | undefined,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await saveEmployment(deps(), profile.id, formDataToObject(formData), existingId);
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/experience");
  if (existingId) redirect("/experience");
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
  revalidatePath("/experience");
  return { status: "saved", recordId: id };
}

// Education

export async function saveEducationAction(
  existingId: string | undefined,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await saveEducation(deps(), profile.id, formDataToObject(formData), existingId);
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/experience");
  if (existingId) redirect("/experience");
  return { status: "saved", recordId: result.value.id };
}

export async function deleteEducationAction(
  id: string,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await deleteEducation(deps(), profile.id, id);
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/experience");
  return { status: "saved", recordId: id };
}

// Projects

export async function saveProjectAction(
  existingId: string | undefined,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await saveProject(deps(), profile.id, formDataToObject(formData), existingId);
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/experience");
  if (existingId) redirect("/experience");
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
  revalidatePath("/experience");
  return { status: "saved", recordId: id };
}
