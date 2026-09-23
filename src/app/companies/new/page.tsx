import { LogoPicker } from "@/components/LogoPicker";
import { Column } from "@/components/Column";
import { CompanyForm, companyFormId } from "../CompanyForm";
import { saveCompanyAction } from "../actions";
export default function Page() {
  return (
    <Column
      title="New company"
      control={<LogoPicker formId={companyFormId} current={null} />}
      parentHref="/companies"
      parentTitle="Companies"
      width="detail"
    >
      <CompanyForm action={saveCompanyAction.bind(null, undefined)} />
    </Column>
  );
}
