import { Plus } from "lucide-react";
import { Column } from "@/components/Column";
import { CompanyForm } from "../CompanyForm";
import { saveCompanyAction } from "../actions";
export default function Page() {
  return (
    <Column
      title="New company"
      icon={<Plus />}
      parentHref="/companies"
      parentTitle="Companies"
      width="detail"
    >
      <CompanyForm action={saveCompanyAction.bind(null, undefined)} />
    </Column>
  );
}
