import { Card } from "@/components/Card";
import { Column } from "@/components/Column";
import { saveSkillAction } from "../actions";
import { SkillForm } from "../SkillForm";

export default function NewSkillPage() {
  return (
    <Column title="New skill" parentHref="/about/skills" parentTitle="Skills" width="detail">
      <Card>
        <SkillForm action={saveSkillAction.bind(null, undefined)} submitLabel="Save skill" />
      </Card>
    </Column>
  );
}
