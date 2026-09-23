import { Building2 } from "lucide-react";
import { notFound } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { Column } from "@/components/Column";
import { getJob } from "@/modules/jobs";
import { listCompanies } from "@/modules/companies";
import { JobCompanyForm } from "../../JobCompanyForm";
import { saveJobCompanyAction } from "../../company-actions";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const job = await getJob(deps(), profile.id, id);
  if (!job) notFound();
  const companies = await listCompanies(deps(), profile.id);
  return (
    <Column
      icon={<Building2 />}
      title="Company"
      subtitle={job.companyName}
      parentHref={`/jobs/${id}`}
      parentTitle={job.title}
      width="detail"
    >
      <JobCompanyForm
        action={saveJobCompanyAction.bind(null, id)}
        companies={companies.map((c) => ({ value: c.id, label: c.name }))}
        companyId={job.companyId}
        expectedUpdatedAt={job.updatedAt.toISOString()}
      />
    </Column>
  );
}
