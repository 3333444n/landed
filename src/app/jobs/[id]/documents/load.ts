/*
 * Shared loading for the document columns: the profile, the job, its application and the
 * document view for one type. Calls notFound() when any of them is missing.
 */
import { notFound } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { getApplicationForJob } from "@/modules/applications";
import {
  documentSlugs,
  documentTypeLabels,
  getDocumentView,
  sweepInterruptedRuns,
  type DocumentType,
} from "@/modules/documents";
import { getJob } from "@/modules/jobs";

export async function loadDocument(jobId: string, type: DocumentType) {
  const profile = await requireProfile();
  const job = await getJob(deps(), profile.id, jobId);
  if (!job) notFound();
  const application = await getApplicationForJob(deps(), profile.id, job.id);
  if (!application) notFound();
  await sweepInterruptedRuns(deps(), profile.id);
  const view = await getDocumentView(deps(), profile.id, application.id, type);
  return {
    profile,
    job,
    application,
    view,
    href: `/jobs/${job.id}/${documentSlugs[type]}`,
    label: documentTypeLabels[type],
  };
}
