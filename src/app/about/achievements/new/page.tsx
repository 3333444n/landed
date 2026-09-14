import { deps, requireProfile } from "@/app/current-profile";
import { Card } from "@/components/Card";
import { Column } from "@/components/Column";
import { listEmployment, listProjects, listSkills } from "@/modules/profile";
import { saveAchievementAction } from "../actions";
import { AchievementForm } from "../AchievementForm";

export const dynamic = "force-dynamic";

export default async function NewAchievementPage() {
  const profile = await requireProfile();
  const [roles, projects, skills] = await Promise.all([
    listEmployment(deps(), profile.id),
    listProjects(deps(), profile.id),
    listSkills(deps(), profile.id),
  ]);

  return (
    <Column
      title="New achievement"
      parentHref="/about/achievements"
      parentTitle="Achievements"
      width="detail"
    >
      <Card>
        <AchievementForm
          action={saveAchievementAction.bind(null, undefined)}
          submitLabel="Save achievement"
          jobs={roles.map((r) => ({ value: r.id, label: `${r.role} at ${r.employerName}` }))}
          projects={projects.map((p) => ({ value: p.id, label: p.name }))}
          skills={skills.map((s) => ({ value: s.id, label: s.displayName }))}
        />
      </Card>
    </Column>
  );
}
