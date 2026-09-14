"use server";

import { revalidatePath } from "next/cache";
import { getDatabase } from "@/infrastructure/server";
import { createProfile } from "@/modules/profile";
import { errorState, formDataToObject, type ActionState } from "./form-state";

function deps() {
  return { db: getDatabase().db };
}

export async function createProfileAction(
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = await createProfile(deps(), formDataToObject(formData));
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  return { status: "saved", recordId: result.value.id };
}
