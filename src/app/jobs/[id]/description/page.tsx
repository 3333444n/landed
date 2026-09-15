import { FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { Column } from "@/components/Column";
import { getJob } from "@/modules/jobs";
import { saveJobAction } from "../../actions";
import { JobForm } from "../../JobForm";

export const dynamic = "force-dynamic";

export default async function JobDescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const job = await getJob(deps(), profile.id, id);
  if (!job) notFound();

  return (
    <Column
      icon={<FileText />}
      title="Job description"
      subtitle="The posting as you pasted it."
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
