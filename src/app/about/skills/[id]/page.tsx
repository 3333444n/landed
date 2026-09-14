import { notFound } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { Card } from "@/components/Card";
import { Column } from "@/components/Column";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { getSkill } from "@/modules/profile";
import { deleteSkillAction, saveSkillAction } from "../actions";
import { SkillForm } from "../SkillForm";

export const dynamic = "force-dynamic";

export default async function EditSkillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const skill = await getSkill(deps(), profile.id, id);
  if (!skill) notFound();

  return (
    <Column
      title={skill.displayName}
      subtitle={skill.category ?? undefined}
      parentHref="/about/skills"
      parentTitle="Skills"
      width="detail"
    >
      <Card>
        <SkillForm
          action={saveSkillAction.bind(null, skill.id)}
          submitLabel="Save changes"
          record={{
            displayName: skill.displayName,
            category: skill.category ?? "",
            expectedUpdatedAt: skill.updatedAt.toISOString(),
          }}
        />
      </Card>
      <ConfirmDelete action={deleteSkillAction.bind(null, skill.id)} what="skill" />
    </Column>
  );
}
