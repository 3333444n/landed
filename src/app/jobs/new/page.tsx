import { Column } from "@/components/Column";
import { LogoPicker } from "@/components/LogoPicker";
import { saveJobAction } from "../actions";
import { JobForm, jobFormId } from "../JobForm";

export default function NewJobPage() {
  return (
    <Column
      control={<LogoPicker formId={jobFormId} current={null} />}
      title="New job"
      subtitle="Paste a posting. Its application starts as Preparing. The tile adds a logo."
      parentHref="/jobs"
      parentTitle="Jobs"
      width="detail"
    >
      <JobForm action={saveJobAction.bind(null, undefined)} submitLabel="Save job" />
    </Column>
  );
}
