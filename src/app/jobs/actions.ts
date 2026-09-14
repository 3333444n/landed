"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { errorState, formDataToObject, type ActionState } from "@/app/form-state";
import { updateApplication } from "@/modules/applications";
import { deleteJob, saveJob } from "@/modules/jobs";
import { pursueJob } from "./pursue-job";

const list = "/jobs";

/** Bound with the job id on the description column; undefined pastes a new job and opens it. */
export async function saveJobAction(
  existingId: string | undefined,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const input = formDataToObject(formData);
  const result = existingId
    ? await saveJob(deps(), profile.id, input, existingId)
    : await pursueJob(deps(), profile.id, input);
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  if (!existingId) redirect(`${list}/${result.value.id}`);
  return { status: "saved", recordId: result.value.id };
}

export async function saveApplicationAction(
  applicationId: string,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await updateApplication(
    deps(),
    profile.id,
    applicationId,
    formDataToObject(formData),
  );
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  return { status: "saved", recordId: result.value.id };
}

export async function deleteJobAction(
  id: string,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await deleteJob(deps(), profile.id, id);
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  redirect(list);
}
