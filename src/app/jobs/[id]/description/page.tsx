import { notFound } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { Column } from "@/components/Column";
import { LogoPicker } from "@/components/LogoPicker";
import { getJob, logoHref } from "@/modules/jobs";
import { saveJobAction } from "../../actions";
import { JobForm, jobFormId } from "../../JobForm";

export const dynamic = "force-dynamic";

export default async function JobDescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const job = await getJob(deps(), profile.id, id);
  if (!job) notFound();

  return (
    <Column
      control={<LogoPicker formId={jobFormId} current={logoHref(job)} />}
      title="Job description"
      subtitle="The posting as you pasted it. The tile changes the logo."
      parentHref={`/jobs/${job.id}`}
      parentTitle={job.title}
      width="detail"
    >
      <JobForm
        action={saveJobAction.bind(null, job.id)}
        submitLabel="Save changes"
        record={{
          title: job.title,
          companyName: job.companyName,
          location: job.location ?? "",
          salary: job.salary ?? "",
          sourceUrl: job.sourceUrl ?? "",
          rawDescription: job.rawDescription,
          availability: job.availability,
          expectedUpdatedAt: job.updatedAt.toISOString(),
        }}
      />
    </Column>
  );
}
