import { deps, requireProfile } from "@/app/current-profile";
import { Column } from "@/components/Column";
import { LogoPicker } from "@/components/LogoPicker";
import { listSkills } from "@/modules/profile";
import { saveJobAction } from "../actions";
import { JobForm, jobFormId } from "../JobForm";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const profile = await requireProfile();
  const skills = await listSkills(deps(), profile.id);
  return (
    <Column
      control={<LogoPicker formId={jobFormId} current={null} />}
      title="New job"
      subtitle="Paste a posting. Its application starts as Preparing. The tile adds a logo."
      parentHref="/jobs"
      parentTitle="Jobs"
      width="detail"
    >
      <JobForm
        action={saveJobAction.bind(null, undefined)}
        submitLabel="Save job"
        skills={skills}
      />
    </Column>
  );
}
