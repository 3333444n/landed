import { notFound } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { Card } from "@/components/Card";
import { Column } from "@/components/Column";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { getAchievement, listEmployment, listProjects, listSkills } from "@/modules/profile";
import { deleteAchievementAction, saveAchievementAction } from "../actions";
import { AchievementForm } from "../AchievementForm";

export const dynamic = "force-dynamic";

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export default async function EditAchievementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const [achievement, roles, projects, skills] = await Promise.all([
    getAchievement(deps(), profile.id, id),
    listEmployment(deps(), profile.id),
    listProjects(deps(), profile.id),
    listSkills(deps(), profile.id),
  ]);
  if (!achievement) notFound();

  return (
    <Column
      title="Edit achievement"
      subtitle={truncate(achievement.statement, 80)}
      parentHref="/about/achievements"
      parentTitle="Achievements"
      width="detail"
    >
      <Card>
        <AchievementForm
          action={saveAchievementAction.bind(null, achievement.id)}
          submitLabel="Save changes"
          jobs={roles.map((r) => ({ value: r.id, label: `${r.role} at ${r.employerName}` }))}
          projects={projects.map((p) => ({ value: p.id, label: p.name }))}
          skills={skills.map((s) => ({ value: s.id, label: s.displayName }))}
          recordSkillIds={achievement.skillIds}
          record={{
            statement: achievement.statement,
            problem: achievement.problem ?? "",
            action: achievement.action ?? "",
            result: achievement.result ?? "",
            metric: achievement.metric ?? "",
            sourceNote: achievement.sourceNote ?? "",
            sourceUrl: achievement.sourceUrl ?? "",
            employmentId: achievement.employmentId ?? "",
            projectId: achievement.projectId ?? "",
            reviewed: achievement.reviewed ? "on" : "",
            expectedUpdatedAt: achievement.updatedAt.toISOString(),
          }}
        />
      </Card>
      <ConfirmDelete
        action={deleteAchievementAction.bind(null, achievement.id)}
        what="achievement"
      />
    </Column>
  );
}
