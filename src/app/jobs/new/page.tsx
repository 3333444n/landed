import { listJobSources } from "@/modules/jobs";
import { deps, requireProfile } from "@/app/current-profile";
import { Column } from "@/components/Column";
import { LogoPicker } from "@/components/LogoPicker";
import { listCompanies } from "@/modules/companies";
import { listSkills } from "@/modules/profile";
import { saveJobAction } from "../actions";
import { JobForm, jobFormId } from "../JobForm";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const profile = await requireProfile();
  const sources = await listJobSources(deps(), profile.id);
  const skills = await listSkills(deps(), profile.id);
  const companies = await listCompanies(deps(), profile.id);
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
        sources={sources.map(({ id, name, archived }) => ({ id, name, archived }))}
        companies={companies.map((c) => ({ value: c.id, label: c.name }))}
      />
    </Column>
  );
}
