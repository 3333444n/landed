"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { errorState, formDataToObject, type ActionState } from "@/app/form-state";
import { companyInput, saveCompany, deleteCompany, saveCompanyFinding } from "@/modules/companies";
import { loadConfig } from "@/infrastructure/config";
import { fieldErrorsFromZod } from "@/modules/shared/contracts";
import { resolveLogo } from "./logo";
import { removeCompanyFinding } from "@/app/jobs/company-context";
export async function saveCompanyAction(
  id: string | undefined,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const input = formDataToObject(formData);
  const parsed = companyInput.safeParse(input);
  if (!parsed.success)
    return errorState(previous, formData, {
      kind: "validation",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    });
  const dependencies = { ...deps(), artifactDir: loadConfig().LANDED_ARTIFACT_DIR };
  const logo = await resolveLogo(
    formData,
    parsed.data,
    profile.id,
    id ?? parsed.data.id,
    dependencies.artifactDir,
  );
  if (!logo.ok) return errorState(previous, formData, logo.error);
  const result = await saveCompany(dependencies, profile.id, input, id, logo.value);
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
  const result = await deleteCompany(
    { ...deps(), artifactDir: loadConfig().LANDED_ARTIFACT_DIR },
    profile.id,
    id,
    { expectedUpdatedAt },
  );
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
