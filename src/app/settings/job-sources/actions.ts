"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { errorState, formDataToObject, type ActionState } from "@/app/form-state";
import { createJobSource, updateJobSource } from "@/modules/jobs";
export async function saveSourceAction(
  id: string | undefined,
  previous: ActionState,
  data: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const input = formDataToObject(data);
  const result = id
    ? await updateJobSource(deps(), profile.id, id, {
        ...input,
        archived: input.archived === "true",
      })
    : await createJobSource(deps(), profile.id, input);
  if (!result.ok) return errorState(previous, data, result.error);
  revalidatePath("/", "layout");
  if (!id) redirect(`/settings/job-sources/${result.value.id}`);
  return { status: "saved", recordId: result.value.id };
}
export async function createSourceInline(id: string, name: string) {
  const profile = await requireProfile();
  const result = await createJobSource(deps(), profile.id, { id, name });
  if (!result.ok) return result;
  revalidatePath("/settings/job-sources");
  return {
    ok: true as const,
    value: { id: result.value.id, name: result.value.name, archived: result.value.archived },
  };
}
