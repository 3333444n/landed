import { Lightbulb } from "lucide-react";
import { notFound } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { Column } from "@/components/Column";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { getSkill, listEmployment, listProjects } from "@/modules/profile";
import { deleteSkillAction, saveSkillAction } from "../actions";
import { SkillForm } from "../SkillForm";

export const dynamic = "force-dynamic";

export default async function EditSkillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const skill = await getSkill(deps(), profile.id, id);
  if (!skill) notFound();
  const [roles, projects] = await Promise.all([
    listEmployment(deps(), profile.id),
    listProjects(deps(), profile.id),
  ]);

  return (
    <Column
      icon={<Lightbulb />}
      title={skill.displayName}
      subtitle={skill.category ?? undefined}
      parentHref="/about/skills"
      parentTitle="Skills"
      width="detail"
    >
      <SkillForm
        key={skill.id}
        roles={roles.map((r) => ({ value: r.id, label: `${r.role} at ${r.employerName}` }))}
        projects={projects.map((p) => ({ value: p.id, label: p.name }))}
        employmentIds={skill.employmentIds}
        projectIds={skill.projectIds}
        action={saveSkillAction.bind(null, skill.id)}
        submitLabel="Save changes"
        record={{
          displayName: skill.displayName,
          category: skill.category ?? "",
          expectedUpdatedAt: skill.updatedAt.toISOString(),
        }}
      />
      <ConfirmDelete action={deleteSkillAction.bind(null, skill.id)} what="skill" />
    </Column>
  );
}
