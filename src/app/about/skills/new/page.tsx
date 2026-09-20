import { deps, requireProfile } from "@/app/current-profile";
import { listEmployment, listProjects } from "@/modules/profile";
import { Plus } from "lucide-react";
import { Column } from "@/components/Column";
import { saveSkillAction } from "../actions";
import { SkillForm } from "../SkillForm";

export default async function NewSkillPage() {
  const profile = await requireProfile();
  const [roles, projects] = await Promise.all([
    listEmployment(deps(), profile.id),
    listProjects(deps(), profile.id),
  ]);
  return (
    <Column
      icon={<Plus />}
      title="New skill"
      parentHref="/about/skills"
      parentTitle="Skills"
      width="detail"
    >
      <SkillForm
        roles={roles.map((r) => ({ value: r.id, label: `${r.role} at ${r.employerName}` }))}
        projects={projects.map((p) => ({ value: p.id, label: p.name }))}
        action={saveSkillAction.bind(null, undefined)}
        submitLabel="Save skill"
      />
    </Column>
  );
}
