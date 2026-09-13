import { redirect } from "next/navigation";
import { getDatabase } from "@/infrastructure/server";
import { getCurrentProfile, type ProfileDeps, type ProfileRecord } from "@/modules/profile";

export function deps(): ProfileDeps {
  return { db: getDatabase().db };
}

/** Pages other than the home page need a profile; a blank installation goes to the name form. */
export async function requireProfile(): Promise<ProfileRecord> {
  const profile = await getCurrentProfile(deps());
  if (!profile) redirect("/");
  return profile;
}
