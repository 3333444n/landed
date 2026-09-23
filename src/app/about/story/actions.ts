"use server";
import { revalidatePath } from "next/cache";
import { deps, requireProfile } from "@/app/current-profile";
import { errorState, type ActionState } from "@/app/form-state";
import { patchProfile } from "@/modules/profile";
export async function saveAboutMe(previous: ActionState, data: FormData): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await patchProfile(deps(), profile.id, {
    expectedUpdatedAt: data.get("expectedUpdatedAt"),
    aboutMe: String(data.get("aboutMe") ?? "").trim() || null,
  });
  if (!result.ok) return errorState(previous, data, result.error);
  revalidatePath("/about", "layout");
  return { status: "saved", recordId: profile.id };
}
