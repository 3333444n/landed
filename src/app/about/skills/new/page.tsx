import { Plus } from "lucide-react";
import { Column } from "@/components/Column";
import { saveSkillAction } from "../actions";
import { SkillForm } from "../SkillForm";

export default function NewSkillPage() {
  return (
    <Column
      icon={<Plus />}
      title="New skill"
      parentHref="/about/skills"
      parentTitle="Skills"
      width="detail"
    >
      <SkillForm action={saveSkillAction.bind(null, undefined)} submitLabel="Save skill" />
    </Column>
  );
}
