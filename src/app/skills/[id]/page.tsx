import { notFound } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { Card } from "@/components/Card";
import { Page, Section } from "@/components/Page";
import { getSkill } from "@/modules/profile";
import { saveSkillAction } from "../actions";
import { SkillForm } from "../SkillForm";

export const dynamic = "force-dynamic";

export default async function EditSkillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const skill = await getSkill(deps(), profile.id, id);
  if (!skill) notFound();

  return (
    <Page title="Edit skill" subtitle={skill.displayName}>
      <Section>
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
      </Section>
    </Page>
  );
}
