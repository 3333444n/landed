import { Card } from "@/components/Card";
import { Column } from "@/components/Column";
import { saveEmploymentAction } from "../actions";
import { EmploymentForm } from "../EmploymentForm";

export default function NewRolePage() {
  return (
    <Column
      title="New role"
      parentHref="/about/work-history"
      parentTitle="Work history"
      width="detail"
    >
      <Card>
        <EmploymentForm
          action={saveEmploymentAction.bind(null, undefined)}
          submitLabel="Save role"
        />
      </Card>
    </Column>
  );
}
