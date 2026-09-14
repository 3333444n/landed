"use server";

import { revalidatePath } from "next/cache";
import { deps, requireProfile } from "@/app/current-profile";
import { errorState, formDataToObject, type ActionState } from "@/app/form-state";
import { updateProfile } from "@/modules/profile";

/** Saves the single profile in place; the column stays put and shows "Saved". */
export async function updateProfileAction(
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await updateProfile(
    deps(),
    profile.id,
    formDataToObject(formData, ["workArrangement"]),
  );
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  return { status: "saved", recordId: profile.id };
}
