import { Column } from "@/components/Column";
import { saveJobAction } from "../actions";
import { JobForm } from "../JobForm";

export default function NewJobPage() {
  return (
    <Column
      title="New job"
      subtitle="Paste a posting. Its application starts as Preparing."
      parentHref="/jobs"
      parentTitle="Jobs"
      width="detail"
    >
      <JobForm action={saveJobAction.bind(null, undefined)} submitLabel="Save job" />
    </Column>
  );
}
