import { getJob } from "@/app/jobs/company-job";
import { listJobSources } from "@/modules/jobs";
import { notFound } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { Column } from "@/components/Column";
import { Briefcase } from "lucide-react";
import { LogoImage } from "../../LogoImage";
import { listCompanies } from "@/modules/companies";
import { listSkills } from "@/modules/profile";
import { saveJobAction } from "../../actions";
import { JobForm } from "../../JobForm";

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
      icon={job.logoHref ? <LogoImage src={job.logoHref} /> : <Briefcase />}
      title="Job description"
      subtitle="The posting as you pasted it. Manage its logo in Companies."
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
