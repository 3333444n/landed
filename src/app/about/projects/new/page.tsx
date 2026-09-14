import { deps, requireProfile } from "@/app/current-profile";
import { Column } from "@/components/Column";
import { listEmployment } from "@/modules/profile";
import { saveProjectAction } from "../actions";
import { ProjectForm } from "../ProjectForm";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const profile = await requireProfile();
  const roles = await listEmployment(deps(), profile.id);

  return (
    <Column title="New project" parentHref="/about/projects" parentTitle="Projects" width="detail">
      <ProjectForm
        action={saveProjectAction.bind(null, undefined)}
        submitLabel="Save project"
        jobs={roles.map((role) => ({
          value: role.id,
          label: `${role.role} at ${role.employerName}`,
        }))}
      />
    </Column>
  );
}
