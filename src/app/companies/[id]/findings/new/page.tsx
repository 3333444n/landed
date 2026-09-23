import { Plus } from "lucide-react";
import { Column } from "@/components/Column";
import { CompanyForm } from "../../../CompanyForm";
import { saveFindingAction } from "../../../actions";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Column
      title="New finding"
      icon={<Plus />}
      parentHref={`/companies/${id}`}
      parentTitle="Company"
      width="detail"
    >
      <CompanyForm finding action={saveFindingAction.bind(null, id, undefined)} />
    </Column>
  );
}
