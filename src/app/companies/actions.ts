"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { errorState, formDataToObject, type ActionState } from "@/app/form-state";
import { saveCompany, deleteCompany, saveCompanyFinding } from "@/modules/companies";
import { removeCompanyFinding } from "@/app/jobs/company-context";
export async function saveCompanyAction(
  id: string | undefined,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await saveCompany(deps(), profile.id, formDataToObject(formData), id);
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  if (!id) redirect(`/companies/${result.value.id}`);
  return { status: "saved", recordId: result.value.id };
}
export async function deleteCompanyAction(
  id: string,
  expectedUpdatedAt: string,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await deleteCompany(deps(), profile.id, id, { expectedUpdatedAt });
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  redirect("/companies");
}
export async function saveFindingAction(
  companyId: string,
  id: string | undefined,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await saveCompanyFinding(
    deps(),
    profile.id,
    companyId,
    formDataToObject(formData),
    id,
  );
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  redirect(`/companies/${companyId}`);
}
export async function deleteFindingAction(
  companyId: string,
  id: string,
  expectedUpdatedAt: string,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await removeCompanyFinding(deps(), profile.id, companyId, id, {
    expectedUpdatedAt,
  });
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  redirect(`/companies/${companyId}`);
}
export async function createCompanyInline(id: string, name: string) {
  const profile = await requireProfile();
  const result = await saveCompany(deps(), profile.id, { id, name });
  if (result.ok) revalidatePath("/", "layout");
  return result.ok
    ? { ok: true as const, value: { id: result.value.id, name: result.value.name } }
    : result;
}
