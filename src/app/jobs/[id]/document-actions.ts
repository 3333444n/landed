"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { errorState, formDataToObject, type ActionState } from "@/app/form-state";
import { getModelAdapter } from "@/infrastructure/server";
import {
  documentSlugs,
  editUnit,
  markReviewed,
  submitPastedAnswer,
  type DocumentType,
} from "@/modules/documents";
import { generateDocument } from "../generate-document";

/** Bound with the job id and document type on the review column. */
export async function generateDocumentAction(
  jobId: string,
  type: DocumentType,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const adapter = getModelAdapter();
  if (!adapter) {
    return errorState(previous, formData, {
      kind: "conflict",
      message: "No model is configured. Set one up in Settings or use Paste back.",
    });
  }
  const result = await generateDocument(deps(), adapter, profile.id, jobId, type);
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  return { status: "saved", recordId: result.value.id };
}

/** Bound with the job id and document type on the paste-back column. */
export async function pasteBackAction(
  jobId: string,
  type: DocumentType,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await submitPastedAnswer(deps(), profile.id, formDataToObject(formData));
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  redirect(`/jobs/${jobId}/${documentSlugs[type]}`);
}

export async function editUnitAction(
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await editUnit(deps(), profile.id, formDataToObject(formData));
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  return { status: "saved", recordId: result.value.id };
}

/** Bound with the revision id and the target state on the review column. */
export async function markReviewedAction(
  revisionId: string,
  reviewed: boolean,
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await markReviewed(deps(), profile.id, revisionId, reviewed);
  if (!result.ok) return errorState(previous, formData, result.error);
  revalidatePath("/", "layout");
  return { status: "saved", recordId: result.value.id };
}
