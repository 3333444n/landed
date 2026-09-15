"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { errorState, formDataToObject, type ActionState } from "@/app/form-state";
import { loadConfig } from "@/infrastructure/config";
import { updateApplication } from "@/modules/applications";
import { deleteJob, jobInput, saveJob, type JobsDeps } from "@/modules/jobs";
import { fieldErrorsFromZod } from "@/modules/shared/contracts";
import { resolveLogo } from "./logo";
import { pursueJob } from "./pursue-job";

const list = "/jobs";

function jobDeps(): JobsDeps {
  return { ...deps(), artifactDir: loadConfig().LANDED_ARTIFACT_DIR };
}

/** Bound with the job id on the description column; undefined pastes a new job and opens it. */
export async function saveJobAction(
  existingId: string | undefined,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  // Validate the text first so a refused paste never leaves an orphaned logo file behind.
  const input = formDataToObject(formData);
  const parsed = jobInput.safeParse(input);
  if (!parsed.success) {
    return errorState(previous, formData, {
      kind: "validation",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    });
  }
  const jobId = existingId ?? parsed.data.id ?? crypto.randomUUID();
  const dependencies = jobDeps();
  const logo = await resolveLogo(
    formData,
    parsed.data,
    profile.id,
    jobId,
    dependencies.artifactDir ?? "./artifacts",
  );
  if (!logo.ok) return errorState(previous, formData, logo.error);
  const result = existingId
    ? await saveJob(dependencies, profile.id, input, existingId, logo.value)
    : await pursueJob(dependencies, profile.id, { ...input, id: jobId }, logo.value);
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
  const result = await deleteJob(jobDeps(), profile.id, id);
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  redirect(list);
}
