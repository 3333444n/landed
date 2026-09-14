import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { deps, requireProfile } from "@/app/current-profile";
import { Card, CardList } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { Column } from "@/components/Column";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { getApplicationForJob } from "@/modules/applications";
import { getJob, jobSummary } from "@/modules/jobs";
import { deleteJobAction, saveApplicationAction } from "../actions";
import { ApplicationStatusForm } from "../ApplicationStatusForm";

export const dynamic = "force-dynamic";

/**
 * One job with its application: the status form, then its blocks (docs/01). The Resume, Cover
 * letter and Recruiter message blocks are inert until Phase 1b. The page below renders nothing,
 * so this column sits beside the list; a block route pushes the list off.
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
              title="Job description"
              subtitle={jobSummary(job.rawDescription)}
            />
          </li>
          <li>
            <Card href={`/jobs/${job.id}/company`} title="Company" subtitle={job.companyName} />
          </li>
          {["Resume", "Cover letter", "Recruiter message"].map((title) => (
            <li key={title}>
              <Card
                title={title}
                subtitle="Generated in a later phase"
                chips={<Chip tone="neutral">Not started</Chip>}
              />
            </li>
          ))}
        </CardList>
        <ConfirmDelete action={deleteJobAction.bind(null, job.id)} what="job and its application" />
      </Column>
      {children}
    </>
  );
}
