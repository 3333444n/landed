import { Plus } from "lucide-react";
import { Column } from "@/components/Column";
import { saveEducationAction } from "../actions";
import { EducationForm } from "../EducationForm";

export default function NewEducationPage() {
  return (
    <Column
      icon={<Plus />}
      title="New education"
      parentHref="/about/education"
      parentTitle="Education"
      width="detail"
    >
      <EducationForm
        action={saveEducationAction.bind(null, undefined)}
        submitLabel="Save education"
      />
    </Column>
  );
}
