import { Heart } from "lucide-react";
import { notFound } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { Column } from "@/components/Column";
import { ContextForm } from "@/components/ContextForm";
import { listCompanyFindings } from "@/modules/companies";
import { FindingSelectionForm } from "../../FindingSelectionForm";
import { getJob, getSelectedFindingIds } from "@/modules/jobs";
import { getApplicationForJob } from "@/modules/applications";
import { saveInterest } from "./actions";
export const dynamic = "force-dynamic";
export default async function InterestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const [job, application] = await Promise.all([
    getJob(deps(), profile.id, id),
    getApplicationForJob(deps(), profile.id, id),
  ]);
  if (!job || !application) notFound();
  const findings = job.companyId
    ? await listCompanyFindings(deps(), profile.id, job.companyId)
    : [];
  const selectedIds = await getSelectedFindingIds(deps(), profile.id, id);
  return (
    <Column
      icon={<Heart />}
      title="Interest"
      subtitle="Why this role and company?"
      parentHref={`/jobs/${id}`}
      parentTitle={job.title}
      width="detail"
    >
      <ContextForm
        action={saveInterest.bind(null, id)}
        name="interest"
        label="Why this role and company?"
        value={application.interest}
        version={application.updatedAt.toISOString()}
        placeholder="What caught your attention about this role and company? Which part of the work connects with your experience? What would you like to contribute?"
        helper="A few specific sentences help the cover letter sound like you. This context is shared with the assistant or model writing it. Clear the field and save to remove it."
      />
      <FindingSelectionForm
        key={job.updatedAt.toISOString()}
        jobId={id}
        version={job.updatedAt.toISOString()}
        findings={findings}
        selectedIds={selectedIds}
      />
    </Column>
  );
}
