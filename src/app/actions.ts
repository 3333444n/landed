"use server";

import { revalidatePath } from "next/cache";
import { getDatabase } from "@/infrastructure/server";
import {
  createAchievement,
  createProfile,
  getCurrentProfile,
  type FieldErrors,
  type ProfileError,
} from "@/modules/profile";

/** Submitted string values, echoed back on error so the form keeps what was typed. */
export type FormValues = Record<string, string>;

export type ActionState =
  | { status: "idle" }
  | { status: "saved"; recordId: string }
  | { status: "error"; attempt: number; fieldErrors: FieldErrors; values: FormValues };

function deps() {
  return { db: getDatabase().db };
}

/** Translates a FormData submission into a plain object; repeated keys become arrays. */
function formDataToObject(formData: FormData, arrayKeys: string[] = []): Record<string, unknown> {
  const object: Record<string, unknown> = {};
  for (const key of arrayKeys) object[key] = formData.getAll(key).filter((v) => v !== "");
  for (const [key, value] of formData.entries()) {
    if (arrayKeys.includes(key) || typeof value !== "string") continue;
    object[key] = value;
  }
  return object;
}

function stringValues(formData: FormData): FormValues {
  const values: FormValues = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

function errorState(previous: ActionState, formData: FormData, error: ProfileError): ActionState {
  const attempt = previous.status === "error" ? previous.attempt + 1 : 1;
  const fieldErrors = error.kind === "validation" ? error.fieldErrors : { form: [error.message] };
  return { status: "error", attempt, fieldErrors, values: stringValues(formData) };
}

export async function createProfileAction(
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = await createProfile(deps(), formDataToObject(formData));
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/");
  return { status: "saved", recordId: result.value.id };
}

export async function createAchievementAction(
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await getCurrentProfile(deps());
  if (!profile) {
    return errorState(previous, formData, {
      kind: "not_found",
      message: "Create your profile first",
    });
  }
  const result = await createAchievement(
    deps(),
    profile.id,
    formDataToObject(formData, ["skillIds"]),
  );
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/");
  return { status: "saved", recordId: result.value.id };
}
