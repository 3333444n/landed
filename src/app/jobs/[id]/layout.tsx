import { Building2, FileText } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { deps, requireProfile } from "@/app/current-profile";
import { Card, CardList } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { Column } from "@/components/Column";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { getApplicationForJob } from "@/modules/applications";
import {
  documentSlugs,
  documentTypeLabels,
  documentTypes,
  getDocumentView,
  sweepInterruptedRuns,
} from "@/modules/documents";
import { getJob, jobSummary } from "@/modules/jobs";
import { deleteJobAction, saveApplicationAction } from "../actions";
import { ApplicationStatusForm } from "../ApplicationStatusForm";
import { documentIcons } from "./documents/icons";
import { documentChip, runSummary } from "./documents/summary";

export const dynamic = "force-dynamic";

/**
 * One job with its application: the status form, then its blocks (docs/01). Each document card
 * opens its review column (Phase 1b). The page below renders nothing, so this column sits beside
 * the list; a block route pushes the list off.
 */
export default async function JobLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: ReactNode;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const job = await getJob(deps(), profile.id, id);
  if (!job) notFound();
  const application = await getApplicationForJob(deps(), profile.id, job.id);
  if (application) await sweepInterruptedRuns(deps(), profile.id);
  const views = application
    ? await Promise.all(
        documentTypes.map(async (type) => ({
          type,
          view: await getDocumentView(deps(), profile.id, application.id, type),
        })),
      )
    : [];

  return (
    <>
      <Column
        title={job.title}
        subtitle={job.companyName}
        parentHref="/jobs"
        parentTitle="Jobs"
        width="detail"
      >
        {application ? (
          <ApplicationStatusForm
            action={saveApplicationAction.bind(null, application.id)}
            record={{
              status: application.status,
              notes: application.notes ?? "",
              expectedUpdatedAt: application.updatedAt.toISOString(),
            }}
            submittedAt={
              application.submittedAt
                ? application.submittedAt.toLocaleDateString("en", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : null
            }
          />
        ) : null}
        <CardList label="Materials">
          <li>
            <Card
              href={`/jobs/${job.id}/description`}
              icon={<FileText />}
              title="Job description"
              subtitle={jobSummary(job.rawDescription)}
            />
          </li>
          <li>
            <Card
              href={`/jobs/${job.id}/company`}
              icon={<Building2 />}
              title="Company"
              subtitle={job.companyName}
            />
          </li>
          {views.map(({ type, view }) => {
            const chip = documentChip(view);
            const Icon = documentIcons[type];
            return (
              <li key={type}>
                <Card
                  href={`/jobs/${job.id}/${documentSlugs[type]}`}
                  icon={<Icon />}
                  title={documentTypeLabels[type]}
                  subtitle={runSummary(view)}
                  chips={chip ? <Chip tone={chip.tone}>{chip.label}</Chip> : undefined}
                />
              </li>
            );
          })}
        </CardList>
        <ConfirmDelete action={deleteJobAction.bind(null, job.id)} what="job and its application" />
      </Column>
      {children}
    </>
  );
}
