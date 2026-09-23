import { listJobSources } from "@/modules/jobs";
import { deps, requireProfile } from "@/app/current-profile";
import { Column } from "@/components/Column";
import { Briefcase } from "lucide-react";
import { listCompanies } from "@/modules/companies";
import { listSkills } from "@/modules/profile";
import { saveJobAction } from "../actions";
import { JobForm } from "../JobForm";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const profile = await requireProfile();
  const sources = await listJobSources(deps(), profile.id);
  const skills = await listSkills(deps(), profile.id);
  const companies = await listCompanies(deps(), profile.id);
  return (
    <Column
      icon={<Briefcase />}
      title="New job"
      subtitle="Paste a posting. Its application starts as Preparing."
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
