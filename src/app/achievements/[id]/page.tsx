import { notFound } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { Card } from "@/components/Card";
import { Page, Section } from "@/components/Page";
import { getAchievement, listEmployment, listProjects, listSkills } from "@/modules/profile";
import { saveAchievementAction } from "../actions";
import { AchievementForm } from "../AchievementForm";

export const dynamic = "force-dynamic";

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export default async function EditAchievementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const [achievement, employment, projects, skills] = await Promise.all([
    getAchievement(deps(), profile.id, id),
    listEmployment(deps(), profile.id),
    listProjects(deps(), profile.id),
    listSkills(deps(), profile.id),
  ]);
  if (!achievement) notFound();

  return (
    <Page title="Edit achievement" subtitle={truncate(achievement.statement, 80)}>
      <Section>
        <Card>
          <AchievementForm
            action={saveAchievementAction.bind(null, achievement.id)}
            submitLabel="Save changes"
            jobs={employment.map((j) => ({ value: j.id, label: `${j.role} at ${j.employerName}` }))}
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
      </Section>
    </Page>
  );
}
