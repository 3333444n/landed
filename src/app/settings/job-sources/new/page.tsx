import { Tags } from "lucide-react";
import { Column } from "@/components/Column";
import { SourceForm } from "../SourceForm";
export default function Page() {
  return (
    <Column
      icon={<Tags />}
      title="New source"
      parentHref="/settings/job-sources"
      parentTitle="Job Sources"
      width="detail"
    >
      <SourceForm />
    </Column>
  );
}
