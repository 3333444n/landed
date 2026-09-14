import { notFound } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { Column, EmptyState } from "@/components/Column";
import { getJob } from "@/modules/jobs";

export const dynamic = "force-dynamic";

/** Company is text on the job until Phase 2 research gives it content of its own (docs/01). */
export default async function JobCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const job = await getJob(deps(), profile.id, id);
  if (!job) notFound();

  return (
    <Column
      title={job.companyName}
      parentHref={`/jobs/${job.id}`}
      parentTitle={job.title}
      width="detail"
    >
      <EmptyState>
        Company research arrives in Phase 2. For now the company is the name on the job.
      </EmptyState>
    </Column>
  );
}
