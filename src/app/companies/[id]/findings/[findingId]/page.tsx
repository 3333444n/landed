import { FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { getCompanyFinding } from "@/modules/companies";
import { Column } from "@/components/Column";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { CompanyForm } from "../../../CompanyForm";
import { saveFindingAction, deleteFindingAction } from "../../../actions";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string; findingId: string }>;
}) {
  const { id, findingId } = await params;
  const profile = await requireProfile();
  const f = await getCompanyFinding(deps(), profile.id, id, findingId);
  if (!f) notFound();
  return (
    <Column
      title="Finding"
      icon={<FileText />}
      parentHref={`/companies/${id}`}
      parentTitle="Company"
      width="detail"
    >
      <CompanyForm
        finding
        action={saveFindingAction.bind(null, id, f.id)}
        record={{
          id: f.id,
          text: f.text,
          sourceUrl: f.sourceUrl,
          retrievedAt: f.retrievedAt,
          kind: f.kind,
          expectedUpdatedAt: f.updatedAt.toISOString(),
        }}
      />
      <ConfirmDelete
        action={deleteFindingAction.bind(null, id, f.id, f.updatedAt.toISOString())}
        what="finding"
      />
    </Column>
  );
}
