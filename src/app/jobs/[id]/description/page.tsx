import { listJobSources } from "@/modules/jobs";
import { notFound } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { Column } from "@/components/Column";
import { LogoPicker } from "@/components/LogoPicker";
import { getJob, logoHref } from "@/modules/jobs";
import { listCompanies } from "@/modules/companies";
import { listSkills } from "@/modules/profile";
import { saveJobAction } from "../../actions";
import { JobForm, jobFormId } from "../../JobForm";

export const dynamic = "force-dynamic";

export default async function JobDescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const job = await getJob(deps(), profile.id, id);
  if (!job) notFound();
  const sources = await listJobSources(deps(), profile.id);
  const skills = await listSkills(deps(), profile.id);
  const companies = await listCompanies(deps(), profile.id);

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
        skills={skills}
        sources={sources.map(({ id, name, archived }) => ({ id, name, archived }))}
        companies={companies.map((c) => ({ value: c.id, label: c.name }))}
        record={{
          title: job.title,
          companyName: job.companyName,
          companyId: job.companyId ?? "",
          location: job.location ?? "",
          salary: job.salary ?? "",
          sourceUrl: job.sourceUrl ?? "",
          jobSourceId: job.jobSourceId ?? "",
          rawDescription: job.rawDescription,
          availability: job.availability,
          expectedUpdatedAt: job.updatedAt.toISOString(),
        }}
      />
    </Column>
  );
}
